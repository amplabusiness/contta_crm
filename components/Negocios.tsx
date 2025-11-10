import React, { useState, useEffect, useMemo } from 'react';
import { fetchDeals, updateDealStage } from '../services/apiService.ts';
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
    const [moveError, setMoveError] = useState<string | null>(null);
    const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
    const [hoveredStage, setHoveredStage] = useState<DealStage | null>(null);
    const [updatingDealIds, setUpdatingDealIds] = useState<Set<string>>(new Set());

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

    const markUpdating = (dealId: string) => {
        setUpdatingDealIds((prev) => {
            const next = new Set(prev);
            next.add(dealId);
            return next;
        });
    };

    const unmarkUpdating = (dealId: string) => {
        setUpdatingDealIds((prev) => {
            const next = new Set(prev);
            next.delete(dealId);
            return next;
        });
    };

    const dealsByStage = useMemo(() => {
        return dealStages.reduce((acc, stage) => {
            acc[stage] = deals.filter(deal => deal.stage === stage);
            return acc;
        }, {} as Record<DealStage, Deal[]>);
    }, [deals]);

    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, dealId: string) => {
        if (updatingDealIds.has(dealId)) {
            event.preventDefault();
            return;
        }
        setMoveError(null);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', dealId);
        setDraggingDealId(dealId);
    };

    const handleDragEnd = () => {
        setDraggingDealId(null);
        setHoveredStage(null);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>, targetStage: DealStage) => {
        event.preventDefault();
        setHoveredStage(null);

        const dealId = event.dataTransfer.getData('text/plain') || draggingDealId;
        if (!dealId) {
            return;
        }

        const currentDeal = deals.find((deal) => deal.id === dealId);
        if (!currentDeal || currentDeal.stage === targetStage) {
            setDraggingDealId(null);
            return;
        }

        const previousStage = currentDeal.stage;
        setMoveError(null);
        setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, stage: targetStage } : deal)));
        markUpdating(dealId);

        try {
            const updatedDeal = await updateDealStage(dealId, targetStage);
            setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, ...updatedDeal } : deal)));
        } catch (updateError) {
            console.error(updateError);
            setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, stage: previousStage } : deal)));
            setMoveError('Não foi possível atualizar o estágio. Tente novamente.');
        } finally {
            unmarkUpdating(dealId);
            setDraggingDealId(null);
        }
    };

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

                {moveError && (
                    <div className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 px-4 py-3 rounded-lg">
                        {moveError}
                    </div>
                )}

                <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                    {dealStages.map(stage => (
                        <div
                            key={stage}
                            className={`flex-shrink-0 w-80 bg-gray-900/50 rounded-lg flex flex-col transition-shadow ${hoveredStage === stage ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(event) => handleDrop(event, stage)}
                            onDragEnter={() => setHoveredStage(stage)}
                            onDragLeave={(event) => {
                                const nextTarget = event.relatedTarget as Node | null;
                                if (!event.currentTarget.contains(nextTarget)) {
                                    setHoveredStage((current) => (current === stage ? null : current));
                                }
                            }}
                        >
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
                                    <div
                                        key={deal.id}
                                        className={`transition-opacity ${updatingDealIds.has(deal.id) ? 'opacity-60 pointer-events-none' : ''} ${draggingDealId === deal.id ? 'ring-2 ring-indigo-400 rounded-lg' : ''}`}
                                    >
                                        <DealCard
                                            deal={deal}
                                            onOpenAssistant={setSelectedDeal}
                                            draggable={!updatingDealIds.has(deal.id)}
                                            onDragStart={(event) => handleDragStart(event, deal.id)}
                                            onDragEnd={handleDragEnd}
                                        />
                                    </div>
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