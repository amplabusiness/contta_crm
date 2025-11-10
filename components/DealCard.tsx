
import React, { useState, useCallback } from 'react';
import { Deal, DealHealth } from '../types.ts';
import { getDealHealth } from '../services/geminiService.ts';
import { SparkleIcon, ClockIcon } from './icons/Icons.tsx';

interface DealCardProps {
    deal: Deal;
    onOpenAssistant: (deal: Deal) => void;
    draggable?: boolean;
    onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
}

const DealCard: React.FC<DealCardProps> = ({ deal, onOpenAssistant, draggable = false, onDragStart, onDragEnd }) => {
    const [health, setHealth] = useState<DealHealth | null>(deal.health);
    const [loadingHealth, setLoadingHealth] = useState(false);
    const [errorHealth, setErrorHealth] = useState('');

    const handleGetHealth = useCallback(async () => {
        setLoadingHealth(true);
        setErrorHealth('');
        try {
            const healthData = await getDealHealth(deal);
            setHealth(healthData);
        } catch (error) {
            setErrorHealth('Falha ao analisar.');
            console.error(error);
        } finally {
            setLoadingHealth(false);
        }
    }, [deal]);

    const HealthAnalysis: React.FC = () => {
        if(loadingHealth) {
            return (
                <div className="flex items-center justify-center space-x-2 p-2">
                    <SparkleIcon className="w-4 h-4 text-indigo-400 animate-spin" />
                    <p className="text-xs text-gray-400">Analisando saúde...</p>
                </div>
            );
        }
        if (errorHealth) {
             return <p className="text-xs text-red-400 text-center p-2">{errorHealth}</p>;
        }
        if (health) {
            const normalizedScore = Math.min(Math.max(health.score, 0), 100);
            return (
                <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <svg className="w-full h-2" viewBox="0 0 100 8" role="presentation" aria-hidden="true">
                            <rect width="100" height="8" rx="4" fill="#374151" />
                            <rect width={normalizedScore} height="8" rx="4" fill="#22c55e" />
                        </svg>
                        <span className="font-bold text-white">{health.score}%</span>
                    </div>
                    <p><strong className="text-gray-300">Justificativa:</strong> {health.reasoning}</p>
                    <p className="text-indigo-300 bg-indigo-900/30 p-2 rounded-md"><strong>Ação Sugerida:</strong> {health.suggestedAction}</p>
                </div>
            );
        }
        return null;
    };


  return (
    <div
        className="bg-gray-800 p-4 rounded-lg border border-gray-700/80 shadow-md flex flex-col justify-between space-y-3"
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
    >
        <div>
            <h4 className="font-semibold text-white">{deal.companyName}</h4>
            <p className="text-sm text-gray-400">
                {deal.contactName?.trim() ? deal.contactName : 'Contato não informado'}
            </p>
            <p className="text-lg font-bold text-indigo-400 mt-2">
                {deal.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
        </div>
        <div className="text-xs text-gray-400 flex items-center">
            <ClockIcon className="w-4 h-4 mr-2"/>
            <span>
                Fecha em:{' '}
                {deal.expectedCloseDate
                    ? new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    : 'Sem previsão definida'}
            </span>
        </div>
        <div className="pt-3 border-t border-gray-700/50 space-y-2">
            <HealthAnalysis />
            <div className="flex gap-2">
                <button
                    onClick={handleGetHealth}
                    disabled={loadingHealth}
                    className="w-full flex items-center justify-center gap-2 bg-gray-700/50 text-gray-300 font-semibold py-2 px-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-xs disabled:opacity-50"
                >
                     <SparkleIcon className="w-4 h-4" />
                    Analisar Saúde
                </button>
                <button
                    onClick={() => onOpenAssistant(deal)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 text-indigo-300 font-semibold py-2 px-3 rounded-lg hover:bg-indigo-600/40 transition-colors duration-200 text-xs"
                >
                    Assistente
                </button>
            </div>
        </div>
    </div>
  );
};

export default DealCard;