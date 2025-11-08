
import React, { useState, useCallback } from 'react';
import { getSalesInsights, getMarketInsightsWithSearch } from '../services/geminiService.ts';
// FIX: Added file extensions to import paths.
import { SparkleIcon, SearchIcon } from './icons/Icons.tsx';
import { SalesData, DealStageData, MarketInsightResult } from '../types.ts';

interface AIAssistantProps {
  crmData: {
    salesChartData: SalesData[];
    dealStageData: DealStageData[];
  };
}

const AIAssistant: React.FC<AIAssistantProps> = ({ crmData }) => {
  const [insights, setInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [errorInsights, setErrorInsights] = useState('');

  const [marketQuery, setMarketQuery] = useState('');
  const [marketResult, setMarketResult] = useState<MarketInsightResult | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [errorMarket, setErrorMarket] = useState('');

  const handleGenerateInsights = useCallback(async () => {
    setLoadingInsights(true);
    setErrorInsights('');
    setInsights('');
    try {
      const generatedInsights = await getSalesInsights(crmData);
      setInsights(generatedInsights);
    } catch (e) {
      setErrorInsights('Falha ao gerar insights. Por favor, tente novamente.');
      console.error(e);
    } finally {
      setLoadingInsights(false);
    }
  }, [crmData]);

  const handleMarketSearch = useCallback(async () => {
    if (!marketQuery) return;
    setLoadingMarket(true);
    setErrorMarket('');
    setMarketResult(null);
    try {
      const result = await getMarketInsightsWithSearch(marketQuery);
      setMarketResult(result);
    } catch (e: any) {
      setErrorMarket('Falha ao pesquisar. Por favor, tente novamente.');
      console.error(e);
    } finally {
      setLoadingMarket(false);
    }
  }, [marketQuery]);

  const renderInsightsContent = () => {
    if (loadingInsights) {
      return (
        <div className="flex items-center justify-center space-x-2 p-4">
          <SparkleIcon className="w-5 h-5 text-indigo-400 animate-pulse" />
          <p className="text-sm text-gray-400">Gerando insights...</p>
        </div>
      );
    }
    if (errorInsights) {
      return <p className="text-sm text-red-400 p-4">{errorInsights}</p>;
    }
    if (insights) {
        return (
            <div className="text-sm text-gray-300 p-4 prose prose-invert prose-sm max-w-none"
                 dangerouslySetInnerHTML={{ __html: insights.replace(/\n/g, '<br />') }} />
        );
    }
    return (
        <div className="p-4 text-center">
            <p className="text-sm text-gray-400">Clique no botão para obter insights dos seus dados de vendas atuais.</p>
        </div>
    );
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg">
      {/* Sales Insights Section */}
      <div className="p-4 border-b border-gray-700/50 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <SparkleIcon className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Assistente de Vendas AI</h3>
        </div>
      </div>
      <div className="min-h-[150px]">{renderInsightsContent()}</div>
      <div className="p-4 border-t border-gray-700/50">
        <button
          onClick={handleGenerateInsights}
          disabled={loadingInsights}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors duration-200 disabled:bg-indigo-800 disabled:cursor-not-allowed"
        >
           {loadingInsights ? 'Analisando...' : 'Gerar Insights dos Dados'}
        </button>
      </div>

      {/* Market Research Section */}
      <div className="p-4 border-t border-gray-700/50">
         <div className="flex items-center space-x-2 mb-4">
          <SearchIcon className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Pesquisa de Mercado</h3>
        </div>
        <div className="space-y-4">
            <textarea
                value={marketQuery}
                onChange={(e) => setMarketQuery(e.target.value)}
                rows={2}
                placeholder="Ex: Tendências de vendas para o setor de tecnologia em 2024"
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
                onClick={handleMarketSearch}
                disabled={loadingMarket || !marketQuery}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors duration-200 disabled:bg-indigo-800 disabled:cursor-not-allowed"
            >
                <SearchIcon className="w-4 h-4" />
                {loadingMarket ? 'Pesquisando...' : 'Pesquisar na Web'}
            </button>
        </div>
        {loadingMarket && <p className="text-sm text-center text-gray-400 mt-4">Buscando informações atualizadas...</p>}
        {errorMarket && <p className="text-sm text-red-400 p-4 text-center">{errorMarket}</p>}
        {marketResult && (
            <div className="mt-4 text-sm text-gray-300 prose prose-invert prose-sm max-w-none">
                 <div dangerouslySetInnerHTML={{ __html: marketResult.text.replace(/\n/g, '<br />') }} />
                 {marketResult.sources.length > 0 && (
                     <div className="mt-4 pt-2 border-t border-gray-700">
                         <h4 className="font-semibold text-gray-400 text-xs">FONTES:</h4>
                         <ul className="list-disc pl-5 space-y-1 mt-2">
                             {marketResult.sources.map(source => (
                                 <li key={source.uri}>
                                     <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all">{source.title || source.uri}</a>
                                 </li>
                             ))}
                         </ul>
                     </div>
                 )}
            </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;