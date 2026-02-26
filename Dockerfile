# Use uma imagem oficial do Python baseada em Debian Bookworm (Estável)
FROM python:3.10-slim-bookworm

# Evita que o Python gere arquivos .pyc e permite logs em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH /app

# Diretório de trabalho dentro do container
WORKDIR /app

# Instala dependências do sistema necessárias para PyMuPDF, Pandas e Networking
# Trocamos libgl1-mesa-glx por libgl1 pois o pacote mudou de nome no Debian atual
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgl1 \
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
COPY backend/ /app/

# Garante permissões na pasta de uploads e no banco SQLite
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Expõe a porta que o FastAPI usa (Railway usa a variável de ambiente $PORT)
EXPOSE 8000

# Usamos o formato shell (sem colchetes) para garantir a expansão do $PORT.
# O Railway injeta a porta em $PORT automaticamente.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers
