import fitz  # PyMuPDF
import google.generativeai as genai
import json
import os
import re
import pandas as pd
from typing import List
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def analyze_spreadsheet_with_ai(file_path: str):
    """
    Usa IA para analisar uma planilha com múltiplas abas e identificar onde estão os dados de funcionários.
    """
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, nrows=10).to_string()
            sheets_info = f"Arquivo CSV (aba única):\n{df}"
        else:
            xl = pd.ExcelFile(file_path)
            sheets_summary = []
            for sheet_name in xl.sheet_names:
                # Lê um pouco mais de linhas para capturar cabeçalhos escondidos
                df_temp = pd.read_excel(file_path, sheet_name=sheet_name, nrows=15)
                # Amostra das primeiras 15 linhas como texto
                sample_text = df_temp.to_string(index=False)
                summary = f"Aba: '{sheet_name}'\nColunas Lidas (podem estar erradas se houver lixo no topo): {df_temp.columns.tolist()}\nConteúdo da Amostra:\n{sample_text}"
                sheets_summary.append(summary)
            sheets_info = "\n\n---\n\n".join(sheets_summary)

        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Analise a estrutura desta planilha abaixo que contém várias abas. 
        Sua tarefa é identificar QUAL ABA contém os dados cadastrais de funcionários (Nomes, CPFs e Dados Bancários).

        IMPORTANTE: O arquivo pode ter títulos ou linhas vazias no topo antes dos cabeçalhos reais. Olhe para a 'Amostra' para identificar os nomes reais das colunas de dados.

        INFORMAÇÕES DAS ABAS:
        {sheets_info}

        Responda OBRIGATORIAMENTE em formato JSON com esta estrutura:
        {{
          "recommended_sheet": "NOME_DA_ABA_ESCOLHIDA",
          "column_mapping": {{
            "full_name": "NOME_EXATO_DA_COLUNA_DE_NOME_COMO_APARECE_NA_ AMOSTRA",
            "cpf": "NOME_EXATO_DA_COLUNA_DE_CPF",
            "bank_code": "NOME_EXATO_DA_COLUNA_DE_BANCO_OU_VAZIO",
            "agency": "NOME_EXATO_DA_COLUNA_DE_AGENCIA_OU_VAZIO",
            "account_number": "NOME_EXATO_DA_COLUNA_DE_CONTA_OU_VAZIO",
            "pix_key": "NOME_EXATO_DA_COLUNA_DE_PIX_OU_VAZIO"
          }},
          "reasoning": "Breve explicação. Se as colunas estiverem em linhas de dados (e não no header que o pandas leu), mencione isso."
        }}

        Se o arquivo for CSV, o 'recommended_sheet' deve ser o nome do arquivo ou '0'.
        Se não encontrar os dados, retorne o JSON com campos vazios.
        """

        response = model.generate_content(prompt)
        json_text = response.text.strip()
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0].strip()
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0].strip()
            
        return json.loads(json_text)
    except Exception as e:
        print(f"Erro na análise de IA da planilha: {e}")
        return None

def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def process_payroll_with_ai(payroll_map_path: str, convenia_path: str, mes_referencia: str):
    payroll_text = extract_text_from_pdf(payroll_map_path)
    convenia_text = extract_text_from_pdf(convenia_path)
    
    model = genai.GenerativeModel('gemini-1.5-pro-002') # Usando a versão mais estável e moderna
    
    prompt = f"""
    Você é um agente especializado em análise de folha de pagamento e alocação de custos. Sua missão é processar dois documentos, extrair dados estruturados e consolidá-los em um JSON final para alimentar um Dashboard de Business Intelligence (BI).

    📥 1. Fontes de Dados
    - Arquivo A (Convenia): Base cadastral. Contém a relação de funcionários, CPF e, crucialmente, o Centro de Custo (CC) e Departamento.
    - Arquivo B (Mapa da Folha/Espelho): Base financeira. Contém os valores de Proventos, Descontos, Salário Líquido e encargos (FGTS/INSS).

    🧠 2. Lógica de Processamento (Passo a Passo)
    - Passo 1: Extrair e Identificar cada funcionário pelo CPF ou Nome Completo.
    - Passo 2: De-Para de Centros de Custo. Agrupar os funcionários conforme o Centro de Custo extraído do arquivo da Convenia.
      Categorias Alvo: Armazéns, Limpeza, Transporte, Administrativo, Outros.
    - Passo 3: Consolidação Financeira. Somar custos (Proventos + Encargos Patronais se houver) por Centro de Custo.

    📤 3. Formato de Saída (JSON Estruturado)
    Retorne OBRIGATORIAMENTE um objeto JSON seguindo este esquema exato (não adicione texto fora do JSON):

    {{
      "resumo_mes": {{
        "total_folha": 0.00,
        "total_funcionarios": 0,
        "competencia": "{mes_referencia}"
      }},
      "centros_de_custo": [
        {{
          "nome": "NOME_DO_CC",
          "custo_total": 0.00,
          "quantidade_pessoas": 0,
          "funcionarios": [
            {{
              "nome": "NOME COMPLETO",
              "cpf": "000.000.000-00",
              "liquido": 0.00,
              "cc_original": "CC ORIGINAL",
              "dados_bancarios": {{ "banco": "NOME", "agencia": "0000", "conta": "00000-0" }}
            }}
          ]
        }}
      ]
    }}

    ⚠️ 4. Regras de Exceção
    - Funcionário Não Encontrado na Convenia: Mover para 'Centro de Custo Não Identificado'.
    - Valores Monetários: Converter formatos brasileiros (1.250,50) para float (1250.50).
    - Dados Sensíveis: Inclua o CPF e Dados Bancários apenas para uso interno no banco de dados.

    DADOS DO MAPA DA FOLHA (VALORES):
    {payroll_text[:12000]}

    DADOS DA CONVENIA (CENTROS DE CUSTO):
    {convenia_text[:12000]}
    """
    
    response = model.generate_content(prompt)
    try:
        json_text = response.text.strip()
        if json_text.startswith("```json"):
            json_text = json_text[7:-3].strip()
        elif json_text.startswith("```"):
            json_text = json_text[3:-3].strip()
        
        return json.loads(json_text)
    except Exception as e:
        print(f"Error parsing AI response: {e}")
        return {{"resumo_mes": {{"total_folha": 0, "total_funcionarios": 0, "competencia": mes_referencia}}, "centros_de_custo": []}}

def parse_payroll_map(pdf_path: str):
    """
    Extrai dados financeiros de um PDF de 'Mapa da Folha' usando PyMuPDF e Regex.
    """
    doc = fitz.open(pdf_path)
    employees = []
    
    # Regex Patterns
    # Captura Código e Nome: ex: 1347 ADAIR CAMILO DE LIMA
    re_name = re.compile(r'^(\d{1,6})\s+([A-Z\s]+)$')
    # CPF: 000.000.000-00
    re_cpf = re.compile(r'CPF:\s*(\d{3}\.\d{3}\.\d{3}-\d{2})')
    # CC: 12
    re_cc = re.compile(r'CC:\s*(\d+)')
    
    # Valores financeiros
    # Líquido: 1.234,56 | Proventos: 2.000,00 | Descontos: 765,44
    re_liquido = re.compile(r'Líquido:\s*([\d\.]+,\d{2})')
    re_proventos = re.compile(r'Proventos:\s*([\d\.]+,\d{2})')
    re_descontos = re.compile(r'Descontos:\s*([\d\.]+,\d{2})')
    re_base_fgts = re.compile(r'Base FGTS:\s*([\d\.]+,\d{2})')
    re_valor_fgts = re.compile(r'Valor FGTS:\s*([\d\.]+,\d{2})')

    # Regex para dados bancários no Convenia/Payroll
    # Ex: Banco: ITAU | Agencia: 1234 | Conta: 12345-6
    re_banco = re.compile(r'Banco:\s*([A-Z\s]+)', re.IGNORECASE)
    re_agencia = re.compile(r'Agencia:\s*(\d+)')
    re_conta = re.compile(r'Conta:\s*([\d-]+)')

    def clean_currency(value_str):
        if not value_str: return 0.0
        # Remove ponto de milhar e troca vírgula por ponto decimal
        return float(value_str.replace('.', '').replace(',', '.'))

    current_employee = {}
    
    for page in doc:
        text_lines = page.get_text("text").splitlines()
        
        for line in text_lines:
            line = line.strip()
            
            # Identifica início de bloco de funcionário (Código + Nome)
            name_match = re_name.match(line)
            if name_match:
                # Se já tínhamos um funcionário sendo processado, salva antes de iniciar novo
                if current_employee and 'nome' in current_employee:
                    employees.append(current_employee)
                current_employee = {'nome': name_match.group(2).strip()}
                continue
            
            # Captura CPF
            cpf_match = re_cpf.search(line)
            if cpf_match:
                current_employee['cpf'] = cpf_match.group(1)
                continue
            
            # Captura Centro de Custo (CC)
            cc_match = re_cc.search(line)
            if cc_match:
                current_employee['centro_custo'] = cc_match.group(1)
                continue
            
            # Captura valores financeiros
            liquido_match = re_liquido.search(line)
            if liquido_match:
                current_employee['salario_liquido'] = clean_currency(liquido_match.group(1))
                continue
            
            proventos_match = re_proventos.search(line)
            if proventos_match:
                current_employee['salario_bruto'] = clean_currency(proventos_match.group(1))
                continue
            
            descontos_match = re_descontos.search(line)
            if descontos_match:
                current_employee['total_descontos'] = clean_currency(descontos_match.group(1))
                continue
            
            # Captura Dados Bancários (se existirem na linha ou bloco)
            banco_match = re_banco.search(line)
            if banco_match:
                current_employee['banco'] = banco_match.group(1).strip()
            
            ag_match = re_agencia.search(line)
            if ag_match:
                current_employee['agencia'] = ag_match.group(1)
                
            cta_match = re_conta.search(line)
            if cta_match:
                current_employee['conta'] = cta_match.group(1)
        
        # Adiciona o último funcionário processado na página
        if current_employee and 'nome' in current_employee:
            employees.append(current_employee)
            current_employee = {}
    
    return pd.DataFrame(employees)

def parse_convenia_pdf(pdf_path: str):
    """
    Extrai dados do PDF do Convenia.
    """
    doc = fitz.open(pdf_path)
    employees = []
    
    # Regex Patterns
    re_name = re.compile(r'Nome:\s*([A-Z\s]+)')
    re_cpf = re.compile(r'CPF:\s*(\d{3}\.\d{3}\.\d{3}-\d{2})')
    re_cc = re.compile(r'Centro de Custo:\s*([A-Z\s]+)')
    
    # Regex para dados bancários
    re_banco = re.compile(r'Banco:\s*([A-Z\s]+)', re.IGNORECASE)
    re_agencia = re.compile(r'Agencia:\s*(\d+)')
    re_conta = re.compile(r'Conta:\s*([\d-]+)')
    
    for page in doc:
        text_lines = page.get_text("text").splitlines()
        
        current_employee = {}
        
        for line in text_lines:
            line = line.strip()
            
            # Captura Nome
            name_match = re_name.search(line)
            if name_match:
                current_employee['nome'] = name_match.group(1)
            
            # Captura CPF
            cpf_match = re_cpf.search(line)
            if cpf_match:
                current_employee['cpf'] = cpf_match.group(1)
            
            # Captura Centro de Custo
            cc_match = re_cc.search(line)
            if cc_match:
                current_employee['centro_custo'] = cc_match.group(1)
            
            # Captura Dados Bancários
            banco_match = re_banco.search(line)
            if banco_match:
                current_employee['banco'] = banco_match.group(1).strip()
            
            ag_match = re_agencia.search(line)
            if ag_match:
                current_employee['agencia'] = ag_match.group(1)
                
            cta_match = re_conta.search(line)
            if cta_match:
                current_employee['conta'] = cta_match.group(1)
        
        if current_employee:
            employees.append(current_employee)
    
    return pd.DataFrame(employees)

def generate_payroll_report(payroll_df: pd.DataFrame, convenia_df: pd.DataFrame, output_path: str):
    """
    Gera um relatório unificado da folha de pagamento.
    """
    # Mescla os DataFrames com base no CPF
    report_df = pd.merge(payroll_df, convenia_df, on='cpf', suffixes=('_payroll', '_convenia'))
    
    # Ordena as colunas conforme necessidade
    columns_order = ['nome', 'cpf', 'centro_custo', 'salario_bruto', 'total_descontos', 'salario_liquido', 'banco']
    report_df = report_df[columns_order]
    
    # Exporta para Excel
    report_df.to_excel(output_path, index=False)

# Exemplo de uso
if __name__ == "__main__":
    # Caminhos dos arquivos (exemplo)
    payroll_map_path = "caminho/para/mapa_da_folha.pdf"
    convenia_path = "caminho/para/convenia.pdf"
    output_path = "caminho/para/relatorio_folha_pagamento.xlsx"
    mes_referencia = "Janeiro/2023"
    
    # Processamento e geração do relatório
    payroll_df = parse_payroll_map(payroll_map_path)
    convenia_df = parse_convenia_pdf(convenia_path)
    
    # Usar AI para preencher dados faltantes e corrigir informações
    ai_processed_data = process_payroll_with_ai(payroll_map_path, convenia_path, mes_referencia)
    ai_df = pd.DataFrame(ai_processed_data)
    
    # Concatenar dados da AI com os dados originais
    final_payroll_df = pd.concat([payroll_df, ai_df]).drop_duplicates(subset='cpf', keep='last')
    
    # Gerar relatório final
    generate_payroll_report(final_payroll_df, convenia_df, output_path)
