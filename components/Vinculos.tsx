

import React, { useState, useEffect, useCallback } from 'react';
// FIX: Added file extensions to import paths.
import { 
    Empresa, 
    Socio, 
    RedeDeVinculos, 
    GenealogiaSocio, 
    Vinculo, 
    ParentePotencial, 
    VinculoAnalysis 
} from '../types.ts';
import { View } from '../App.tsx';
import { fetchVinculos } from '../services/vinculosService.ts';
import { fetchGenealogia } from '../services/genealogiaService.ts';
import { generatePitchFromVinculos } from '../services/geminiService.ts';
import NetworkNode from './NetworkNode.tsx';
import { ArrowLeftIcon, SparkleIcon, ClipboardIcon, CheckCircleIcon } from './icons/Icons.tsx';

interface VinculosProps {
  empresa: Empresa;
  navigate: (view: View, payload?: any) => void;
}

interface PitchState {
    [key: string]: {
        loading: boolean;
        analysis: VinculoAnalysis | null;
        error: string | null;
    }
}

// Component for a single connection (company or relative)
const ConnectionNode: React.FC<{
    targetEmpresa: Empresa,
    socio: Socio,
    connection: Vinculo | ParentePotencial,
    pitches: PitchState,
    handleGeneratePitch: (socio: Socio, connection: Vinculo | ParentePotencial) => void,
    handleCopy: (text: string, id: string) => void,
    copiedId: string
}> = ({ targetEmpresa, socio, connection, pitches, handleGeneratePitch, handleCopy, copiedId }) => {
    
    const isVinculo = (c: any): c is Vinculo => 'empresa_vinculada_cnpj' in c;
    const connectionId = isVinculo(connection) ? connection.empresa_vinculada_cnpj : connection.cpf_parcial_relacionado;
    const pitchState = pitches[connectionId];

    return (
        <div className="pl-6 border-l-2 border-gray-700 ml-4">
            {isVinculo(connection) ? (
                <NetworkNode 
                    type="empresa" 
                    name={connection.empresa_vinculada_nome}
                    detail={connection.empresa_vinculada_cnpj}
                    connection={`${connection.tipo_vinculo.replace('_', ' ')} (Grau ${connection.grau_vinculo})`}
                />
            ) : (
                <NetworkNode 
                    type="parente" 
                    name={connection.nome_relacionado}
                    detail={`Confiança: ${connection.confiabilidade}%`}
                    connection={connection.tipo_descoberta}
                />
            )}
            <div className="mt-2 pl-4">
                {pitchState?.loading ? (
                    <div className="flex items-center space-x-2 p-2">
                        <SparkleIcon className="w-4 h-4 text-indigo-400 animate-spin" />
                        <p className="text-xs text-gray-400">Gerando abordagem...</p>
                    </div>
                ) : pitchState?.error ? (
                    <p className="text-xs text-red-400">{pitchState.error}</p>
                ) : pitchState?.analysis ? (
                    <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3 mt-2 text-xs">
                        <h5 className="font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                            <SparkleIcon className="w-4 h-4" />
                            Análise da IA
                        </h5>
                        <div className="space-y-2">
                            <div>
                                <p className="font-bold text-gray-400 text-xs uppercase tracking-wider">Lógica</p>
                                <p className="text-gray-300">{pitchState.analysis.reasoning}</p>
                            </div>
                            <div>
                                <p className="font-bold text-gray-400 text-xs uppercase tracking-wider">Sugestão de Pitch</p>
                                <div className="relative mt-1">
                                    <blockquote className="p-2 text-gray-200 bg-gray-800/60 rounded-md border-l-4 border-indigo-500 italic pr-10">
                                        {pitchState.analysis.pitch}
                                    </blockquote>
                                    <button onClick={() => handleCopy(pitchState.analysis.pitch, connectionId)} className="absolute top-1/2 -translate-y-1/2 right-2 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700">
                                        {copiedId === connectionId ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => handleGeneratePitch(socio, connection)}
                        className="flex items-center gap-2 text-xs bg-indigo-600/20 text-indigo-300 font-semibold py-1.5 px-3 rounded-md hover:bg-indigo-600/40 transition-colors"
                    >
                        <SparkleIcon className="w-4 h-4" />
                        Gerar Pitch com IA
                    </button>
                )}
            </div>
        </div>
    );
};

const SkeletonLoader: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        {[...Array(2)].map((_, i) => (
            <div key={i} className="pl-6 border-l-2 border-transparent ml-4">
                <div className="bg-gray-700/80 p-4 rounded-lg">
                    <div className="flex items-start gap-4">
                        <div className="rounded-full bg-gray-600 h-6 w-6 mt-1"></div>
                        <div className="flex-grow space-y-2">
                            <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-600/50 h-4 bg-gray-600 rounded w-1/3"></div>
                </div>
            </div>
        ))}
    </div>
);

