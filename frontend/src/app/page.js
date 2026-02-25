'use client';
import dynamic from 'next/dynamic';

// Carregar o AuthWrapper inteiramente no lado do cliente
const AuthWrapper = dynamic(() => import('../components/AuthWrapper'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-screen">Carregando Sistema...</div>
});

export default function Home() {
  return <AuthWrapper />;
}
