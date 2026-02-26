'use client';
import React, { useState } from 'react';
import axios from 'axios';
import { 
  Upload, FileText, Download, Check, AlertCircle, 
  MapPin, ShieldPlus, ChevronRight, BarChart3, Search, 
  Trash2, FileJson, LucideLoader2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PaymentsModule = ({ user, isAdmin }) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'view'
  const [loading, setLoading] = useState(false);
  const [mesReferencia, setMesReferencia] = useState('');
  const [files, setFiles] = useState({ convenia: null, payroll: null });
  const [data, setData] = useState(null); // Result from AI

  const handleFileDrop = (e, type) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleFileInput = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleProcess = async () => {
    if (!files.convenia || !files.payroll || !mesReferencia) {
      alert('Por favor, preencha o mês e envie ambos os arquivos.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('mes_referencia', mesReferencia);
    formData.append('payroll_map', files.payroll);
    formData.append('convenia_data', files.convenia);

    try {
      const token = await user.getIdToken();
      const response = await axios.post(`${API_URL}/processar-pagamentos`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log("Success:", response.data);
      setData(response.data);
      setActiveTab('view');
      alert('Dados processados com sucesso!');
    } catch (err) {
      console.error(err);
      
      let message = "Erro ao processar arquivos.";
      if (err.request) {
        const isHTTPS = window.location.protocol === 'https:';
        const isLocalAPI = API_URL.includes('localhost') || API_URL.includes('127.0.0.1');

        if (isHTTPS && isLocalAPI) {
          message = `ERRO DE SEGURANÇA (Mixed Content): Você está rodando o Frontend em HTTPS (Netlify) mas tentando acessar o Backend em HTTP (Local). 
          
Para corrigir:
1. Use o Frontend local (http://localhost:3000)
2. OU suba o Backend no Railway e atualize a URL no Netlify.`;
        } else {
          message = "Sem resposta do servidor. Verifique se o backend está ativo e configurado corretamente.";
        }
      } else if (err.response) {
         message = `Erro do Servidor (${err.response.status}): ${err.response.data?.detail || "Falha no processamento"}`;
      }
      
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data || !data.centros_de_custo) return;
    
    const headers = ['Funcionário', 'CPF', 'Centro de Custo', 'Líquido', 'Banco', 'Agência', 'Conta'];
    const rows = [];
    
    data.centros_de_custo.forEach(cc => {
      cc.funcionarios.forEach(f => {
        rows.push([
          f.nome,
          `"${f.cpf}"`,
          cc.nome,
          f.liquido,
          f.dados_bancarios?.banco || '',
          f.dados_bancarios?.agencia || '',
          f.dados_bancarios?.conta || ''
        ].join(','));
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `conciliacao_${mesReferencia.replace('/', '-')}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Módulo de Pagamentos</h2>
          <p className="text-gray-500 dark:text-slate-400">Conciliação inteligente entre Convenia e Folha.</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
          >
            Upload
          </button>
          <button 
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'view' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
          >
            Dados Conciliados
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border dark:border-slate-800 space-y-6">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <ShieldPlus className="text-blue-500" /> Coleta de Fontes
            </h3>
            
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold dark:text-slate-300">Mês de Referência (ex: 02/2026)</span>
                <input 
                  type="text" 
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  placeholder="MM/AAAA"
                  className="mt-1 w-full p-3 rounded-xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </label>

              {/* Convenia Upload */}
              <div 
                className={`relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${
                  files.convenia ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-slate-700 hover:border-blue-400'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFileDrop(e, 'convenia')}
              >
                {files.convenia ? (
                  <div className="text-center">
                    <Check className="text-green-500 mx-auto mb-2" size={32} />
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">{files.convenia.name}</p>
                  </div>
                ) : (
                  <div className="text-center group">
                    <Upload className="mx-auto mb-2 text-gray-400 group-hover:text-blue-500 transition-colors" size={32} />
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-400">PDF Convenia (Base Cadastral)</p>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileInput(e, 'convenia')} accept=".pdf" />
                  </div>
                )}
              </div>

              {/* Payroll Upload */}
              <div 
                className={`relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${
                  files.payroll ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-slate-700 hover:border-blue-400'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFileDrop(e, 'payroll')}
              >
                {files.payroll ? (
                  <div className="text-center">
                    <Check className="text-green-500 mx-auto mb-2" size={32} />
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">{files.payroll.name}</p>
                  </div>
                ) : (
                  <div className="text-center group">
                    <Upload className="mx-auto mb-2 text-gray-400 group-hover:text-blue-500 transition-colors" size={32} />
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-400">PDF Mapa da Folha (Valores)</p>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileInput(e, 'payroll')} accept=".pdf" />
                  </div>
                )}
              </div>

              <button 
                onClick={handleProcess}
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                  loading ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                }`}
              >
                {loading ? <LucideLoader2 className="animate-spin" /> : <BarChart3 size={20} />}
                {loading ? "Processando e Conciliando..." : "Processar e Conciliar"}
              </button>
            </div>
          </div>

          {/* Quick Help Section */}
          <div className="bg-blue-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-blue-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-4">
              <AlertCircle size={20} /> Lógica de Conciliação
            </h3>
            <ul className="space-y-4 text-sm text-blue-700 dark:text-slate-400">
              <li className="flex gap-3">
                <span className="font-bold">1.</span> 
                <p>Nossa IA lê os CPFs em ambos os documentos para garantir que os valores pagos no banco batam com o cadastro oficial.</p>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">2.</span> 
                <p>Os <b>Centros de Custo</b> (armazéns, setores) são extraídos da Convenia para alocação financeira precisa.</p>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">3.</span> 
                <p>A IA higieniza números, datas e categorias automaticamente.</p>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold dark:text-white">Relatório de Alocação Regional</h3>
             <button 
               onClick={exportCSV}
               disabled={!data}
               className="flex items-center gap-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
              >
               <Download size={18} /> Exportar CSV
             </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {data?.centros_de_custo?.map((cc, idx) => (
              <div key={idx} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                <p className="text-xs font-bold text-gray-500 uppercase">{cc.nome}</p>
                <p className="text-lg font-black text-gray-800 dark:text-white">
                  R$ {cc.funcionarios.reduce((sum, f) => sum + f.liquido, 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Detailed Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b dark:border-slate-800 text-gray-400 font-medium">
                <tr>
                  <th className="pb-3 px-2">Funcionário</th>
                  <th className="pb-3 px-2">Centro de Custo</th>
                  <th className="pb-3 px-2">Banco / Conta</th>
                  <th className="pb-3 px-2 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {data?.centros_de_custo?.map(cc => 
                  cc.funcionarios.map((f, fIdx) => (
                    <tr key={`${cc.nome}-${fIdx}`} className="dark:text-slate-300">
                      <td className="py-4 px-2 font-medium">{f.nome}</td>
                      <td className="py-4 px-2 uppercase">{cc.nome}</td>
                      <td className="py-4 px-2">
                        {f.dados_bancarios?.banco ? `${f.dados_bancarios.banco} · ${f.dados_bancarios.agencia}-${f.dados_bancarios.conta}` : '---'}
                      </td>
                      <td className="py-4 px-2 text-right font-bold text-blue-600 dark:text-blue-400">
                        R$ {f.liquido.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsModule;
