'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Login from './Login';
import Dashboard from './Dashboard';

export default function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setError(null);
        if (currentUser) {
          console.log("Usuário detectado:", currentUser.email);
          // Backdoor temporário para autorizar mjbs.dev@gmail.com como admin master
          const isMasterAdmin = (currentUser.email === "mjbs.dev@gmail.com");
          
          const userDocRef = doc(db, "users", currentUser.uid);
          let userDoc;
          
          try {
            userDoc = await getDoc(userDocRef);
          } catch (docErr) {
            console.error("Erro ao buscar documento:", docErr);
            throw new Error("Erro ao acessar Banco de Dados (Firestore). Verifique suas regras de segurança.");
          }
          
          let data;
          if (userDoc.exists()) {
            data = userDoc.data();
            console.log("Dados do usuário carregados:", data);
            // Se for o e-mail master, garante aprovação e admin
            if (isMasterAdmin && (!data.isApproved || !data.isAdmin)) {
              console.log("Configurando permissões MASTER para:", currentUser.email);
              data = { ...data, isApproved: true, isAdmin: true };
              await setDoc(userDocRef, data, { merge: true });
            }
          } else {
            console.log("Criando novo registro para administrador master...");
            // Primeiro login deste usuário
            data = { 
              email: currentUser.email,
              isApproved: isMasterAdmin, 
              isAdmin: isMasterAdmin,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, data);
          }
          
          setUserData(data);
          setUser(currentUser);
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (err) {
        console.error("Erro no AuthWrapper:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleSignOut = () => firebaseSignOut(auth);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600 dark:text-slate-400">Autenticando...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 dark:bg-slate-950 p-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-md text-center max-w-md border border-red-200 dark:border-red-900/30">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Erro de Inicialização</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">Tentar Novamente</button>
      </div>
    </div>
  );

  if (!user) return <Login />;

  if (!userData?.isApproved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-md text-center max-w-md border dark:border-slate-800">
          <h2 className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-4">Acesso Pendente</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6">Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador para acessar o dashboard.</p>
          <button onClick={handleSignOut} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Sair</button>
        </div>
      </div>
    );
  }

  return <Dashboard user={user} isAdmin={userData?.isAdmin} />;
}
