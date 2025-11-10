import React, { useState, useEffect, useCallback } from 'react';
// FIX: Added file extensions to import paths.
import { fetchAnalyticsData } from '../services/apiService.ts';
import { AutomatedReport, ChurnPrediction, UpsellOpportunity } from '../types.ts';
import { ReportsIcon, TrendingDownIcon, DollarSignIcon, SparkleIcon, DownloadIcon } from './icons/Icons.tsx';
import ReportGenerationModal from './ReportGenerationModal.tsx';

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const LoadingState: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-10 text-center text-gray-400">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Gerando análises e relatório...</p>
        <p className="text-sm text-gray-500">A IA está processando os dados mais recentes.</p>
    </div>
);

const ChurnCard: React.FC<{ prediction: ChurnPrediction }> = ({ prediction }) => (
    <div className="bg-gray-800/60 border border-red-500/30 p-4 rounded-lg">
        <div className="flex justify-between items-start">
            <h4 className="font-semibold text-white">{prediction.companyName}</h4>
            <div className="text-right">
                <p className="text-2xl font-bold text-red-400">{prediction.churnRisk}%</p>
                <p className="text-xs text-red-400">Risco de Churn</p>
            </div>
        </div>
        <p className="text-sm text-gray-400 mt-2"><strong>Motivo:</strong> {prediction.primaryReason}</p>
        <p className="text-sm text-indigo-300 mt-2 bg-indigo-900/30 p-2 rounded-md"><strong>Ação Sugerida:</strong> {prediction.suggestedAction}</p>
    </div>
);

const UpsellCard: React.FC<{ opportunity: UpsellOpportunity }> = ({ opportunity }) => (
     <div className="bg-gray-800/60 border border-green-500/30 p-4 rounded-lg">
        <div className="flex justify-between items-start">
            <h4 className="font-semibold text-white">{opportunity.companyName}</h4>
            <div className="text-right">
                <p className="text-2xl font-bold text-green-400">{opportunity.confidence}%</p>
                <p className="text-xs text-green-400">Confiança</p>
            </div>
        </div>
        <p className="text-sm text-gray-400 mt-2"><strong>Oportunidade:</strong> {opportunity.opportunityType} - {opportunity.productSuggestion}</p>
        <p className="text-sm text-indigo-300 mt-2 bg-indigo-900/30 p-2 rounded-md">
            <strong>Valor Potencial:</strong> {opportunity.potentialValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
    </div>
);
const Analytics: React.FC = () => {
    const [report, setReport] = useState<AutomatedReport | null>(null);
    const [churn, setChurn] = useState<ChurnPrediction[]>([]);
    const [upsell, setUpsell] = useState<UpsellOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportHtml, setReportHtml] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshError, setRefreshError] = useState<string | null>(null);

    const loadData = useCallback(async ({ useFullLoader = false }: { useFullLoader?: boolean } = {}) => {
        if (useFullLoader) {
            setLoading(true);
            setError(null);
        } else {
            setRefreshing(true);
            setRefreshError(null);
        }

        try {
            const { report: apiReport, churnPredictions, upsellOpportunities, insightsHtml } = await fetchAnalyticsData();
            setReport(apiReport);
            setChurn(churnPredictions);
            setUpsell(upsellOpportunities);

            if (typeof insightsHtml === 'string' && insightsHtml.trim().length > 0) {
                setReportHtml(insightsHtml);
            } else if (apiReport?.summary) {
                setReportHtml(`<p>${escapeHtml(apiReport.summary)}</p>`);
            } else {
                setReportHtml(null);
            }
        } catch (err) {
            console.error('Falha ao gerar o relatório de análises.', err);
            if (useFullLoader) {
                setError('Falha ao gerar o relatório de análises.');
            } else {
                setRefreshError('Não foi possível atualizar os insights agora. Tente novamente em instantes.');
            }
        } finally {
            if (useFullLoader) {
                setLoading(false);
            } else {
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        loadData({ useFullLoader: true });
    }, [loadData]);

    const handleRefresh = () => {
        if (!loading && !refreshing) {
            void loadData();
        }
    };

    if (loading) return <LoadingState />;
    if (error) return <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>;
    
    return (
        <>
            <div className="space-y-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <ReportsIcon className="w-8 h-8 text-indigo-400" />
                            Análises & Relatórios Automatizados
                        </h1>
                        <p className="mt-1 text-gray-400">
                            Relatórios e insights preditivos gerados automaticamente pela IA para acelerar sua tomada de decisão.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={refreshing || loading}
                            className="flex items-center gap-2 rounded-lg border border-indigo-400/40 bg-gray-900/60 px-4 py-2 text-sm font-semibold text-indigo-200 transition-colors hover:bg-gray-900/80 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {refreshing ? (
                                <span className="inline-block w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
                            ) : (
                                <SparkleIcon className="w-5 h-5" />
                            )}
                            Atualizar Insights
                        </button>
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors duration-200"
                        >
                            <DownloadIcon className="w-5 h-5"/>
                            Gerar Relatório PDF
                        </button>
                    </div>
                </div>

                {refreshError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-2 text-sm text-red-200" role="status" aria-live="polite">
                        {refreshError}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Coluna Principal - Relatório */}
                    <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg">
                        {report && (
                             <div className="p-6 border-b border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <SparkleIcon className="w-6 h-6 text-indigo-400"/>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{report.title}</h2>
                                        <p className="text-xs text-gray-500">Gerado em: {new Date(report.generatedAt).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                             </div>
                        )}
                        <div 
                            className="p-6 prose prose-invert prose-sm max-w-none text-gray-300"
                            dangerouslySetInnerHTML={{ __html: reportHtml || '<p>Não foi possível carregar o conteúdo do relatório.</p>' }}
                        />
                    </div>

                    {/* Coluna Lateral - Alertas Preditivos */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <TrendingDownIcon className="w-6 h-6 text-red-400"/>
                                Alerta de Churn
                            </h3>
                            <div className="space-y-4">
                                {churn.length > 0 ? (
                                    churn.map(c => <ChurnCard key={c.id} prediction={c} />)
                                ) : (
                                    <p className="text-sm text-gray-500">Nenhum risco de churn significativo detectado.</p>
                                )}
                            </div>
                        </div>
                         <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <DollarSignIcon className="w-6 h-6 text-green-400"/>
                                Oportunidades de Venda
                            </h3>
                            <div className="space-y-4">
                               {upsell.length > 0 ? (
                                    upsell.map(u => <UpsellCard key={u.id} opportunity={u} />)
                               ) : (
                                    <p className="text-sm text-gray-500">Nenhuma oportunidade clara de upsell identificada no momento.</p>
                               )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isReportModalOpen && <ReportGenerationModal onClose={() => setIsReportModalOpen(false)} />}
        </>
    );
};

export default Analytics;