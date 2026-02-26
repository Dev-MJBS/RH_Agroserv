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
