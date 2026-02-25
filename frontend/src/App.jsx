import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
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
          // Caso a conta exista no Auth mas não no Firestore
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

  // Tela de aguardando aprovação
  const WaitingScreen = () => (
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

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <Login />} 
          />
          <Route 
            path="/dashboard" 
            element={
              user ? (
                userData?.isApproved ? (
                  <Dashboard user={user} isAdmin={userData?.isAdmin} />
                ) : (
                  <WaitingScreen />
                )
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
