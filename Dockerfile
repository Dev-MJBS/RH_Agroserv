# Use uma imagem oficial do Python segura e leve
FROM python:3.9-slim

# Evita que o Python gere arquivos .pyc e permite logs em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Diretório de trabalho dentro do container
WORKDIR /app

# Instala dependências do sistema necessárias para algumas libs (ex: PyMuPDF ou Pandas)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copia apenas o requirements primeiro para aproveitar o cache de camadas do Docker
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código do backend para o diretório de trabalho
COPY backend/ .

# Expõe a porta que o FastAPI usa (Railway usa a variável de ambiente $PORT)
EXPOSE 8000

# Comando para rodar a aplicação usando python diretamente (lê a porta do main.py)
CMD ["python", "main.py"]