// Component for a single partner's connections
const SocioConnections: React.FC<{ socio: Socio, empresa: Empresa }> = ({ socio, empresa }) => {
    const [vinculos, setVinculos] = useState<RedeDeVinculos | null>(null);
    const [genealogia, setGenealogia] = useState<GenealogiaSocio | null>(null);
    const [pitches, setPitches] = useState<PitchState>({});
    const [copiedId, setCopiedId] = useState('');
    const [analysisState, setAnalysisState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');

    const handleStartAnalysis = useCallback(async () => {
        setAnalysisState('loading');
        try {
            const [vinculosData, genealogiaData] = await Promise.all([
                fetchVinculos([socio]),
                fetchGenealogia(socio)
            ]);
            setVinculos(vinculosData.find(v => v.socio_nome === socio.nome_socio) || null);
            setGenealogia(genealogiaData);
            setAnalysisState('success');
        } catch (err) {
            console.error(err);
            setAnalysisState('error');
        }
    }, [socio]);
    

    const handleGeneratePitch = useCallback(async (socio: Socio, connection: Vinculo | ParentePotencial) => {
        const isVinculo = (c: any): c is Vinculo => 'empresa_vinculada_cnpj' in c;
        const connectionId = isVinculo(connection) ? connection.empresa_vinculada_cnpj : connection.cpf_parcial_relacionado;
        
        setPitches(prev => ({ ...prev, [connectionId]: { loading: true, analysis: null, error: null } }));
        try {
            const analysis = await generatePitchFromVinculos(empresa, socio, connection);
            setPitches(prev => ({ ...prev, [connectionId]: { loading: false, analysis, error: null } }));
        } catch (err) {
            setPitches(prev => ({ ...prev, [connectionId]: { loading: false, analysis: null, error: 'Falha ao gerar pitch.' } }));
        }
    }, [empresa]);
    
    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(''), 2000);
        });
    };
    
    const renderContent = () => {
        switch (analysisState) {
            case 'idle':
                return (
                    <div className="text-center py-4">
                        <button 
                            onClick={handleStartAnalysis}
                            className="flex items-center justify-center mx-auto gap-2 bg-indigo-600/80 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-600 transition-colors"
                        >
                            <SparkleIcon className="w-5 h-5" />
                            Analisar Rede de Contatos
                        </button>
                    </div>
                );
            case 'loading':
                return <SkeletonLoader />;
            case 'error':
                 return (
                    <div className="text-center py-4 text-red-400">
                        <p>Falha ao buscar dados de vínculos.</p>
                        <button onClick={handleStartAnalysis} className="mt-2 text-sm text-indigo-400 hover:underline">Tentar novamente</button>
                    </div>
                );
            case 'success':
                const hasConnections = (vinculos?.vinculos && vinculos.vinculos.length > 0) || (genealogia?.parentes && genealogia.parentes.length > 0);
                return (
                    hasConnections ? (
                        <>
                            {vinculos?.vinculos?.map(v => (
                                <ConnectionNode key={v.empresa_vinculada_cnpj} targetEmpresa={empresa} socio={socio} connection={v} pitches={pitches} handleGeneratePitch={handleGeneratePitch} handleCopy={handleCopy} copiedId={copiedId} />
                            ))}
                            {genealogia?.parentes?.map(p => (
                                <ConnectionNode key={p.cpf_parcial_relacionado} targetEmpresa={empresa} socio={socio} connection={p} pitches={pitches} handleGeneratePitch={handleGeneratePitch} handleCopy={handleCopy} copiedId={copiedId} />
                            ))}
                        </>
                    ) : (
                        <p className="text-center text-sm text-gray-500 pt-4">Nenhum vínculo societário ou familiar encontrado para este sócio.</p>
                    )
                );
        }
    };


    return (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6">
            <NetworkNode type="socio" name={socio.nome_socio} detail={socio.qualificacao} />
            <div className="mt-4 space-y-4">
                {renderContent()}
            </div>
        </div>
    );
};

const Vinculos: React.FC<VinculosProps> = ({ empresa, navigate }) => {
    if (!empresa) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('Prospecção')} className="p-2 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-3xl font-bold text-white">Erro</h1>
                </div>
                <p className="text-red-400">Nenhuma empresa selecionada. Por favor, volte para a prospecção.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div>
                <button onClick={() => navigate('Prospecção')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Voltar para Prospecção
                </button>
                <h1 className="text-3xl font-bold text-white">Rede de Vínculos: {empresa.nome_fantasia}</h1>
                <p className="mt-1 text-gray-400">
                    Explore as conexões dos sócios para encontrar oportunidades de negócio.
                </p>
            </div>
            
            <div className="space-y-6">
                {empresa.quadro_socios.length > 0 ? (
                    empresa.quadro_socios.map(socio => (
                        <SocioConnections key={socio.cpf_parcial} socio={socio} empresa={empresa} />
                    ))
                ) : (
                    <div className="text-center p-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl mt-6">
                         <h3 className="text-lg font-semibold text-gray-400">Quadro Societário não disponível.</h3>
                         <p className="mt-1 text-sm">Não foi possível carregar os sócios desta empresa.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Vinculos;