

import React, { useState, useEffect } from 'react';
// FIX: Added file extensions to import paths.
import { fetchComplianceData } from '../services/apiService.ts';
import { analyzeAuditLogs } from '../services/geminiService.ts';
import { ConsentStatus, DataAccessLog } from '../types.ts';
import { ShieldIcon, UsersIcon, SparkleIcon } from './icons/Icons.tsx';

const LoadingState: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-10 text-center text-gray-400">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Carregando dados de Compliance...</p>
    </div>
);

const AnalysisModal: React.FC<{ analysis: string, onClose: () => void }> = ({ analysis, onClose }) => (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Análise de Atividade da IA</h2>
            </div>
            <div className="p-6 prose prose-sm prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: analysis }} />
            <div className="p-4 bg-gray-900/50 border-t border-gray-700 text-right">
                <button onClick={onClose} className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600">Fechar</button>
            </div>
        </div>
    </div>
);

const Compliance: React.FC = () => {
    const [consent, setConsent] = useState<ConsentStatus | null>(null);
    const [logs, setLogs] = useState<DataAccessLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const { consentStatus, accessLogs } = await fetchComplianceData();
                setConsent(consentStatus);
                setLogs(accessLogs);
            } catch (err) {
                setError('Falha ao carregar os dados de compliance.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);
    
    const handleAnalyze = async () => {
        setLoadingAnalysis(true);
        setAnalysisError('');
        try {
            const result = await analyzeAuditLogs(logs);
            setAnalysisResult(result);
            setIsModalOpen(true);
        } catch (e) {
            setAnalysisError('Falha ao gerar análise.');
        } finally {
            setLoadingAnalysis(false);
        }
    };

    if (loading) return <LoadingState />;
    if (error) return <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>;
    if (!consent) return null;

    const consentPercentage = (consent.consentedUsers / consent.totalUsers) * 100;

    return (
        <>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldIcon className="w-8 h-8 text-indigo-400" />
                        Dashboard de Compliance & LGPD
                    </h1>
                    <p className="mt-1 text-gray-400">
                        Monitoramento automatizado de consentimento e rastreabilidade de acesso a dados.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Coluna Esquerda - Status e Termo */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Status de Consentimento */}
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <UsersIcon className="w-6 h-6 text-green-400" />
                                Status de Consentimento
                            </h2>
                            <div className="relative w-32 h-32 mx-auto">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path className="text-gray-700"
                                        d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none" stroke="currentColor" strokeWidth="2.5" />
                                    <path className="text-green-400"
                                        strokeDasharray={`${consentPercentage}, 100`}
                                        d="M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-white">{consentPercentage.toFixed(1)}%</span>
                                    <span className="text-xs text-gray-400">Adesão</span>
                                </div>
                            </div>
                            <p className="text-center text-sm text-gray-300 mt-4">
                                <strong className="text-white">{consent.consentedUsers}</strong> de <strong className="text-white">{consent.totalUsers}</strong> usuários consentiram com os termos.
                            </p>
                        </div>

                        {/* Termo de Consentimento */}
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Termo de Consentimento</h2>
                            <div className="prose prose-sm prose-invert max-w-none text-gray-400 bg-gray-900/50 p-4 rounded-md border border-gray-700 max-h-60 overflow-y-auto">
                                <div dangerouslySetInnerHTML={{ __html: consent.consentText.replace(/✅/g, '<span class="text-green-400">✅</span>').replace(/❌/g, '<span class="text-red-400">❌</span>').replace(/\n/g, '<br />') }} />
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita - Log de Auditoria */}
                    <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-white">Log de Auditoria de Dados Sensíveis</h2>
                            <button onClick={handleAnalyze} disabled={loadingAnalysis} className="flex items-center gap-2 bg-indigo-600/80 text-white font-semibold py-2 px-3 rounded-lg hover:bg-indigo-500 text-sm disabled:opacity-50">
                               <SparkleIcon className={`w-4 h-4 ${loadingAnalysis ? 'animate-spin' : ''}`}/>
                               {loadingAnalysis ? 'Analisando...' : 'Analisar Atividade com IA'}
                            </button>
                        </div>
                        {analysisError && <p className="text-sm text-red-400 mb-2">{analysisError}</p>}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Usuário</th>
                                        <th scope="col" className="px-4 py-3">Ação</th>
                                        <th scope="col" className="px-4 py-3">Alvo</th>
                                        <th scope="col" className="px-4 py-3">Horário</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-800/40">
                                            <td className="px-4 py-3 font-medium text-white">{log.user}</td>
                                            <td className="px-4 py-3">{log.action}</td>
                                            <td className="px-4 py-3 text-indigo-300">{log.target}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">{log.timestamp}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            {isModalOpen && <AnalysisModal analysis={analysisResult} onClose={() => setIsModalOpen(false)} />}
        </>
    );
};

export default Compliance;