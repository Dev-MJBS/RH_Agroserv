from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
import shutil

import models, schemas, database, pdf_processor, firebase_auth
from database import engine, get_db
from employee_manager import EmployeeManager

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializa o gerenciador de funcionários
employee_mgr = EmployeeManager()

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

@app.post("/processar-pagamentos")
async def processar_pagamentos(
    mes_referencia: str = Form(...),
    payroll_map: UploadFile = File(...),
    convenia_data: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(firebase_auth.get_current_user)
):
    """
    Rota que apenas processa e retorna o JSON estruturado para o frontend,
    sem persistir (ou persistindo se necessário).
    """
    os.makedirs("uploads", exist_ok=True)
    
    payroll_path = f"uploads/tmp_mapa_{payroll_map.filename}"
    convenia_path = f"uploads/tmp_convenia_{convenia_data.filename}"
    
    with open(payroll_path, "wb") as buffer:
        shutil.copyfileobj(payroll_map.file, buffer)
    with open(convenia_path, "wb") as buffer:
        shutil.copyfileobj(convenia_data.file, buffer)
    
    # Chama o processador Gemini/PyMuPDF
    extracted_data = pdf_processor.process_payroll_with_ai(payroll_path, convenia_path, mes_referencia)
    
    # Limpeza opcional de arquivos temporários
    # os.remove(payroll_path)
    # os.remove(convenia_path)
    
    return extracted_data

@app.get("/payroll-entries", response_model=List[schemas.PayrollEntryDisplay])
def get_payroll_entries(db: Session = Depends(get_db), current_user: dict = Depends(firebase_auth.get_current_user)):
    return db.query(models.PayrollEntry).all()

@app.post("/employees/import")
async def import_employees(
    file: UploadFile = File(...),
    current_user: dict = Depends(firebase_auth.get_current_user)
):
    """
    Rota para importação massiva de funcionários via planilha (.csv ou .xlsx).
    """
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/import_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # O tenant_id vem do usuário logado (Firebase UID ou custom claim)
    tenant_id = current_user.get("uid")
    
    result = employee_mgr.import_from_spreadsheet(file_path, tenant_id)
    
    # Limpeza do arquivo após processamento
    if os.path.exists(file_path):
        os.remove(file_path)
        
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
        
    return result

@app.get("/employees")
async def list_employees(
    current_user: dict = Depends(firebase_auth.get_current_user)
):
    """Retorna a lista de funcionários do tenant logado."""
    tenant_id = current_user.get("uid")
    docs = employee_mgr.db.collection("employees").where("tenant_id", "==", tenant_id).stream()
    
    employees = []
    for doc in docs:
        emp = doc.to_dict()
        # Firestore timestamps não são serializáveis por padrão no JSON do FastAPI
        # Vamos converter ou simplificar para o frontend
        if "created_at" in emp: del emp["created_at"]
        if "updated_at" in emp: del emp["updated_at"]
        employees.append(emp)
        
    return employees

@app.patch("/employees/{cpf}/status")
async def update_employee_status(
    cpf: str,
    new_status: str = Form(...),
    current_user: dict = Depends(firebase_auth.get_current_user)
):
    """Atualiza o status de um funcionário específico."""
    tenant_id = current_user.get("uid")
    try:
        employee_mgr.update_status(cpf, tenant_id, new_status)
        return {"message": "Status atualizado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Muda o host para 127.0.0.1 em ambiente local se 0.0.0.0 tiver problema
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Servidor IA-Agro iniciando na porta {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
