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
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat relative" 
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}>
      
      {/* Overlay para escurecer a imagem e melhorar o contraste */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-transparent to-black/60 backdrop-blur-[2px]"></div>

      <div className="relative z-10 p-10 bg-white/10 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-md border border-white/20 dark:border-white/10 mt-10 mb-10">
        <div className="text-center mb-10">
           <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-600 rounded-3xl mb-6 shadow-xl shadow-emerald-900/40 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="text-white text-4xl font-extrabold relative z-10">A</span>
           </div>
           <h2 className="text-4xl font-black text-white drop-shadow-2xl tracking-tight text-center">Agroserv AI</h2>
           <div className="h-1 w-12 bg-emerald-500 mx-auto mt-3 rounded-full"></div>
           <p className="text-emerald-50 text-lg font-medium opacity-90 mt-4 leading-tight text-center">
             {isLogin ? 'O futuro da gestão rural chegou' : 'Junte-se à revolução agrotech'}
           </p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-xl p-4 mb-8 flex items-center gap-3 animate-shake">
            <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
            <p className="text-red-100 text-sm font-semibold">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="block text-emerald-50 text-sm font-bold ml-1 opacity-80 uppercase tracking-wider">E-mail Corporativo</label>
            <input
              type="email"
              className="w-full px-5 py-4 bg-white/10 border border-white/20 text-white placeholder-emerald-100/40 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all backdrop-blur-md"
              placeholder="exemplo@agroserv.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-emerald-50 text-sm font-bold ml-1 opacity-80 uppercase tracking-wider">Senha</label>
            <input
              type="password"
              className="w-full px-5 py-4 bg-white/10 border border-white/20 text-white placeholder-emerald-100/40 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all backdrop-blur-md"
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
            className={`w-full group relative overflow-hidden text-white font-black text-lg py-4 rounded-2xl shadow-2xl transition-all active:scale-[0.97] mb-4 ${loading ? 'bg-emerald-800' : 'bg-emerald-600 hover:bg-emerald-500'}`}
          >
            <div className={`absolute inset-0 bg-white/20 transition-transform duration-500 rounded-2xl ${loading ? 'animate-pulse' : 'translate-x-[-100%] group-hover:translate-x-0'}`}></div>
            <span className="relative z-10 text-center w-full block">{loading ? 'CONECTANDO...' : (isLogin ? 'ENTRAR NO SISTEMA' : 'SOLICITAR ACESSO')}</span>
          </button>
        </form>
        
        <div className="mt-8 text-center pt-6 border-t border-white/10">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-100 hover:text-white transition-colors text-sm font-bold tracking-wide uppercase"
            disabled={loading}
          >
            {isLogin ? (
              <span className="opacity-80">Novo por aqui? <span className="text-emerald-400 border-b border-emerald-400/30">Criar uma conta</span></span>
            ) : (
              <span className="opacity-80">Já tem acesso? <span className="text-emerald-400 border-b border-emerald-400/30">Voltar ao Login</span></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
