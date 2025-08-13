#!/bin/bash
# Script para iniciar o Streamlit

echo "🚀 Iniciando aplicação Streamlit..."
echo "📊 Sistema de Gestão de Peso - Pesqueira"
echo "🔗 A aplicação estará disponível em http://localhost:8501"

# Executar o Streamlit
streamlit run main.py \
  --server.port 8501 \
  --server.address 0.0.0.0 \
  --server.headless true \
  --browser.gatherUsageStats false