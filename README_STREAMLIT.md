# Sistema de Gestão de Peso - Pesqueira (Streamlit)

## 📊 Sobre o Sistema

Sistema completo de gestão de peso para funcionários de empresa pesqueira, desenvolvido em Python com Streamlit.

### ✨ Funcionalidades

**Para Funcionários:**
- Login simplificado com CPF
- Registro diário de peso
- Visualização de estatísticas pessoais
- Histórico de registros
- Gráficos de evolução

**Para Administradores:**
- Login com CPF e senha
- Gerenciamento de usuários
- Visualização de relatórios completos
- Análise de produção por tipo
- Exportação de dados em CSV
- Dashboard com métricas diárias

## 🚀 Como Executar

### Pré-requisitos
- Python 3.11+
- PostgreSQL (configurado via DATABASE_URL)

### Instalação

1. Instalar as dependências:
```bash
pip install streamlit psycopg2-binary bcrypt pandas plotly
```

2. Configurar a variável de ambiente DATABASE_URL

3. Executar o aplicativo:
```bash
# Porta padrão (8501)
streamlit run main.py

# Porta customizada (5000)
python -m streamlit run main.py --server.port 5000 --server.address 0.0.0.0
```

## 🔧 Configuração

O aplicativo utiliza PostgreSQL para armazenamento de dados. As tabelas são criadas automaticamente na primeira execução.

### Estrutura do Banco de Dados

**Tabela `users`:**
- CPF, nome, email
- Tipo de trabalho (Filetagem/Espinhos)
- Controle de admin e status ativo

**Tabela `weight_records`:**
- Registros de peso por usuário
- Data e tipo de trabalho
- Observações

## 📱 Uso do Sistema

### Login de Funcionário
1. Selecionar "Funcionário" na sidebar
2. Inserir CPF (11 dígitos)
3. Clicar em "Entrar"

### Login de Administrador
1. Selecionar "Administrador" na sidebar
2. Inserir CPF e senha
3. Clicar em "Entrar"

### Registro de Peso (Funcionário)
1. Fazer login como funcionário
2. Preencher peso e tipo de trabalho
3. Adicionar observações (opcional)
4. Clicar em "Salvar"

### Criar Usuário (Admin)
1. Fazer login como admin
2. Acessar aba "Novo User"
3. Preencher dados do usuário
4. Para admin, definir senha obrigatória
5. Clicar em "Criar"

## 🎨 Interface

O sistema possui interface moderna com:
- Dashboard responsivo
- Gráficos interativos (Plotly)
- Exportação de dados
- Métricas em tempo real

## 📊 Métricas Disponíveis

- Peso registrado hoje
- Peso total do mês
- Média semanal
- Usuários ativos
- Top 10 funcionários
- Distribuição por tipo de trabalho

## 🔒 Segurança

- Senhas criptografadas com bcrypt
- Controle de acesso por perfil
- Validação de CPF
- Status ativo/inativo para usuários

## 📝 Notas

- O sistema está configurado para rodar na porta 5000
- Interface em português brasileiro
- Suporte a múltiplos usuários simultâneos
- Backup automático via PostgreSQL

## 🆘 Suporte

Em caso de problemas:
1. Verificar se DATABASE_URL está configurada
2. Verificar se o PostgreSQL está acessível
3. Verificar logs do Streamlit
4. Reiniciar o aplicativo se necessário