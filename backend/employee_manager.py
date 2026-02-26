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
            'NOME DO FUNCIONARIO', 'NOME DO FUNCIONÁRIO', 'NOME DO COLABORADOR',
            'NOME_COMPLETO', 'FULL NAME', 'NOME DO FAVORECIDO', 'FAVORECIDO', 'BENEFICIARIO'
        ],
        'cpf': [
            'CPF', 'DOCUMENTO', 'IDENTIFICACAO', 'IDENTIFICAÇÃO', 'ID', 'CPF/CNPJ', 'CPF_CNPJ', 
            'DOC', 'CPF DO FAVORECIDO', 'CPF FAVORECIDO', 'MATRICULA', 'MATRÍCULA'
        ],
        'email': ['EMAIL', 'E-MAIL', 'CONTRETO', 'CORREIO ELETRONICO', 'ELECTRONIC MAIL', 'MAIL'],
        'bank_code': ['BANCO', 'CODIGO BANCO', 'CÓDIGO BANCO', 'BANK', 'INSTITUIÇÃO', 'INSTITUICAO', 'COD BANCO'],
        'agency': ['AGENCIA', 'AGÊNCIA', 'AG', 'AGENCIA BANCARIA', 'AGÊNCIA BANCÁRIA', 'AGENCIA_BANCARIA', 'AG'],
        'account_number': ['CONTA', 'NUMERO DA CONTA', 'NÚMERO DA CONTA', 'CONTA CORRENTE', 'CONTA_CORRENTE', 'NUMERO_CONTA', 'CONTA/DV'],
        'pix_key': ['PIX', 'CHAVE PIX', 'PIX KEY', 'CHAVE_PIX', 'CHAVE_BANCO', 'CHAVE']
    }

    def __init__(self, db: Any = None):
        """Inicializa o cliente Firestore de forma lazy."""
        self._db = db
        self.collection_name = "employees"
        self.timestamp_fn = None
        
    @property
    def db(self):
        """Lazy loader para o cliente Firestore para evitar crash se não inicializado."""
        if self._db is not None:
            return self._db
        
        try:
            import firebase_admin
            from firebase_admin import firestore as admin_firestore
            # Se já inicializamos o app no firebase_auth.py, ou se ele já estiver ativo
            if not firebase_admin._apps:
                # O ideal é que o firebase_auth.py tenha inicializado.
                # Se não, tentamos inicializar aqui como fallback.
                pass 
                
            self._db = admin_firestore.client()
            self.timestamp_fn = admin_firestore.SERVER_TIMESTAMP
            return self._db
        except Exception as e:
            # Em vez de crashar o servidor, vamos logar o erro.
            # As requisições que dependerem do DB vão falhar depois com erro 500.
            print(f"CRITICAL: Failed to initialize Firestore: {e}")
            raise RuntimeError("Serviço de Banco de Dados (Firestore) não está configurado corretamente no Railway.")

    def _sanitize_cpf(self, cpf: Any) -> str:
        """Remove caracteres não numéricos e valida o CPF (11 dígitos)."""
        if pd.isna(cpf) or not cpf:
            raise ValueError("CPF nulo ou não fornecido.")
        
        sanitized = re.sub(r"\D", "", str(cpf))
        if len(sanitized) != 11:
            raise ValueError(f"CPF inválido (deve ter 11 dígitos): {cpf}")
            
        return sanitized

    def _normalize_text(self, text: Any) -> str:
        """Normaliza o texto para comparação robusta (minuscula, sem acentos, sem pontuação)."""
        if pd.isna(text) or text is None:
            return ""
        # Converte para string, remove espaços extras e passa para minúsculo
        s = str(text).strip().lower()
        # Remove caracteres especiais e pontuação para facilitar o match (mantém letras e números)
        s = re.sub(r'[^a-z0-9]', '', s)
        return s

    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Tenta descobrir a linha real de cabeçalho se a primeira for lixo (títulos, etc).
        Agora muito mais agressiva: Scan de 100 linhas e busca por sub-termos.
        """
        nome_vars = [self._normalize_text(v) for v in self.COLUMN_MAPPING['full_name']]
        cpf_vars = [self._normalize_text(v) for v in self.COLUMN_MAPPING['cpf']]
        
        def check_row_for_headers(vals_norm):
            has_nome = False
            has_cpf = False
            for v in vals_norm:
                if not v: continue
                # Match se contém algum termo de nomes
                if any(nv in v for nv in nome_vars if len(nv) > 3): has_nome = True
                # Match se contém algum termo de CPF
                if any(cv in v for cv in cpf_vars if len(cv) >= 3): has_cpf = True
            return has_nome, has_cpf

        # Primeiro, testa se as colunas atuais já servem
        cols_norm = [self._normalize_text(c) for c in df.columns]
        h_n, h_c = check_row_for_headers(cols_norm)
        if h_n and h_c:
            return df
            
        # Escaneia as primeiras 100 linhas (para planilhas com muitos títulos)
        limit = min(100, len(df))
        for i in range(limit):
            row_raw = df.iloc[i].tolist()
            row_norm = [self._normalize_text(v) for v in row_raw]
            
            row_h_n, row_h_c = check_row_for_headers(row_norm)
            
            # Se achou NOME e CPF ou NOME e pelo menos outro campo útil nos dados
            useful_fields = 0
            if row_h_n: useful_fields += 1
            if row_h_c: useful_fields += 1
            
            # Se achou pelo menos 2 campos importantes na mesma linha
            if useful_fields >= 2:
                new_headers = row_raw
                # Limpa os headers e lida com duplicatas/nulos
                seen = {}
                final_headers = []
                for j, h in enumerate(new_headers):
                    h_clean = str(h).strip() if pd.notna(h) and str(h).strip() != "" else f"col_{j}"
                    # Se for o título geral, ignora-o se houver outros nomes úteis
                    if h_clean in seen:
                        seen[h_clean] += 1
                        h_clean = f"{h_clean}_{seen[h_clean]}"
                    else:
                        seen[h_clean] = 0
                    final_headers.append(h_clean)
                
                new_df = df.iloc[i+1:].reset_index(drop=True)
                new_df.columns = final_headers
                return new_df
        
        return df

    def _map_columns(self, df_columns: List[str]) -> Dict[str, str]:
        """Identifica colunas usando normalização agressiva e substring fuzzy."""
        mapping = {}
        df_cols_normalized = [self._normalize_text(c) for c in df_columns]
        
        for internal_field, variations in self.COLUMN_MAPPING.items():
            variations_norm = [self._normalize_text(v) for v in variations]
            
            # 1. Tenta match exato primeiro (mais seguro)
            found = False
            for i, col_norm in enumerate(df_cols_normalized):
                if col_norm in variations_norm:
                    mapping[internal_field] = df_columns[i]
                    found = True
                    break
            
            if found: continue
            
            # 2. Tenta match por substring se variação for significativa e vice-versa
            for i, col_norm in enumerate(df_cols_normalized):
                if not col_norm: continue
                for v_norm in variations_norm:
                    if len(v_norm) >= 3 and (v_norm in col_norm or col_norm in v_norm):
                        mapping[internal_field] = df_columns[i]
                        found = True
                        break
                if found: break
                
        return mapping

    def import_from_spreadsheet(self, file_path: str, tenant_id: str) -> Dict[str, Any]:
        """
        Lê arquivos .csv ou .xlsx e importa para o Firestore com isolamento por tenant.
        Agora integra com IA para analisar múltiplas abas se necessário.
        """
        try:
            import pdf_processor # Import dinâmico para evitar circular dependency
            
            # 1. Analisa a planilha com IA para descobrir a aba correta e colunas
            ai_analysis = pdf_processor.analyze_spreadsheet_with_ai(file_path)
            
            # 2. Carrega os dados com base na recomendação da IA ou fallback
            df = pd.DataFrame()
            found_mapping = {}
            
            try:
                if ai_analysis and ai_analysis.get('recommended_sheet'):
                    sheet = ai_analysis['recommended_sheet']
                    print(f"IA recomendou a aba: {sheet}")
                    
                    if file_path.endswith('.csv'):
                        df = pd.read_csv(file_path, dtype=str)
                    else:
                        df = pd.read_excel(file_path, sheet_name=sheet, dtype=str)
                    
                    # Usa o mapeamento sugerido pela IA
                    mapping_from_ai = ai_analysis.get('column_mapping', {})
                    # Valida se as colunas sugeridas existem no DF
                    for key, col in mapping_from_ai.items():
                        if col and col in df.columns:
                            found_mapping[key] = col
                
                # Se a IA falhou ou o mapping está incompleto, usa a lógica de mapping padrão
                if not found_mapping or 'full_name' not in found_mapping or 'cpf' not in found_mapping:
                    if df.empty:
                        # Fallback: Lê a primeira aba se ainda não leu nada
                        if file_path.endswith('.csv'):
                            df = pd.read_csv(file_path, dtype=str)
                        else:
                            df = pd.read_excel(file_path, dtype=str)
                    
                    # Tenta limpar o dataframe (pode ter cabeçalho sujo)
                    df = self._clean_dataframe(df)
                    # Tenta mapear as colunas via lógica robusta interna
                    found_mapping = self._map_columns(df.columns.tolist())

            except Exception as e:
                # Se der qualquer erro no carregamento específico, tenta o carregamento genérico
                print(f"Erro no carregamento orientado por IA: {e}. Usando fallback...")
                if file_path.endswith('.csv'):
                    df = pd.read_csv(file_path, dtype=str)
                else:
                    df = pd.read_excel(file_path, dtype=str)
                df = self._clean_dataframe(df)
                found_mapping = self._map_columns(df.columns.tolist())

            if df.empty:
                return {
                    "status": "error", 
                    "code": "ERR_EMPTY_FILE",
                    "message": "A planilha está vazia."
                }

            # Validação mínima de campos obrigatórios
            missing = []
            if 'full_name' not in found_mapping: missing.append("Nome")
            if 'cpf' not in found_mapping: missing.append("CPF")
            
            if missing:
                return {
                    "status": "error", 
                    "code": "ERR_MAPPING_FAILED",
                    "message": f"Não encontramos as colunas: {', '.join(missing)}",
                    "available_columns": df.columns.tolist(),
                    "reasoning": ai_analysis.get('reasoning') if ai_analysis else "Falha no mapeamento automático."
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
                        "created_at": self.timestamp_fn,
                        "updated_at": self.timestamp_fn
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
            "updated_at": self.timestamp_fn
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
        
        updates["updated_at"] = self.timestamp_fn
        doc_ref.update(updates)
        return True
