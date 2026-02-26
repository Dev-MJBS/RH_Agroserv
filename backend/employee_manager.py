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
        'full_name': ['NOME', 'NOME COMPLETO', 'FUNCIONARIO', 'COLABORADOR', 'NOME DO FUNCIONARIO'],
        'cpf': ['CPF', 'DOCUMENTO', 'IDENTIFICACAO'],
        'email': ['EMAIL', 'E-MAIL', 'CONTRETO'],
        'bank_code': ['BANCO', 'CODIGO BANCO', 'BANK'],
        'agency': ['AGENCIA', 'AG', 'AGENCIA BANCARIA'],
        'account_number': ['CONTA', 'NUMERO DA CONTA', 'CONTA CORRENTE'],
        'pix_key': ['PIX', 'CHAVE PIX', 'PIX KEY']
    }

    def __init__(self, db: Optional[firestore.Client] = None):
        """Inicializa o cliente Firestore."""
        self.db = db or firestore.Client()
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
        df_cols_upper = [str(c).upper().strip() for c in df_columns]
        
        for internal_field, variations in self.COLUMN_MAPPING.items():
            for var in variations:
                if var in df_cols_upper:
                    # Encontra o nome original da coluna (case-sensitive do DF original)
                    idx = df_cols_upper.index(var)
                    mapping[internal_field] = df_columns[idx]
                    break
        return mapping

    def import_from_spreadsheet(self, file_path: str, tenant_id: str) -> Dict[str, Any]:
        """
        Lê arquivos .csv ou .xlsx e importa para o Firestore com isolamento por tenant.
        Implementa lógica de mapeamento flexível e tratamento de agência/conta como string.
        """
        try:
            # Carregamento do arquivo
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path, dtype=str) # Lê tudo como string para preservar zeros à esquerda
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path, dtype=str)
            else:
                raise ValueError("Formato de arquivo inválido. Use .csv ou .xlsx.")

            found_mapping = self._map_columns(df.columns.tolist())
            
            # Validação mínima de campos obrigatórios
            if 'full_name' not in found_mapping or 'cpf' not in found_mapping:
                raise KeyError("Não foi possível identificar as colunas de 'Nome' e 'CPF' na planilha.")

            batch = self.db.batch()
            success_count = 0
            errors = []

            for index, row in df.iterrows():
                try:
                    raw_cpf = row[found_mapping['cpf']]
                    cpf = self._sanitize_cpf(raw_cpf)
                    
                    # Prepara os dados conforme o schema solicitado
                    employee_id = cpf
                    doc_ref = self.db.collection(self.collection_name).document(employee_id)
                    
                    data = {
                        "full_name": str(row[found_mapping['full_name']]).strip().upper(),
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

                    # Firestore batch limit is 500
                    if success_count % 450 == 0:
                        batch.commit()
                        batch = self.db.batch()

                except Exception as e:
                    errors.append(f"Linha {index + 2}: {str(e)}")

            batch.commit()
            return {
                "status": "success", 
                "imported": success_count, 
                "errors": errors if errors else "None"
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}

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
