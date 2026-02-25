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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Backdoor temporário para autorizar mjbs.dev@gmail.com como admin master
          const isMasterAdmin = (currentUser.email === "mjbs.dev@gmail.com");
          
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let data;
          if (userDoc.exists()) {
            data = userDoc.data();
            // Se for o e-mail master, garante aprovação e admin
            if (isMasterAdmin && (!data.isApproved || !data.isAdmin)) {
              data = { ...data, isApproved: true, isAdmin: true };
              await setDoc(userDocRef, data, { merge: true });
            }
          } else {
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
      } catch (error) {
        console.error("Erro no AuthWrapper:", error);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleSignOut = () => firebaseSignOut(auth);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;

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
