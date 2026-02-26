import pandas as pd
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from google.cloud import firestore

class EmployeeManager:
    """
    Gerenciador de Funcionários para o sistema IA-Agro.
    Especializado em migração de dados legados e gestão de ciclo de vida multitenant.
    """

    VALID_STATUSES = ["ATIVO", "INATIVO", "AGUARDANDO"]
    
    # Mapeamento flexível de colunas para suportar diferentes formatos de planilhas legadas
    COLUMN_MAPPING = {
        'full_name': [
            'NOME', 'NOME COMPLETO', 'FUNCIONARIO', 'FUNCIONÁRIO', 'COLABORADOR', 
            'NOME DO FUNCIONARIO', 'NOME DO FUNCIONÁRIO'
        ],
        'cpf': ['CPF', 'DOCUMENTO', 'IDENTIFICACAO', 'IDENTIFICAÇÃO', 'ID'],
        'email': ['EMAIL', 'E-MAIL', 'CONTRETO', 'CORREIO ELETRONICO'],
        'bank_code': ['BANCO', 'CODIGO BANCO', 'CÓDIGO BANCO', 'BANK'],
        'agency': ['AGENCIA', 'AGÊNCIA', 'AG', 'AGENCIA BANCARIA', 'AGÊNCIA BANCÁRIA'],
        'account_number': ['CONTA', 'NUMERO DA CONTA', 'NÚMERO DA CONTA', 'CONTA CORRENTE', 'CONTA_CORRENTE'],
        'pix_key': ['PIX', 'CHAVE PIX', 'PIX KEY', 'CHAVE_PIX']
    }

    def __init__(self, db: Any = None):
        """Inicializa o cliente Firestore."""
        if db:
            self.db = db
        else:
            # Tenta pegar o cliente do firebase_admin (já inicializado no auth)
            try:
                from firebase_admin import firestore as admin_firestore
                self.db = admin_firestore.client()
            except Exception:
                # Fallback para o cliente padrão se necessário
                from google.cloud import firestore
                self.db = firestore.Client()
        self.collection_name = "employees"

    def _sanitize_cpf(self, cpf: Any) -> str:
        """Remove caracteres não numéricos e valida o CPF (11 dígitos)."""
        if pd.isna(cpf) or not cpf:
            raise ValueError("CPF nulo ou não fornecido.")
        
        sanitized = re.sub(r"\D", "", str(cpf))
        if len(sanitized) != 11:
            raise ValueError(f"CPF inválido (deve ter 11 dígitos): {cpf}")
            
        return sanitized

    def _map_columns(self, df_columns: List[str]) -> Dict[str, str]:
        """Identifica quais colunas da planilha correspondem aos nossos campos internos."""
        mapping = {}
        # Normalização: Remove acentos, bota em UPPER e dá strip
        import unicodedata
        def normalize(txt):
            return "".join(c for c in unicodedata.normalize('NFD', str(txt)) if unicodedata.category(c) != 'Mn').upper().strip()

        df_cols_normalized = [normalize(c) for c in df_columns]
        
        for internal_field, variations in self.COLUMN_MAPPING.items():
            for var in variations:
                var_normalized = normalize(var)
                if var_normalized in df_cols_normalized:
                    idx = df_cols_normalized.index(var_normalized)
                    mapping[internal_field] = df_columns[idx]
                    break
        return mapping

    def import_from_spreadsheet(self, file_path: str, tenant_id: str) -> Dict[str, Any]:
        """
        Lê arquivos .csv ou .xlsx e importa para o Firestore com isolamento por tenant.
        Retorna códigos de erro detalhados para facilitar o diagnóstico.
        """
        try:
            # Carregamento do arquivo
            try:
                if file_path.endswith('.csv'):
                    df = pd.read_csv(file_path, dtype=str)
                elif file_path.endswith(('.xlsx', '.xls')):
                    df = pd.read_excel(file_path, dtype=str)
                else:
                    return {
                        "status": "error", 
                        "code": "ERR_INVALID_FORMAT",
                        "message": "Formato de arquivo não suportado. Use .csv ou .xlsx."
                    }
            except Exception as e:
                return {
                    "status": "error", 
                    "code": "ERR_FILE_READ",
                    "message": f"Erro ao ler o arquivo: {str(e)}"
                }

            if df.empty:
                return {
                    "status": "error", 
                    "code": "ERR_EMPTY_FILE",
                    "message": "A planilha está vazia."
                }

            found_mapping = self._map_columns(df.columns.tolist())
            
            # Validação mínima de campos obrigatórios
            missing = []
            if 'full_name' not in found_mapping: missing.append("Nome")
            if 'cpf' not in found_mapping: missing.append("CPF")
            
            if missing:
                return {
                    "status": "error", 
                    "code": "ERR_MAPPING_FAILED",
                    "message": f"Não encontramos as colunas: {', '.join(missing)}",
                    "available_columns": df.columns.tolist()
                }

            batch = self.db.batch()
            success_count = 0
            row_errors = []

            for index, row in df.iterrows():
                row_id = f"Linha {index + 2}"
                try:
                    raw_cpf = row.get(found_mapping['cpf'])
                    if pd.isna(raw_cpf):
                        raise ValueError("CPF Ausente")
                        
                    cpf = self._sanitize_cpf(raw_cpf)
                    doc_ref = self.db.collection(self.collection_name).document(cpf)
                    
                    data = {
                        "full_name": str(row.get(found_mapping['full_name'], "")).strip().upper(),
                        "cpf": cpf,
                        "email": str(row.get(found_mapping.get('email'), "")).lower().strip(),
                        "tenant_id": tenant_id,
                        "status": "AGUARDANDO",
                        "bank_info": {
                            "bank_code": str(row.get(found_mapping.get('bank_code'), "")).strip(),
                            "agency": str(row.get(found_mapping.get('agency'), "")).strip(),
                            "account_number": str(row.get(found_mapping.get('account_number'), "")).strip(),
                            "pix_key": str(row.get(found_mapping.get('pix_key'), "")).strip()
                        },
                        "created_at": firestore.SERVER_TIMESTAMP,
                        "updated_at": firestore.SERVER_TIMESTAMP
                    }

                    batch.set(doc_ref, data, merge=True)
                    success_count += 1

                    if success_count % 450 == 0:
                        batch.commit()
                        batch = self.db.batch()

                except Exception as e:
                    row_errors.append({"row": row_id, "error": str(e)})

            batch.commit()
            
            return {
                "status": "success" if success_count > 0 else "error",
                "code": "PARTIAL_SUCCESS" if row_errors and success_count > 0 else "SUCCESS",
                "imported": success_count,
                "row_errors": row_errors,
                "total_rows_processed": len(df)
            }

        except Exception as e:
            return {
                "status": "error", 
                "code": "ERR_INTERNAL",
                "message": f"Erro interno no processamento: {str(e)}"
            }

    def update_status(self, employee_id: str, tenant_id: str, new_status: str) -> bool:
        """
        Atualiza o status do funcionário garantindo isolamento de tenant.
        Valida se o status pertence ao workflow permitido.
        """
        if new_status.upper() not in self.VALID_STATUSES:
            raise ValueError(f"Status inválido. Escolha entre: {self.VALID_STATUSES}")

        doc_ref = self.db.collection(self.collection_name).document(employee_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise FileNotFoundError("Funcionário não encontrado.")
            
        current_data = doc.to_dict()
        if current_data.get("tenant_id") != tenant_id:
            raise PermissionError("Acesso negado: Este funcionário pertence a outra empresa.")

        doc_ref.update({
            "status": new_status.upper(),
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        return True

    def edit_employee(self, employee_id: str, tenant_id: str, updates: Dict[str, Any]) -> bool:
        """
        Permite atualização parcial dos dados do funcionário.
        Inclui proteção de tenant_id.
        """
        doc_ref = self.db.collection(self.collection_name).document(employee_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise FileNotFoundError("Funcionário não encontrado.")
            
        if doc.to_dict().get("tenant_id") != tenant_id:
            raise PermissionError("Acesso negado.")

        # Remove campos sensíveis que não devem ser alterados via edit_employee
        updates.pop("tenant_id", None)
        updates.pop("cpf", None)
        
        updates["updated_at"] = firestore.SERVER_TIMESTAMP
        doc_ref.update(updates)
        return True
