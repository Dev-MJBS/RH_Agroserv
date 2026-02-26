'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Settings, LogOut, 
  Menu, X, Bell, Moon, Sun, Search, 
  LayoutDashboard, CreditCard, ChevronRight, 
  ShieldCheck, AlertCircle, FileText
} from 'lucide-react';
import Sidebar from './Sidebar';
import PaymentsModule from './PaymentsModule';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';

const Dashboard = ({ user, isAdmin }) => {
  const [activeModule, setActiveModule] = useState('home');
  const [pendingUsers, setPendingUsers] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingUsers();
    }
  }, [isAdmin]);

  const fetchPendingUsers = async () => {
    try {
      const q = query(collection(db, "users"), where("isApproved", "==", false));
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setPendingUsers(users);
    } catch (err) {
      console.error("Erro ao buscar usuários pendentes", err);
    }
  };

  const approveUser = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), { isApproved: true });
      fetchPendingUsers();
    } catch (err) {
      alert("Erro ao aprovar usuário");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'home':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                  Bem-vindo, {user.displayName || user.email.split('@')[0]} 👋
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  {isAdmin ? 'Painel Administrativo' : 'Painel de Usuário'} · RH Agroserv
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400 px-4 py-2 rounded-xl transition-all shadow-lg active:scale-95">
                  <Bell size={18} />
                </button>
              </div>
            </header>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div 
                onClick={() => setActiveModule('payments')}
                className="group cursor-pointer p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-blue-500/20 hover:-translate-y-1 transition-all"
              >
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <CreditCard size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">Processar Pagamentos</h3>
                <p className="text-blue-100 text-sm">Concilie arquivos Convenia e Folha via IA.</p>
                <div className="mt-6 flex items-center gap-2 font-bold text-sm">
                  Iniciar Módulo <ChevronRight size={16} />
                </div>
              </div>

              <div 
                onClick={() => isAdmin && setActiveModule('users')}
                className="p-6 bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="text-slate-600 dark:text-slate-400" size={24} />
                </div>
                <h3 className="text-xl font-bold dark:text-white mb-2">Funcionários</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie {isAdmin ? 'todos os' : 'seus'} registros cadastrais.</p>
                <div className="mt-6 flex items-center gap-2 font-bold text-sm text-slate-600 dark:text-slate-400">
                   {pendingUsers.length > 0 ? (
                     <span className="text-red-500 flex items-center gap-1">
                       <AlertCircle size={16} /> {pendingUsers.length} Aprovações Pendentes
                     </span>
                   ) : (
                     <span className="flex items-center gap-1">
                       0 Ativo(s) <ShieldCheck className="text-green-500" size={16} />
                     </span>
                   )}
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="text-slate-600 dark:text-slate-400" size={24} />
                </div>
                <h3 className="text-xl font-bold dark:text-white mb-2">Relatórios</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Acesse o histórico de conciliações anteriores.</p>
              </div>
            </div>

            {/* Pending Admin Actions if any */}
            {isAdmin && pendingUsers.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 p-6 rounded-3xl">
                <h4 className="font-bold text-red-900 dark:text-red-400 flex items-center gap-2 mb-4 uppercase text-xs tracking-widest">
                  <ShieldCheck size={18} /> Aprovações de Acesso
                </h4>
                <div className="space-y-3">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-white dark:bg-slate-800/50 p-3 rounded-xl border dark:border-slate-700">
                      <div>
                        <p className="font-bold text-sm dark:text-white">{u.email}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{u.role || 'Usuário Comum'}</p>
                      </div>
                      <button 
                        onClick={() => approveUser(u.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        Aprovar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications / Alerts Section */}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50 p-6 rounded-3xl flex items-start gap-4">
               <AlertCircle className="text-amber-600 dark:text-amber-500 shrink-0" size={24} />
               <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-400 uppercase text-xs tracking-wider">Atenção Administrativa</h4>
                  <p className="text-amber-800/80 dark:text-amber-400/80 text-sm mt-1">
                    Você está no ambiente de homologação. Todas as transações são simuladas no banco de dados SQLite local.
                  </p>
               </div>
            </div>
          </div>
        );
      case 'payments':
        return <PaymentsModule user={user} isAdmin={isAdmin} />;
      case 'users':
        return <div className="p-8 text-center text-gray-500">Módulo de Usuários em desenvolvimento...</div>;
      case 'settings':
        return <div className="p-8 text-center text-gray-400">Configurações do Sistema em desenvolvimento...</div>;
      default:
        return <div>Módulo não encontrado.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Dynamic Sidebar */}
      <Sidebar 
         activeId={activeModule} 
         onModuleChange={setActiveModule} 
         onLogout={handleLogout} 
         user={user}
      />

      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12">
        <div className="max-w-6xl mx-auto">
          {renderModule()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

      {isAdmin && (
        <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <p className="text-yellow-800 font-semibold mb-2">Painel de Administração</p>
          <button 
            onClick={() => setIsAdminModalOpen(true)}
            className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
          >
            <ShieldCheck size={18} /> Gerenciar Aprovações
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Users /></div>
            <div>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Total Colaboradores</p>
              <p className="text-2xl font-bold dark:text-white">{data.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg"><DollarSign /></div>
            <div>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Gasto Total</p>
              <p className="text-2xl font-bold dark:text-white">R$ {data.reduce((a, b) => a + b.salario_liquido, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg"><PieChartIcon /></div>
            <div>
              <p className="text-gray-500 dark:text-slate-400 text-sm">Centros de Custo</p>
              <p className="text-2xl font-bold dark:text-white">{[...new Set(data.map(d => d.centro_de_custo))].length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 h-80">
          <h3 className="font-bold mb-4 dark:text-white">Distribuição por Centro de Custo</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 h-80 overflow-y-auto">
          <h3 className="font-bold mb-4 dark:text-white">Volume Financeiro por Banco e CC</h3>
          <div className="space-y-4">
            {Object.entries(bankDataByCC).map(([cc, banks]) => (
              <div key={cc} className="border-b dark:border-slate-800 pb-2 last:border-0">
                <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-1 uppercase bg-gray-50 dark:bg-slate-800/50 px-2 py-1 rounded">{cc}</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(banks).map(([bank, total]) => (
                    <div key={bank} className="flex justify-between text-xs px-2">
                      <span className="text-gray-600 dark:text-slate-400">{bank}:</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">R$ {total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou centro de custo..." 
              className="pl-10 pr-4 py-2 border dark:border-slate-700 rounded-lg w-80 bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition"
          >
            <Download size={18} /> Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Funcionário</th>
                <th className="p-4 font-semibold text-gray-600">CPF</th>
                <th className="p-4 font-semibold text-gray-600">Centro de Custo</th>
                <th className="p-4 font-semibold text-gray-600">Banco</th>
                <th className="p-4 font-semibold text-gray-600">Salário</th>
                <th className="p-4 font-semibold text-gray-600">Mês</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(entry => (
                <tr key={entry.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="p-4">{entry.nome_funcionario}</td>
                  <td className="p-4">{entry.cpf}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                      {entry.centro_de_custo}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{entry.banco || '-'}</td>
                  <td className="p-4 font-medium">R$ {entry.salario_liquido.toLocaleString()}</td>
                  <td className="p-4 text-gray-500">{entry.mes_referencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[450px]">
            <h3 className="text-xl font-bold mb-4">Mapa da Folha - Extração</h3>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-1">Mês de Referência</label>
                <input 
                  type="month" 
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Mapa da Folha (PDF)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => setPayrollMapFile(e.target.files[0])}
                      className="hidden" 
                      id="payroll-map-upload"
                    />
                    <label htmlFor="payroll-map-upload" className="cursor-pointer">
                      <FileText className="mx-auto text-gray-400 mb-1" size={24} />
                      <p className="text-[10px] text-gray-600 truncate">{payrollMapFile ? payrollMapFile.name : 'Subir PDF'}</p>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Dados Convenia (PDF)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => setConveniaFile(e.target.files[0])}
                      className="hidden" 
                      id="convenia-upload"
                    />
                    <label htmlFor="convenia-upload" className="cursor-pointer">
                      <Users className="mx-auto text-gray-400 mb-1" size={24} />
                      <p className="text-[10px] text-gray-600 truncate">{conveniaFile ? conveniaFile.name : 'Subir PDF'}</p>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-gray-600 font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={!payrollMapFile || !conveniaFile || !mesReferencia || isUploading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {isUploading ? 'Processando...' : 'Iniciar Mapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Usuários */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-blue-600" />
                <h3 className="text-xl font-bold text-gray-800">Solicitações de Acesso</h3>
              </div>
              <button onClick={() => setIsAdminModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {pendingUsers.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Nenhuma solicitação pendente.</div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 border rounded-xl">
                      <div>
                        <p className="font-bold text-gray-800">{u.email}</p>
                        <p className="text-xs text-gray-400">Desde: {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveUser(u.id)} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700">
                          <Check size={18} />
                        </button>
                        <button onClick={() => deleteUser(u.id)} className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
