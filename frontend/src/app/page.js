'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
          setUser(currentUser);
        } else {
          setUser(currentUser);
          setUserData({ isApproved: false, isAdmin: false });
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;

  if (!user) {
    return <Login />;
  }

  if (!userData?.isApproved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">Acesso Pendente</h2>
          <p className="text-gray-600 mb-6">Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador para acessar o dashboard.</p>
          <button 
            onClick={() => signOut(auth)}
            className="text-blue-600 hover:underline font-medium"
          >
            Sair e tentar mais tarde
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard user={user} isAdmin={userData?.isAdmin} />;
}
