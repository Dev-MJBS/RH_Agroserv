'use client';
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log("Iniciando autenticação para:", email);
    
    try {
      if (isLogin) {
        console.log("Tentando entrar...");
        const result = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login realizado com sucesso!", result.user.email);
      } else {
        console.log("Criando nova conta...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log("Criando documento no Firestore...");
        // Criar registro pendente no Firestore
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          isApproved: false,
          isAdmin: false,
          createdAt: new Date().toISOString()
        });
        
        console.log("Documento criado!");
        alert("Conta criada! Aguarde a aprovação do administrador.");
        setIsLogin(true);
      }
    } catch (err) {
      console.error("Firebase Auth Error Full Details:", err);
      if (err.code === 'auth/user-not-found') setError('Usuário não encontrado. Você já criou sua conta?');
      else if (err.code === 'auth/wrong-password') setError('Senha incorreta.');
      else if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso.');
      else if (err.code === 'auth/weak-password') setError('A senha deve ter pelo menos 6 caracteres.');
      else if (err.code === 'auth/invalid-api-key') setError('API Key inválida. Verifique se as variáveis no Netlify estão salvas.');
      else if (err.code === 'auth/network-request-failed') setError('Erro de rede. Verifique sua internet.');
      else setError(`Erro: ${err.message || 'Verifique se você preencheu tudo corretamente'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="p-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md border dark:border-slate-800">
        <h2 className="text-3xl font-extrabold mb-2 text-center text-blue-800 dark:text-blue-400">Agroserv AI</h2>
        <p className="text-gray-600 dark:text-slate-400 text-center mb-8">
          {isLogin ? 'Entre na sua conta' : 'Crie sua conta corporativa'}
        </p>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-gray-700 dark:text-slate-200 text-sm font-semibold mb-1">E-mail Corporativo</label>
            <input
              type="email"
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="exemplo@agroserv.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-slate-200 text-sm font-semibold mb-1">Senha</label>
            <input
              type="password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-bold py-3 rounded-lg shadow-md transform active:scale-[0.98] transition-all ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-gray-600 dark:text-slate-400">
            {isLogin ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
              className="ml-2 text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              {isLogin ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
