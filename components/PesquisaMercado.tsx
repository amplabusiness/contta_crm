

import React, { useState, useCallback } from 'react';
import { getMarketInsightsWithSearch } from '../services/geminiService.ts';
// FIX: Added file extensions to import paths.
import { MarketInsightResult } from '../types.ts';
import { LibraryIcon, SearchIcon } from './icons/Icons.tsx';

const PesquisaMercado: React.FC = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<MarketInsightResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = useCallback(async () => {
        if (!query) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const searchResult = await getMarketInsightsWithSearch(query);
            setResult(searchResult);
        } catch (e: any) {
            setError('Falha ao realizar a pesquisa. Por favor, tente novamente mais tarde.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [query]);

    const renderResultContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center p-10 text-center text-gray-400">
                    <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-lg">A IA está pesquisando na web...</p>
                    <p className="text-sm text-gray-500">Isso pode levar alguns instantes.</p>
                </div>
            );
        }

        if (error) {
            return <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>;
        }
        
        if (result) {
            return (
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg mt-6">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Resultados da Pesquisa</h2>
                        <div
                            className="prose prose-invert prose-sm max-w-none text-gray-300"
                            dangerouslySetInnerHTML={{ __html: result.text.replace(/\n/g, '<br />') }}
                        />
                    </div>
                    {result.sources.length > 0 && (
                        <div className="p-6 border-t border-gray-700/50">
                            <h3 className="text-lg font-semibold text-gray-300">Fontes</h3>
                            <ul className="list-disc pl-5 space-y-2 mt-3">
                                {result.sources.map((source, index) => (
                                    <li key={index}>
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline break-all">
                                            {source.title || source.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="text-center p-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl mt-6">
                <LibraryIcon className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400">Seus resultados de pesquisa aparecerão aqui.</h3>
                <p className="mt-1 text-sm">Faça uma pergunta para começar.</p>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <LibraryIcon className="w-8 h-8 text-indigo-400" />
                    Pesquisa de Mercado com IA
                </h1>
                <p className="mt-1 text-gray-400">
                    Obtenha insights estratégicos e análises de mercado sob demanda, com fontes da web em tempo real.
                </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-xl shadow-lg space-y-4">
                <label htmlFor="market-query" className="block text-sm font-medium text-gray-300">
                    Qual é a sua dúvida ou tópico de pesquisa?
                </label>
                <textarea
                    id="market-query"
                    rows={4}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: Análise do mercado de contabilidade para startups de tecnologia no Brasil em 2024"
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                    onClick={handleSearch}
                    disabled={loading || !query}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-500 transition-colors duration-200 disabled:bg-indigo-800/50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    <SearchIcon className="w-5 h-5" />
                    {loading ? 'Pesquisando...' : 'Pesquisar com IA'}
                </button>
            </div>

            {renderResultContent()}

        </div>
    );
};

export default PesquisaMercado;