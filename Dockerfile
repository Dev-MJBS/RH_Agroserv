# Use uma imagem oficial do Python segura e estável
FROM python:3.10-slim

# Evita que o Python gere arquivos .pyc e permite logs em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH /app

# Diretório de trabalho dentro do container
WORKDIR /app

# Instala dependências do sistema necessárias para PyMuPDF, Pandas e Networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    net-tools \
    iproute2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia apenas o requirements primeiro para aproveitar o cache de camadas do Docker
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copia o restante do código do backend para o diretório de trabalho
# O .dockerignore garantirá que apenas o necessário (sem .venv ou .git) seja copiado
COPY backend/ /app/

# Garante permissões na pasta de uploads e no banco SQLite
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Expõe a porta que o FastAPI usa (Railway usa a variável de ambiente $PORT)
EXPOSE 8000

# Comando para rodar a aplicação usando uvicorn diretamente via shell.
# O Railway injeta a porta em $PORT. Se não houver, padrão 8000.
# Usamos workers=1 para economia de memória em planos gratuitos.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers --forwarded-allow-ips='*'
