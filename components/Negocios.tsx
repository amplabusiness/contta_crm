import React, { useState, useEffect, useMemo } from 'react';
import { fetchDeals } from '../services/apiService.ts';
import { Deal, DealStage } from '../types.ts';
import { DealsIcon } from './icons/Icons.tsx';
import DealCard from './DealCard.tsx';
// FIX: Imported CommunicationAssistantModal with curly braces as it is a named export.
import CommunicationAssistantModal from './CommunicationAssistantModal.tsx';

const dealStages: DealStage[] = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

// FIX: Completed the stageConfig object to include all DealStage types.
const stageConfig: Record<DealStage, { title: string; color: string; }> = {
    'Prospecting': { title: 'Prospectando', color: 'border-t-blue-500' },
    'Qualification': { title: 'Qualificação', color: 'border-t-purple-500' },
    'Proposal': { title: 'Proposta', color: 'border-t-pink-500' },
    'Negotiation': { title: 'Negociação', color: 'border-t-orange-500' },
    'Closed Won': { title: 'Fechado (Ganho)', color: 'border-t-green-500' },
    'Closed Lost': { title: 'Fechado (Perdido)', color: 'border-t-red-500' },
};


const LoadingState: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full py-20">
        <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const Negocios: React.FC<{ navigate: (view: string, payload: any) => void; }> = ({ navigate }) => {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

    useEffect(() => {
        const loadDeals = async () => {
            try {
                setLoading(true);
                const dealsData = await fetchDeals();
                setDeals(dealsData);
            } catch (err) {
                setError('Falha ao carregar os negócios. Tente recarregar a página.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadDeals();
    }, []);

    const dealsByStage = useMemo(() => {
        return dealStages.reduce((acc, stage) => {
            acc[stage] = deals.filter(deal => deal.stage === stage);
            return acc;
        }, {} as Record<DealStage, Deal[]>);
    }, [deals]);

    if (loading) return <LoadingState />;
    if (error) return <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>;

    return (
        <>
            <div className="space-y-6 h-full flex flex-col">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <DealsIcon className="w-8 h-8 text-indigo-400" />
                        Funil de Negócios
                    </h1>
                    <p className="mt-1 text-gray-400">
                        Gerencie seus negócios em andamento no pipeline de vendas.
                    </p>
                </div>

                <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                    {dealStages.map(stage => (
                        <div key={stage} className="flex-shrink-0 w-80 bg-gray-900/50 rounded-lg flex flex-col">
                            <div className={`p-4 border-t-4 ${stageConfig[stage].color} rounded-t-lg`}>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-white">{stageConfig[stage].title}</h3>
                                    <span className="text-sm font-bold text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded-full">
                                        {dealsByStage[stage]?.length || 0}
                                    </span>
                                </div>
                            </div>
                            <div className="p-2 space-y-3 overflow-y-auto flex-1 bg-gray-800/20 rounded-b-lg">
                                {dealsByStage[stage]?.map(deal => (
                                    <DealCard key={deal.id} deal={deal} onOpenAssistant={setSelectedDeal} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {selectedDeal && <CommunicationAssistantModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
        </>
    );
};

export default Negocios;