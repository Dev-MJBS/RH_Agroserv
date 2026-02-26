from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
import shutil

import models, schemas, database, pdf_processor, firebase_auth
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status

# ...existing code...

@app.post("/upload-payroll")
async def upload_payroll(
    mes_referencia: str = Form(...),
    payroll_map: UploadFile = File(...),
    convenia_data: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(firebase_auth.get_current_user)
):
    os.makedirs("uploads", exist_ok=True)
    
    payroll_path = f"uploads/mapa_{payroll_map.filename}"
    convenia_path = f"uploads/convenia_{convenia_data.filename}"
    
    with open(payroll_path, "wb") as buffer:
        shutil.copyfileobj(payroll_map.file, buffer)
    with open(convenia_path, "wb") as buffer:
        shutil.copyfileobj(convenia_data.file, buffer)
    
    extracted_data = pdf_processor.process_payroll_with_ai(payroll_path, convenia_path, mes_referencia)
    
    entries = []
    # Iterar sobre os Centros de Custo retornados pela IA
    ccs = extracted_data.get("centros_de_custo", [])
    
    for cc in ccs:
        cc_nome = cc.get("nome", "Não Identificado")
        for func in cc.get("funcionarios", []):
            entry = models.PayrollEntry(
                nome_funcionario=func.get("nome"),
                cpf=func.get("cpf"),
                salario_liquido=func.get("liquido"),
                centro_de_custo=cc_nome, # Usamos o CC consolidado pela IA
                banco=func.get("dados_bancarios", {}).get("banco"),
                agencia=func.get("dados_bancarios", {}).get("agencia"),
                conta=func.get("dados_bancarios", {}).get("conta"),
                mes_referencia=mes_referencia
            )
            db.add(entry)
            entries.append(entry)
    
    db.commit()
    return {
        "message": f"Processados {len(entries)} funcionários em {len(ccs)} Centros de Custo para {mes_referencia}", 
        "count": len(entries),
        "resumo": extracted_data.get("resumo_mes")
    }

@app.get("/payroll-entries", response_model=List[schemas.PayrollEntryDisplay])
def get_payroll_entries(db: Session = Depends(get_db), current_user: dict = Depends(firebase_auth.get_current_user)):
    return db.query(models.PayrollEntry).all()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
