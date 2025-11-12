import React from 'react';
import {
  BriefcaseIcon,
  ReportsIcon,
  ShieldIcon,
  SparkleIcon,
  TasksIcon,
  UsersIcon,
  DealsIcon,
  GiftIcon,
  MapIcon,
  LibraryIcon,
  ImageIcon,
  NetworkIcon,
  CogIcon,
  SearchCircleIcon,
  LinkIcon,
// FIX: Added file extension to import path
} from './icons/Icons.tsx';
// FIX: Added file extension to import path
import { NavigateFn, View, UserRole } from '../types.ts';
// FIX: Added file extension to import path

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentView: View;
  navigate: NavigateFn;
  userName: string;
  userRole: UserRole;
}


const mainNavItems: { view: View; icon: React.FC<{ className?: string }>; label: string }[] = [
  { view: 'Dashboard', icon: BriefcaseIcon, label: 'Dashboard' },
  { view: 'Prospecção', icon: MapIcon, label: 'Prospecção' },
  { view: 'Análise de Cliente', icon: SearchCircleIcon, label: 'Análise de Cliente' },
  { view: 'Vínculos', icon: LinkIcon, label: 'Vínculos' },
  { view: 'Negócios', icon: DealsIcon, label: 'Negócios' },
  { view: 'Tarefas', icon: TasksIcon, label: 'Tarefas' },
];

const secondaryNavItems: { view: View; icon: React.FC<{ className?: string }>; label: string }[] = [
    { view: 'Análises', icon: ReportsIcon, label: 'Análises e Relatórios' },
    { view: 'Equipe & Comunicação', icon: UsersIcon, label: 'Equipe & Comunicação' },
    { view: 'Indicações', icon: GiftIcon, label: 'Indicações' },
    { view: 'Compliance', icon: ShieldIcon, label: 'Compliance' },
    { view: 'Pesquisa de Mercado', icon: LibraryIcon, label: 'Pesquisa de Mercado' },
    { view: 'Editor de Imagens', icon: ImageIcon, label: 'Editor de Imagens' },
];

const adminNavItems: { view: View; icon: React.FC<{ className?: string }>; label: string }[] = [
    { view: 'Admin', icon: CogIcon, label: 'Administração' },
];


const NavLink: React.FC<{
    item: { view: View; icon: React.FC<{ className?: string }>; label: string };
    currentView: View;
  navigate: NavigateFn;
}> = ({ item, currentView, navigate }) => {
    const isActive = item.view === currentView || (item.view === 'Prospecção' && currentView === 'Vínculos');
    const Icon = item.icon;
    return (
        <a
            href="#"
            onClick={(e) => {
                e.preventDefault();
                navigate(item.view);
            }}
            className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
        >
            <Icon className="w-5 h-5 mr-3" />
            {item.label}
        </a>
    );
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen, currentView, navigate, userName, userRole }) => {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-gray-900/50 z-20 lg:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 border-r border-gray-700/50 z-30 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 lg:flex-shrink-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 border-b border-gray-700/50">
            <div className="flex items-center">
              <SparkleIcon className="w-8 h-8 text-indigo-400" />
              <span className="ml-2 text-xl font-bold text-white">Contta CRM</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white truncate">{userName}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{userRole}</p>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {mainNavItems.map((item) => (
                <NavLink key={item.view} item={item} currentView={currentView} navigate={navigate} />
            ))}
            <div className="pt-4 mt-4 space-y-1 border-t border-gray-700/50">
                {secondaryNavItems.map((item) => (
                    <NavLink key={item.view} item={item} currentView={currentView} navigate={navigate} />
                ))}
            </div>

            {userRole.toLowerCase() === 'admin' && (
                <div className="pt-4 mt-4 space-y-1 border-t border-gray-700/50">
                    <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase">Admin</p>
                    {adminNavItems.map((item) => (
                        <NavLink key={item.view} item={item} currentView={currentView} navigate={navigate} />
                    ))}
                </div>
            )}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;