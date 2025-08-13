import streamlit as st
import psycopg2
import bcrypt
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, date, timedelta
import os

# Configuração da página
st.set_page_config(
    page_title="Sistema de Gestão de Peso - Pesqueira",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Conexão com o banco de dados
@st.cache_resource
def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        st.error("DATABASE_URL não configurada. Verifique as variáveis de ambiente.")
        st.stop()
    try:
        return psycopg2.connect(database_url)
    except Exception as e:
        st.error(f"Erro ao conectar com o banco: {str(e)}")
        st.stop()

# Inicializar tabelas
def init_database():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Criar tabela users
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                cpf VARCHAR(11) UNIQUE NOT NULL,
                password VARCHAR(255),
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255),
                profile_image_url TEXT,
                is_admin BOOLEAN DEFAULT FALSE,
                work_type VARCHAR(50) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Criar tabela weight_records
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS weight_records (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                weight DECIMAL(10,2) NOT NULL,
                work_type VARCHAR(50) NOT NULL,
                notes TEXT,
                record_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        st.error(f"Erro ao inicializar banco: {str(e)}")

# Funções de autenticação
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def get_user_by_cpf(cpf):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, cpf, password, first_name, last_name, email, 
                   profile_image_url, is_admin, work_type, is_active
            FROM users WHERE cpf = %s AND is_active = true
        """, (cpf,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result:
            return {
                'id': result[0], 'cpf': result[1], 'password': result[2],
                'first_name': result[3], 'last_name': result[4], 'email': result[5],
                'profile_image_url': result[6], 'is_admin': result[7],
                'work_type': result[8], 'is_active': result[9]
            }
        return None
    except Exception as e:
        st.error(f"Erro ao buscar usuário: {str(e)}")
        return None

def create_user(cpf, password, first_name, last_name, email, is_admin, work_type):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        hashed_password = hash_password(password) if password else ""
        cursor.execute("""
            INSERT INTO users (cpf, password, first_name, last_name, email, is_admin, work_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
        """, (cpf, hashed_password, first_name, last_name, email, is_admin, work_type))
        user_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()
        return user_id
    except Exception as e:
        st.error(f"Erro ao criar usuário: {str(e)}")
        return None

def create_weight_record(user_id, weight, work_type, notes, record_date):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO weight_records (user_id, weight, work_type, notes, record_date)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (user_id, weight, work_type, notes, record_date))
        record_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()
        return record_id
    except Exception as e:
        st.error(f"Erro ao criar registro: {str(e)}")
        return None

def get_user_stats(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Peso de hoje
        cursor.execute("""
            SELECT COALESCE(SUM(weight), 0) FROM weight_records 
            WHERE user_id = %s AND record_date = CURRENT_DATE
        """, (user_id,))
        today_weight = cursor.fetchone()[0]

        # Peso do mês
        cursor.execute("""
            SELECT COALESCE(SUM(weight), 0) FROM weight_records 
            WHERE user_id = %s AND DATE_TRUNC('month', record_date) = DATE_TRUNC('month', CURRENT_DATE)
        """, (user_id,))
        monthly_weight = cursor.fetchone()[0]

        # Média semanal
        cursor.execute("""
            SELECT COALESCE(AVG(weight), 0) FROM weight_records 
            WHERE user_id = %s AND record_date >= CURRENT_DATE - INTERVAL '7 days'
        """, (user_id,))
        weekly_average = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return {
            'today_weight': float(today_weight),
            'monthly_weight': float(monthly_weight),
            'weekly_average': float(weekly_average)
        }
    except Exception as e:
        st.error(f"Erro ao obter estatísticas: {str(e)}")
        return {'today_weight': 0, 'monthly_weight': 0, 'weekly_average': 0}

def get_weight_records(user_id=None, start_date=None, end_date=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT wr.id, wr.weight, wr.work_type, wr.notes, wr.record_date,
                   u.first_name, u.last_name, u.cpf
            FROM weight_records wr
            JOIN users u ON wr.user_id = u.id WHERE 1=1
        """
        params = []

        if user_id:
            query += " AND wr.user_id = %s"
            params.append(user_id)
        if start_date:
            query += " AND wr.record_date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND wr.record_date <= %s"
            params.append(end_date)

        query += " ORDER BY wr.record_date DESC, wr.id DESC"
        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return results
    except Exception as e:
        st.error(f"Erro ao obter registros: {str(e)}")
        return []

def get_all_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, cpf, first_name, last_name, email, is_admin, work_type, is_active
            FROM users ORDER BY first_name, last_name
        """)
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        return results
    except Exception as e:
        st.error(f"Erro ao obter usuários: {str(e)}")
        return []

def get_daily_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Usuários ativos hoje
        cursor.execute("""
            SELECT COUNT(DISTINCT user_id) FROM weight_records 
            WHERE record_date = CURRENT_DATE
        """)
        active_users = cursor.fetchone()[0]

        # Peso total hoje
        cursor.execute("""
            SELECT COALESCE(SUM(weight), 0) FROM weight_records 
            WHERE record_date = CURRENT_DATE
        """)
        today_weight = cursor.fetchone()[0]

        # Peso total do mês
        cursor.execute("""
            SELECT COALESCE(SUM(weight), 0) FROM weight_records 
            WHERE DATE_TRUNC('month', record_date) = DATE_TRUNC('month', CURRENT_DATE)
        """)
        monthly_weight = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return {
            'active_users': active_users,
            'today_weight': float(today_weight),
            'monthly_weight': float(monthly_weight)
        }
    except Exception as e:
        st.error(f"Erro ao obter estatísticas diárias: {str(e)}")
        return {'active_users': 0, 'today_weight': 0, 'monthly_weight': 0}

def main():
    # CSS customizado
    st.markdown("""
    <style>
    .main-header {
        background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%);
        padding: 1rem; border-radius: 8px; color: white;
        text-align: center; margin-bottom: 2rem;
    }
    .stats-card {
        background: white; padding: 1.5rem; border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border-left: 4px solid #3b82f6;
    }
    .sidebar-header {
        background: #f8fafc; padding: 1rem;
        border-radius: 8px; margin-bottom: 1rem;
    }
    </style>
    """, unsafe_allow_html=True)

    # Inicializar banco de dados
    init_database()

    # Header
    st.markdown("""
    <div class="main-header">
        <h1>⚖️ Sistema de Gestão de Peso - Pesqueira</h1>
        <p>Controle de produção e gestão de peso para funcionários</p>
    </div>
    """, unsafe_allow_html=True)

    # Verificar DATABASE_URL
    if not os.getenv("DATABASE_URL"):
        st.error("❌ DATABASE_URL não configurada!")
        st.info("Configure a variável DATABASE_URL no painel de Secrets do Replit.")
        st.stop()

    # Session state
    if 'user' not in st.session_state:
        st.session_state.user = None
    if 'login_type' not in st.session_state:
        st.session_state.login_type = None

    # Sidebar de login
    with st.sidebar:
        st.markdown('<div class="sidebar-header"><h2>🔐 Acesso</h2></div>', unsafe_allow_html=True)

        if st.session_state.user is None:
            login_type = st.radio("Tipo:", ["Funcionário", "Administrador"])

            with st.form("login_form"):
                cpf = st.text_input("CPF:", max_chars=11)
                if login_type == "Administrador":
                    password = st.text_input("Senha:", type="password")

                if st.form_submit_button("Entrar"):
                    if len(cpf) != 11 or not cpf.isdigit():
                        st.error("CPF deve ter 11 dígitos!")
                    else:
                        user = get_user_by_cpf(cpf)
                        if user:
                            if login_type == "Administrador":
                                if user['is_admin'] and password:
                                    if verify_password(password, user['password']):
                                        st.session_state.user = user
                                        st.session_state.login_type = "admin"
                                        st.rerun()
                                    else:
                                        st.error("Senha incorreta!")
                                else:
                                    st.error("Usuário não é admin!")
                            else:
                                if not user['is_admin']:
                                    st.session_state.user = user
                                    st.session_state.login_type = "user"
                                    st.rerun()
                                else:
                                    st.error("Admin deve usar login de admin!")
                        else:
                            st.error("CPF não encontrado!")
        else:
            user = st.session_state.user
            st.markdown(f"""
            <div class="sidebar-header">
                <h3>👤 {user['first_name']} {user['last_name']}</h3>
                <p><strong>CPF:</strong> {user['cpf']}</p>
                <p><strong>Tipo:</strong> {user['work_type']}</p>
                <p><strong>Perfil:</strong> {'Admin' if user['is_admin'] else 'Funcionário'}</p>
            </div>
            """, unsafe_allow_html=True)

            if st.button("🚪 Logout"):
                st.session_state.user = None
                st.session_state.login_type = None
                st.rerun()

    # Conteúdo principal
    if st.session_state.user:
        user = st.session_state.user
        if st.session_state.login_type == "admin":
            show_admin_dashboard()
        else:
            show_user_dashboard(user)
    else:
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            st.markdown("""
            ### 📋 Sobre o Sistema
            **👤 Funcionários:** Registrar peso, ver estatísticas
            **👑 Admins:** Gerenciar usuários, relatórios completos
            **🔒 Faça login na sidebar!**
            """)

def show_user_dashboard(user):
    st.markdown("## 📊 Dashboard do Funcionário")

    stats = get_user_stats(user['id'])
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("🎯 Peso Hoje", f"{stats['today_weight']:.1f} kg")
    with col2:
        st.metric("📅 Peso do Mês", f"{stats['monthly_weight']:.1f} kg")
    with col3:
        st.metric("📊 Média Semanal", f"{stats['weekly_average']:.1f} kg")

    st.divider()

    # Formulário
    st.markdown("### ➕ Novo Registro")
    with st.form("weight_form"):
        col1, col2 = st.columns(2)
        with col1:
            weight = st.number_input("Peso (kg):", min_value=0.1, step=0.1)
            work_type = st.selectbox("Tipo:", ["Filetagem", "Espinhos"])
        with col2:
            record_date = st.date_input("Data:", value=date.today())
            notes = st.text_area("Observações:")

        if st.form_submit_button("💾 Salvar"):
            if weight > 0:
                if create_weight_record(user['id'], weight, work_type, notes, record_date):
                    st.success("✅ Salvo!")
                    st.rerun()
            else:
                st.error("Peso deve ser > 0!")

    st.divider()

    # Histórico
    st.markdown("### 📋 Meus Registros")
    records = get_weight_records(user_id=user['id'])

    if records:
        df = pd.DataFrame(records, columns=[
            'ID', 'Peso', 'Tipo', 'Obs', 'Data', 'Nome', 'Sobrenome', 'CPF'
        ])

        # Gráfico
        df_chart = df.copy()
        df_chart['Data'] = pd.to_datetime(df_chart['Data'])
        df_chart = df_chart.sort_values('Data')

        fig = px.line(df_chart, x='Data', y='Peso', title='Evolução do Peso', markers=True)
        st.plotly_chart(fig, use_container_width=True)

        # Tabela
        display_df = df[['Data', 'Peso', 'Tipo', 'Obs']].copy()
        display_df['Data'] = pd.to_datetime(display_df['Data']).dt.strftime('%d/%m/%Y')
        st.dataframe(display_df, use_container_width=True)
    else:
        st.info("Nenhum registro encontrado!")

def show_admin_dashboard():
    st.markdown("## 👑 Dashboard Admin")

    stats = get_daily_stats()
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("👥 Ativos Hoje", stats['active_users'])
    with col2:
        st.metric("⚖️ Peso Hoje", f"{stats['today_weight']:.1f} kg")
    with col3:
        st.metric("📅 Peso Mês", f"{stats['monthly_weight']:.1f} kg")
    with col4:
        st.metric("👤 Total Users", len(get_all_users()))

    tab1, tab2, tab3, tab4 = st.tabs(["📊 Registros", "👥 Usuários", "➕ Novo User", "📈 Relatórios"])

    with tab1:
        st.markdown("### 📋 Todos os Registros")

        col1, col2, col3 = st.columns(3)
        with col1:
            users = get_all_users()
            user_options = {f"{u[2]} {u[3]} ({u[1]})": u[0] for u in users}
            user_options["Todos"] = None
            selected_user = st.selectbox("Usuário:", list(user_options.keys()))
            user_id_filter = user_options[selected_user]

        with col2:
            start_date = st.date_input("De:", value=date.today() - timedelta(days=30))
        with col3:
            end_date = st.date_input("Até:", value=date.today())

        records = get_weight_records(user_id_filter, start_date, end_date)

        if records:
            df = pd.DataFrame(records, columns=[
                'ID', 'Peso', 'Tipo', 'Obs', 'Data', 'Nome', 'Sobrenome', 'CPF'
            ])
            df['Data'] = pd.to_datetime(df['Data']).dt.strftime('%d/%m/%Y')
            df['Funcionário'] = df['Nome'] + ' ' + df['Sobrenome']

            display_df = df[['Data', 'Funcionário', 'CPF', 'Peso', 'Tipo', 'Obs']]
            st.dataframe(display_df, use_container_width=True)

            csv = display_df.to_csv(index=False)
            st.download_button("📥 CSV", csv, f"registros_{start_date}_{end_date}.csv", "text/csv")
        else:
            st.info("Nenhum registro!")

    with tab2:
        st.markdown("### 👥 Usuários")
        users = get_all_users()
        if users:
            df_users = pd.DataFrame(users, columns=[
                'ID', 'CPF', 'Nome', 'Sobrenome', 'Email', 'Admin', 'Tipo', 'Ativo'
            ])
            df_users['Perfil'] = df_users['Admin'].apply(lambda x: 'Admin' if x else 'User')
            df_users['Status'] = df_users['Ativo'].apply(lambda x: 'Ativo' if x else 'Inativo')

            display_df = df_users[['CPF', 'Nome', 'Sobrenome', 'Email', 'Perfil', 'Tipo', 'Status']]
            st.dataframe(display_df, use_container_width=True)

    with tab3:
        st.markdown("### ➕ Criar Usuário")
        with st.form("create_user_form"):
            col1, col2 = st.columns(2)
            with col1:
                cpf = st.text_input("CPF:", max_chars=11)
                first_name = st.text_input("Nome:")
                last_name = st.text_input("Sobrenome:")
            with col2:
                email = st.text_input("Email:")
                work_type = st.selectbox("Tipo:", ["Filetagem", "Espinhos"])
                is_admin = st.checkbox("É Admin?")

            password = st.text_input("Senha (obrig. p/ admin):", type="password")

            if st.form_submit_button("👤 Criar"):
                if len(cpf) != 11 or not cpf.isdigit():
                    st.error("CPF deve ter 11 dígitos!")
                elif not first_name or not last_name:
                    st.error("Nome obrigatório!")
                elif is_admin and not password:
                    st.error("Senha obrigatória para admin!")
                else:
                    user_id = create_user(cpf, password, first_name, last_name, email, is_admin, work_type)
                    if user_id:
                        st.success(f"✅ Criado! ID: {user_id}")
                        st.rerun()

    with tab4:
        st.markdown("### 📈 Relatórios")
        records = get_weight_records()

        if records:
            df = pd.DataFrame(records, columns=[
                'ID', 'Peso', 'Tipo', 'Obs', 'Data', 'Nome', 'Sobrenome', 'CPF'
            ])
            df['Data'] = pd.to_datetime(df['Data'])
            last_month = df[df['Data'] >= (datetime.now() - timedelta(days=30))]

            if not last_month.empty:
                # Pizza por tipo
                work_stats = last_month.groupby('Tipo')['Peso'].sum().reset_index()
                fig_pie = px.pie(work_stats, values='Peso', names='Tipo', title='Por Tipo')
                st.plotly_chart(fig_pie, use_container_width=True)

                # Linha diária
                daily_stats = last_month.groupby(['Data', 'Tipo'])['Peso'].sum().reset_index()
                fig_line = px.line(daily_stats, x='Data', y='Peso', color='Tipo', title='Diário', markers=True)
                st.plotly_chart(fig_line, use_container_width=True)

                # Top funcionários
                last_month['Funcionário'] = last_month['Nome'] + ' ' + last_month['Sobrenome']
                top_users = last_month.groupby('Funcionário')['Peso'].sum().sort_values(ascending=False).head(10)

                fig_bar = px.bar(x=top_users.values, y=top_users.index, orientation='h',
                               title='Top 10', labels={'x': 'Peso (kg)', 'y': 'Funcionário'})
                st.plotly_chart(fig_bar, use_container_width=True)

if __name__ == "__main__":
    main()