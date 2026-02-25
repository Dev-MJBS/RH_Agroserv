from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class PayrollEntry(Base):
    __tablename__ = "payroll_entries"
    id = Column(Integer, primary_key=True, index=True)
    nome_funcionario = Column(String, index=True)
    cpf = Column(String)
    salario_liquido = Column(Float)
    centro_de_custo = Column(String)
    banco = Column(String)
    agencia = Column(String)
    conta = Column(String)
    mes_referencia = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
