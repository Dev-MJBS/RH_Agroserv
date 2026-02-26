'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, UserPlus, Table, CheckCircle, AlertCircle, 
  Search, Filter, MoreVertical, Trash2, Edit2, 
  Download, FileSpreadsheet, LucideLoader2, Check
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const EmployeesModule = ({ user }) => {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'import'
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Carregar funcionários ao montar o componente
  useEffect(() => {
    if (activeTab === 'list') {
      fetchEmployees();
    }
  }, [activeTab]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      if (!user) throw new Error("AUTH_REQUIRED");
      const token = await user.getIdToken().catch(e => {
        console.error("Firebase auth error:", e);
        throw new Error("AUTH_TOKEN_FAILED");
      });

      const response = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000 // Adiciona timeout para falhar rápido se offline
      });
      setEmployees(response.data);
    } catch (err) {
      console.error("Erro ao buscar funcionários:", err);
      
      let message = "Erro inesperado.";
      
      if (err.message === "AUTH_REQUIRED") {
        message = "Usuário não autenticado. Faça login novamente.";
      } else if (err.message === "AUTH_TOKEN_FAILED") {
        message = "Sua sessão expirou ou o domínio não está autorizado no Firebase Console.";
      } else if (err.response) {
        // Erro do backend (404, 500, etc)
        message = `Falha no Servidor (${err.response.status}): ${err.response.data?.detail || "Erro desconhecido"}`;
      } else if (err.request) {
        // Sem resposta (CORS ou IP bloqueado)
        message = `Servidor Offline/Bloqueado: Verifique se o Backend está rodando e se o domínio está em Authorized Domains.`;
      } else {
        message = err.message;
      }
      
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) return;

    setLoading(true);
    setImportResult(null); // Limpa resultados anteriores
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const token = await user.getIdToken();
      const response = await axios.post(`${API_URL}/employees/import`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // Imports podem demorar
      });
      
      const result = response.data;
      setImportResult(result);

      if (result.status === 'success') {
        if (result.code === 'PARTIAL_SUCCESS') {
          alert(`Importação concluída com avisos: ${result.imported} sucessos, ${result.row_errors?.length || 0} erros.`);
        } else {
          alert(`Sucesso! ${result.imported} funcionários importados.`);
          setActiveTab('list');
        }
      } else {
        // Erro identificado pelo backend com código
        console.error("Erro na importação:", result);
      }
    } catch (err) {
      console.error("Erro na importação:", err);
      let message = "Erro na comunicação.";
      
      if (err.response) {
        message = `Erro do Servidor (${err.response.status}): ${err.response.data?.detail || "Falha no backend"}`;
      } else if (err.request) {
        message = "Sem resposta do servidor (Offline/Timeout/CORS).";
      }
      
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (cpf, newStatus) => {
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('new_status', newStatus);

      await axios.patch(`${API_URL}/employees/${cpf}/status`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Atualizar lista local
      setEmployees(employees.map(emp => 
        emp.cpf === cpf ? { ...emp, status: newStatus } : emp
      ));
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cpf?.includes(searchTerm)
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'ATIVO': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'AGUARDANDO': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'INATIVO': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestão de Funcionários</h2>
          <p className="text-gray-500 dark:text-slate-400">Administre o cadastro e dados bancários dos colaboradores.</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
          >
            <Table size={18} /> Base Cadastral
          </button>
          <button 
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${activeTab === 'import' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
          >
            <Upload size={18} /> Importar Planilha
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors">
              <Filter size={18} /> Filtrar
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-sm uppercase font-bold">
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">CPF</th>
                  <th className="px-6 py-4">Dados Bancários</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800 text-gray-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <LucideLoader2 className="animate-spin mx-auto mb-2 text-blue-500" size={32} />
                      Carregando base de dados...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      Nenhum funcionário encontrado. {searchTerm && "Tente outro termo de busca."}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.cpf} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{emp.full_name}</div>
                        <div className="text-xs text-gray-500">{emp.email || 'Sem e-mail'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">{emp.cpf}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {emp.bank_info?.bank_code && (
                            <span>{emp.bank_info.bank_code} • Ag {emp.bank_info.agency} • Cta {emp.bank_info.account_number}</span>
                          )}
                          {emp.bank_info?.pix_key && (
                            <div className="text-blue-500 text-xs mt-1">PIX: {emp.bank_info.pix_key}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(emp.status)}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {emp.status !== 'ATIVO' && (
                          <button 
                            onClick={() => updateStatus(emp.cpf, 'ATIVO')}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Ativar"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {emp.status !== 'INATIVO' && (
                          <button 
                            onClick={() => updateStatus(emp.cpf, 'INATIVO')}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Inativar"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-8 py-8">
          <div className="text-center space-y-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <FileSpreadsheet className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <h3 className="text-xl font-bold dark:text-white">Importação Massiva de Dados</h3>
            <p className="text-gray-500 dark:text-slate-400">
              Arraste sua planilha (.xlsx ou .csv) ou selecione um arquivo. 
              O sistema identificará automaticamente as colunas de Nome, CPF e Dados Bancários.
            </p>
          </div>

          <div 
            className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
              importFile ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-slate-800 hover:border-blue-500'
            }`}
          >
            {importFile ? (
              <div className="space-y-4">
                <Check className="mx-auto text-green-500" size={48} />
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{importFile.name}</p>
                <button 
                  onClick={() => setImportFile(null)}
                  className="text-sm text-gray-500 hover:underline"
                >
                  Selecionar outro arquivo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="mx-auto text-gray-400" size={48} />
                <p className="text-gray-600 dark:text-slate-400 font-medium">Arraste aqui ou clique para buscar</p>
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept=".csv, .xlsx, .xls"
                />
              </div>
            )}
          </div>

          <button 
            onClick={handleImport}
            disabled={!importFile || loading}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              !importFile || loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
            }`}
          >
            {loading ? <LucideLoader2 className="animate-spin" /> : <Download size={20} />}
            {loading ? "Processando Planilha..." : "Iniciar Importação"}
          </button>

          {/* Área de diagnóstico de erros */}
          {importResult && importResult.status === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-2xl animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 font-bold mb-2">
                <AlertCircle size={24} />
                <span>Erro na Importação: {importResult.code}</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">{importResult.message}</p>
              
              {importResult.available_columns && (
                <div className="mt-2 text-xs">
                  <span className="font-bold">Colunas encontradas no seu arquivo:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {importResult.available_columns.map(col => (
                      <span key={col} className="bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded italic">"{col}"</span>
                    ))}
                  </div>
                </div>
              )}

              {importResult.row_errors && importResult.row_errors.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-bold block mb-1">Detalhes dos erros (Top 5):</span>
                  <ul className="text-xs space-y-1">
                    {importResult.row_errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="text-red-500">• {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {importResult && importResult.status === 'success' && importResult.code === 'PARTIAL_SUCCESS' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-6 rounded-2xl">
              <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400 font-bold mb-2">
                <AlertCircle size={24} />
                <span>Importação Parcial (Sucesso: {importResult.imported})</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Algumas linhas continham erros e foram puladas:</p>
              <ul className="mt-2 text-xs space-y-1">
                {importResult.row_errors.slice(0, 5).map((err, i) => (
                  <li key={i} className="text-yellow-600">• {err.row}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 p-6 rounded-2xl">
            <h4 className="flex items-center gap-2 font-bold mb-4 text-blue-800 dark:text-blue-300">
              <AlertCircle size={18} /> Requisitos Recomendados
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2 list-disc pl-5">
              <li>Colunas identificáveis: <strong>Nome, CPF, Banco, Agencia, Conta</strong></li>
              <li>CPFs devem estar formatados de forma legível (com ou sem pontuação)</li>
              <li>O sistema não sobrescreve dados existentes sem necessidade (Merge Inteligente)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesModule;
