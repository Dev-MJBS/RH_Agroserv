'use client';
import React, { useState, useEffect } from 'react';
import { 
  Menu, ChevronLeft, ChevronRight, LogOut, Sun, Moon, 
  LayoutDashboard, CreditCard, Users, Settings, BarChart3
} from 'lucide-react';

const Sidebar = ({ activeId, onModuleChange, onLogout, user }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Sync inner dark mode state with document
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const modules = [
    { id: 'home', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'payments', name: 'Pagamentos', icon: <CreditCard size={20} /> },
    { id: 'users', name: 'Usuários', icon: <Users size={20} />, adminOnly: true },
    { id: 'settings', name: 'Ajustes', icon: <Settings size={20} /> },
  ];

  return (
    <div 
      className={`relative h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 z-50 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Header / Logo */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <BarChart3 size={22} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-800 dark:text-white leading-tight">RH AGROSERV</span>
              <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Automation AI</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <BarChart3 size={20} />
          </div>
        )}
      </div>

      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white dark:bg-slate-800 border dark:border-slate-700 p-1.5 rounded-full shadow-md text-slate-400 hover:text-blue-500 transition-all z-[60]"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 mt-10">
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => onModuleChange(mod.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
              activeId === mod.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-500'
            }`}
          >
            <div className={`${activeId === mod.id ? 'scale-110' : ''} transition-transform`}>
              {mod.icon}
            </div>
            {!isCollapsed && <span className="font-bold text-sm tracking-tight">{mod.name}</span>}
          </button>
        ))}
      </nav>

      {/* Footer Info / User */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
        {!isCollapsed && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex items-center gap-3 border dark:border-slate-700">
             <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
               {user?.email[0].toUpperCase()}
             </div>
             <div className="flex flex-col overflow-hidden">
               <span className="text-xs font-bold dark:text-slate-200 truncate">{user?.email}</span>
               <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Conectado</span>
             </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-4 p-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
          >
            {darkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}
            {!isCollapsed && <span className="font-bold text-sm">Tema: {darkMode ? 'Claro' : 'Escuro'}</span>}
          </button>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-4 p-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all"
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="font-bold text-sm">Sair da Conta</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

