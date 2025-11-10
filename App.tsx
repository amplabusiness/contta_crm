import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext.tsx';
import { supabase } from './services/supabaseClient.ts';
// FIX: Added file extensions to imports
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import Dashboard from './components/Dashboard.tsx';
import LoginView from './components/auth/LoginView.tsx';
import ForgotPasswordView from './components/auth/ForgotPasswordView.tsx';
import ResetPasswordView from './components/auth/ResetPasswordView.tsx';

// 🚀 LAZY LOADING: Componentes pesados carregados sob demanda
const Prospeccao = lazy(() => import('./components/Prospeccao.tsx'));
const ImageEditor = lazy(() => import('./components/ImageEditor.tsx'));
const Analytics = lazy(() => import('./components/Analytics.tsx'));
const Compliance = lazy(() => import('./components/Compliance.tsx'));
const Indicacoes = lazy(() => import('./components/Indicacoes.tsx'));
const PesquisaMercado = lazy(() => import('./components/PesquisaMercado.tsx'));
const Vinculos = lazy(() => import('./components/Vinculos.tsx'));
const Negocios = lazy(() => import('./components/Negocios.tsx'));
const Tarefas = lazy(() => import('./components/Tarefas.tsx'));
const Equipe = lazy(() => import('./components/Equipe.tsx'));
const Admin = lazy(() => import('./components/Admin.tsx'));
const Chatbot = lazy(() => import('./components/Chatbot.tsx'));
const VoiceAssistant = lazy(() => import('./components/VoiceAssistant.tsx'));
const AnaliseCliente = lazy(() => import('./components/AnaliseCliente.tsx'));
const EmpresaDetalhe = lazy(() => import('./components/EmpresaDetalhe.tsx'));

import { Empresa } from './types.ts';

export type View =
  | 'Dashboard'
  | 'Prospecção'
  | 'Negócios'
  | 'Tarefas'
  | 'Análises'
  | 'Análise de Cliente'
  | 'Indicações'
  | 'Compliance'
  | 'Pesquisa de Mercado'
  | 'Editor de Imagens'
  | 'Vínculos'
  | 'Empresa Detalhe'
  | 'Equipe & Comunicação'
  | 'Admin';

type AuthView = 'login' | 'forgot-password' | 'reset-password';

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [viewPayload, setViewPayload] = useState<any>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  
  // 🚧 MODO DEV: Bypass temporário de autenticação
  const [devMode, setDevMode] = useState(false); // Mude para true se precisar bypass

  // Detectar se o usuário veio de um link de recuperação de senha
  useEffect(() => {
    const checkPasswordRecovery = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery') {
        setIsPasswordRecovery(true);
        setAuthView('reset-password');
      }
    };

    checkPasswordRecovery();
  }, []);

  const navigate = useCallback((view: View, payload?: any) => {
    setCurrentView(view);
    setViewPayload(payload);
    window.scrollTo(0, 0);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Prospecção':
        return <Prospeccao navigate={navigate} />;
      case 'Vínculos':
        return <Vinculos empresa={viewPayload as Empresa} navigate={navigate} />;
      case 'Empresa Detalhe':
        return <EmpresaDetalhe empresa={viewPayload as Empresa} navigate={navigate} />;
      case 'Análise de Cliente':
        return <AnaliseCliente />;
      case 'Editor de Imagens':
        return <ImageEditor />;
      case 'Análises':
        return <Analytics />;
      case 'Compliance':
        return <Compliance />;
      case 'Indicações':
        return <Indicacoes />;
      case 'Pesquisa de Mercado':
        return <PesquisaMercado />;
      case 'Negócios':
        return <Negocios navigate={navigate} />;
      case 'Tarefas':
        return <Tarefas />;
      case 'Equipe & Comunicação':
        return <Equipe />;
      case 'Admin':
          return <Admin />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (!user && !devMode) {
    // Se está em modo de recuperação de senha, mostrar tela de reset
    if (isPasswordRecovery) {
      return (
        <ResetPasswordView 
          onBackToLogin={() => {
            setIsPasswordRecovery(false);
            setAuthView('login');
            window.location.hash = '';
          }} 
        />
      );
    }

    // Fluxo normal de autenticação
    switch (authView) {
      case 'forgot-password':
        return <ForgotPasswordView onBackToLogin={() => setAuthView('login')} />;
      case 'reset-password':
        return (
          <ResetPasswordView 
            onBackToLogin={() => {
              setAuthView('login');
              window.location.hash = '';
            }} 
          />
        );
      case 'login':
      default:
        return <LoginView onForgotPassword={() => setAuthView('forgot-password')} />;
    }
  }

  // 🚧 MODO DEV: Dados fictícios para bypass de autenticação
  const displayName = devMode 
    ? 'Usuário Dev (Modo Teste)'
    : (user?.user_metadata as Record<string, any>)?.full_name ||
      user?.email?.split('@')[0] ||
      'Usuário';

  const organization = devMode 
    ? 'Contta CRM - Desenvolvimento' 
    : (user?.user_metadata as Record<string, any>)?.organization ?? 'Contta CRM';
    
  const userRole = devMode 
    ? 'Admin' 
    : ((user?.user_metadata as Record<string, any>)?.role ?? 'Admin') as string;
  
  const userEmail = devMode 
    ? 'dev@conttacrm.com' 
    : user?.email ?? '';

  const handleSignOut = devMode 
    ? () => {
        setDevMode(false);
        window.location.reload();
      }
    : signOut;

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentView={currentView}
        navigate={navigate}
        userName={displayName}
        userRole={userRole}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          navigate={navigate}
          userName={displayName}
          userEmail={userEmail}
          organization={organization}
          onSignOut={handleSignOut}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900/95">
          <div className="container mx-auto px-6 py-8">
            <Suspense fallback={
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  <p className="text-sm text-gray-400">Carregando módulo...</p>
                </div>
              </div>
            }>
              {renderView()}
            </Suspense>
          </div>
        </main>
      </div>
      <Suspense fallback={null}>
        <Chatbot />
        <VoiceAssistant />
      </Suspense>
    </div>
  );
};

export default App;