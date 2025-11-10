

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MenuIcon, SearchIcon, BellIcon, SparkleIcon, BriefcaseIcon, DealsIcon, TasksIcon, XIcon } from './icons/Icons.tsx';
import { View } from '../App.tsx';
import { GlobalSearchResults, GlobalSearchResultItem } from '../types.ts';
import { getIntelligentSearchParams } from '../services/geminiService.ts';
import { executeGlobalSearch } from '../services/apiService.ts';

interface HeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    navigate: (view: View, payload?: any) => void;
    userName: string;
    userEmail: string;
    organization: string;
    onSignOut: () => Promise<void> | void;
}

const SearchResultItem: React.FC<{ item: GlobalSearchResultItem; icon: React.FC<any>; onClick: () => void }> = ({ item, icon: Icon, onClick }) => (
    <button onClick={onClick} className="w-full text-left flex items-center gap-4 p-3 rounded-lg hover:bg-indigo-600/20 transition-colors">
        <div className="bg-gray-700/50 p-2 rounded-md">
            <Icon className="w-5 h-5 text-gray-300" />
        </div>
        <div>
            <p className="font-semibold text-white">{item.title}</p>
            <p className="text-xs text-gray-400">{item.description}</p>
        </div>
    </button>
);


const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen, navigate, userName, userEmail, organization, onSignOut }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeout = useRef<number | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const latestSearchIdRef = useRef(0);

    const handleSearch = useCallback(async (query: string) => {
        const normalizedQuery = query.trim();
        const requestId = latestSearchIdRef.current + 1;
        latestSearchIdRef.current = requestId;

        if (!normalizedQuery) {
            setSearchResults(null);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const searchParams = await getIntelligentSearchParams(normalizedQuery);
            const results = await executeGlobalSearch(searchParams);

            if (latestSearchIdRef.current === requestId) {
                setSearchResults(results);
            }
        } catch (error) {
            console.error("Global search failed:", error);
            if (latestSearchIdRef.current === requestId) {
                setSearchResults(null);
            }
        } finally {
            if (latestSearchIdRef.current === requestId) {
                setIsSearching(false);
            }
        }
    }, []);

    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = window.setTimeout(() => {
            handleSearch(searchQuery);
        }, 500); // 500ms debounce

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [searchQuery, handleSearch]);

    useEffect(() => {
        if (isSearchOpen) {
           setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isSearchOpen]);
    
    const closeSearch = () => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults(null);
    }
    
    const handleResultClick = (item: GlobalSearchResultItem) => {
        closeSearch();
        if (item.type === 'client') {
            navigate('Empresa Detalhe', item.payload);
        } else if (item.type === 'deal') {
            navigate('Negócios');
        } else if (item.type === 'task') {
            navigate('Tarefas');
        }
    };
    
    const totalResults = searchResults ? searchResults.clients.length + searchResults.deals.length + searchResults.tasks.length : 0;

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4f46e5&color=fff&bold=true`;

    return (
        <>
            <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 z-10">
                <div className="flex items-center justify-between h-16 px-4 md:px-6">
                    <div className="flex items-center">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 -ml-2 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white lg:hidden"
                            aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
                        >
                            <MenuIcon className="h-6 w-6" />
                        </button>
                        <div className="relative ml-4 hidden md:block">
                            <button onClick={() => setIsSearchOpen(true)} className="flex items-center text-left w-64 pl-4 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg group">
                                <SearchIcon className="w-5 h-5 text-gray-400 mr-3" />
                                <span className="text-gray-500 group-hover:text-gray-300 transition-colors">Busca inteligente...</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                                                <button
                                                    className="relative p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50"
                                                    aria-label="Ver notificações"
                                                >
                            <BellIcon className="w-6 h-6" />
                            <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900"></span>
                        </button>
                        <div className="flex items-center space-x-3">
                            <img
                            src={avatarUrl}
                            alt={userName}
                            className="w-10 h-10 rounded-full border-2 border-gray-600"
                            />
                            <div>
                            <div className="font-semibold text-white">{userName}</div>
                            <div className="text-xs text-gray-400">{organization}</div>
                            <div className="text-[10px] text-gray-500">{userEmail}</div>
                            </div>
                        </div>
                        <button
                          onClick={() => onSignOut()}
                          className="px-3 py-2 text-xs font-semibold text-gray-300 border border-gray-700 rounded-md hover:bg-gray-800 hover:text-white transition"
                        >
                          Sair
                        </button>
                    </div>
                </div>
            </header>

            {isSearchOpen && (
                <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-40" onClick={closeSearch}>
                    <div
                        className="bg-gray-800 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-2xl mx-auto mt-[10vh] transform transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                         <div className="p-4 border-b border-gray-700/50 flex items-center">
                            <SearchIcon className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Busque por clientes, negócios, tarefas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none"
                            />
                            <button onClick={closeSearch} className="p-1 text-gray-500 hover:text-white" aria-label="Fechar busca"><XIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {isSearching ? (
                                <div className="text-center py-10 text-gray-400">Buscando...</div>
                            ) : searchResults && totalResults > 0 ? (
                                <div className="space-y-4">
                                    {searchResults.clients.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Clientes</h3>
                                            {searchResults.clients.map(item => <SearchResultItem key={item.id} item={item} icon={BriefcaseIcon} onClick={() => handleResultClick(item)} />)}
                                        </div>
                                    )}
                                     {searchResults.deals.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Negócios</h3>
                                            {searchResults.deals.map(item => <SearchResultItem key={item.id} item={item} icon={DealsIcon} onClick={() => handleResultClick(item)} />)}
                                        </div>
                                    )}
                                     {searchResults.tasks.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Tarefas</h3>
                                            {searchResults.tasks.map(item => <SearchResultItem key={item.id} item={item} icon={TasksIcon} onClick={() => handleResultClick(item)} />)}
                                        </div>
                                    )}
                                </div>
                            ) : searchQuery && !isSearching ? (
                                <div className="text-center py-10 text-gray-500">Nenhum resultado encontrado para &quot;{searchQuery}&quot;.</div>
                            ) : (
                                <div className="text-center py-10 text-gray-500">
                                    <p>Busque em linguagem natural.</p>
                                    <p className="text-xs mt-1">Ex: &quot;tarefas urgentes para a tech solutions&quot;</p>
                                </div>
                            )}
                        </div>
                        <div className="p-2 bg-gray-900/50 border-t border-gray-700/50 text-right rounded-b-xl">
                            <span className="text-xs text-gray-400 flex items-center justify-end gap-1.5"><SparkleIcon className="w-4 h-4 text-indigo-400"/> Powered by Gemini</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
