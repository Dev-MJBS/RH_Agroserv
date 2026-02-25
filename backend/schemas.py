from pydantic import BaseModel
from typing import List, Optional

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class BankData(BaseModel):
    banco: str
    agencia: str
    conta: str

class PayrollEntryCreate(BaseModel):
    nome_funcionario: str
    cpf: str
    salario_liquido: float
    centro_de_custo: str
    dados_bancarios: BankData
    mes_referencia: str

class PayrollEntryDisplay(BaseModel):
    id: int
    nome_funcionario: str
    cpf: str
    salario_liquido: float
    centro_de_custo: str
    banco: str
    agencia: str
    conta: str
    mes_referencia: str
    
    class Config:
        from_attributes = True
