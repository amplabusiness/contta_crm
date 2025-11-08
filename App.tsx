

import React, { useState, useCallback } from 'react';
// FIX: Added file extensions to imports
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import Dashboard from './components/Dashboard.tsx';
import Prospeccao from './components/Prospeccao.tsx';
import ImageEditor from './components/ImageEditor.tsx';
import Analytics from './components/Analytics.tsx';
import Compliance from './components/Compliance.tsx';
import Indicacoes from './components/Indicacoes.tsx';
import PesquisaMercado from './components/PesquisaMercado.tsx';
import Vinculos from './components/Vinculos.tsx';
import Negocios from './components/Negocios.tsx';
import Tarefas from './components/Tarefas.tsx';
import Equipe from './components/Equipe.tsx';
import Admin from './components/Admin.tsx';
import Chatbot from './components/Chatbot.tsx';
import VoiceAssistant from './components/VoiceAssistant.tsx';
import AnaliseCliente from './components/AnaliseCliente.tsx';
// FIX: Added file extension to import path.
import EmpresaDetalhe from './components/EmpresaDetalhe.tsx';

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

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [viewPayload, setViewPayload] = useState<any>(null);

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

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentView={currentView} navigate={navigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} navigate={navigate} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900/95">
          <div className="container mx-auto px-6 py-8">
            {renderView()}
          </div>
        </main>
      </div>
      <Chatbot />
      <VoiceAssistant />
    </div>
  );
};

export default App;