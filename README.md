# RH Agroserv - Payroll AI Automator

Sistema para automação de extração de custos de folha de pagamento de PDFs da contabilidade usando IA (Gemini).

## Tecnologias
- **Backend:** FastAPI, SQLAlchemy (SQLite), PyMuPDF (fitz), Google Generative AI.
- **Frontend:** React, Tailwind CSS, Lucide React, Recharts.

## Como rodar o Backend
1. Entre na pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure o arquivo `.env` com sua `GEMINI_API_KEY`.
4. Inicie o servidor:
   ```bash
   python main.py
   ```

## Como rodar o Frontend
1. Entre na pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o projeto:
   ```bash
   npm run dev
   ```

## Funcionalidades
- [x] Login com JWT.
- [x] Upload de PDF e extração via IA estruturada.
- [x] Dashboard interativo com gráficos de Centro de Custo.
- [x] Tabela de funcionários com filtros.
- [x] Exportação de dados para CSV/Excel.
