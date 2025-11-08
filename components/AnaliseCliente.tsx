import React, { useState, useCallback } from 'react';
import { fetchEmpresaByCnpj } from '../services/apiService.ts';
import { getCoordinatesForCep } from '../services/geolocationService.ts';
import { generateProspectAnalysis, getLocalAnalysisWithMaps } from '../services/geminiService.ts';
import { Empresa, ProspectAnalysis, MarketInsightResult } from '../types.ts';
import { SearchCircleIcon, SearchIcon, SparkleIcon, MapPinIcon, BriefcaseIcon, ClipboardIcon, CheckCircleIcon } from './icons/Icons.tsx';

const AnaliseCliente: React.FC = () => {
    const [cnpj, setCnpj] = useState('');
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [analysis, setAnalysis] = useState<ProspectAnalysis | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    const [copied, setCopied] = useState(false);
    
    const [localQuery, setLocalQuery] = useState('');
    const [localResult, setLocalResult] = useState<MarketInsightResult | null>(null);
    const [loadingLocal, setLoadingLocal] = useState(false);
    const [errorLocal, setErrorLocal] = useState('');

    const handleSearch = useCallback(async () => {
        if (!cnpj.trim()) return;
        setLoading(true);
        setError(null);
        setEmpresa(null);
        setAnalysis(null);
        setLocalResult(null);
        setLocalQuery('');
        
        try {
            const result = await fetchEmpresaByCnpj(cnpj);
            if (result) {
                const foundEmpresa = result;
                const coords = await getCoordinatesForCep(foundEmpresa.endereco_principal.cep);
                if (coords) {
                    foundEmpresa.endereco_principal.latitude = coords.latitude;
                    foundEmpresa.endereco_principal.longitude = coords.longitude;
                }
                setEmpresa(foundEmpresa);
            } else {
                setError('Nenhuma empresa encontrada para o CNPJ informado.');
            }
        } catch (err) {
            setError('Falha ao buscar dados da empresa. Verifique o CNPJ e a conexão com o backend e tente novamente.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [cnpj]);

    const handleAnalysis = async () => {
        if (!empresa) return;
        setIsLoadingAnalysis(true);
        setAnalysisError('');
        setAnalysis(null);
        try {
            const result = await generateProspectAnalysis(empresa);
            setAnalysis(result);
        } catch (error) {
            console.error("Failed to get prospect analysis:", error);
            setAnalysisError('Falha ao obter análise da IA.');
        } finally {
            setIsLoadingAnalysis(false);
        }
    };
    
    const handleLocalSearch = async () => {
        if (!empresa?.endereco_principal.latitude || !empresa.endereco_principal.longitude || !localQuery) return;
        setLoadingLocal(true);
        setErrorLocal('');
        setLocalResult(null);
        try {
            const result = await getLocalAnalysisWithMaps(localQuery, { latitude: empresa.endereco_principal.latitude, longitude: empresa.endereco_principal.longitude });
            setLocalResult(result);
        } catch (e) {
            setErrorLocal('Falha na análise local.');
        } finally {
            setLoadingLocal(false);
        }
    };
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const getStatusColor = (status: Empresa['situacao_cadastral']) => {
        switch (status) {
            case 'Ativa': return 'bg-green-500/20 text-green-300 border border-green-500/30';
            case 'Suspensa': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
            case 'Baixada': return 'bg-red-500/20 text-red-300 border border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
        }
    };

    const renderEmpresaData = () => {
        if (!empresa) return null;
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Company Info */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 space-y-4">
                     <div>
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-2xl font-bold text-white pr-4">{empresa.nome_fantasia}</h2>
                             <span className={`text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap ${getStatusColor(empresa.situacao_cadastral)}`}>{empresa.situacao_cadastral}</span>
                        </div>
                        <p className="text-md text-gray-400">{empresa.razao_social}</p>
                        <p className="text-sm text-gray-500 font-mono mt-1">{empresa.cnpj}</p>
                    </div>
                     <div className="pt-4 border-t border-gray-700/50 space-y-3 text-md text-gray-300">
                        <div className="flex items-start gap-3">
                            <BriefcaseIcon className="w-5 h-5 mt-1 text-gray-400 flex-shrink-0" />
                            <span>{empresa.cnae_principal.descricao}</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPinIcon className="w-5 h-5 mt-1 text-gray-400 flex-shrink-0" />
                            <span>{`${empresa.endereco_principal.logradouro}, ${empresa.endereco_principal.numero} - ${empresa.endereco_principal.cidade}`}</span>
                        </div>
                    </div>
                </div>

                {/* AI Analysis */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><SparkleIcon className="w-6 h-6 text-indigo-400"/>Análise Rápida de Prospect</h3>
                    {!analysis && !isLoadingAnalysis && (
                        <button onClick={handleAnalysis} className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500">
                            Gerar Análise com IA
                        </button>
                    )}
                    {isLoadingAnalysis && <p className="text-sm text-center text-gray-400">Analisando...</p>}
                    {analysisError && <p className="text-sm text-center text-red-400">{analysisError}</p>}
                    {analysis && (
                        <div className="space-y-4 text-md">
                            <div>
                                <label className="text-sm text-gray-400">Potencial de Conversão</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-full bg-gray-700 rounded-full h-3"><div className="bg-green-500 h-3 rounded-full" style={{ width: `${analysis.potentialScore}%` }}></div></div>
                                    <span className="font-bold text-white text-lg">{analysis.potentialScore}%</span>
                                </div>
                            </div>
                            <p><strong className="text-gray-300">Justificativa:</strong> {analysis.justification}</p>
                            <div>
                                <strong className="text-gray-300">Sugestão de Abordagem:</strong>
                                <div className="relative mt-1">
                                    <p className="p-3 text-gray-300 bg-gray-900/50 rounded-md border border-gray-600 italic pr-12">{analysis.suggestedPitch}</p>
                                    <button onClick={() => handleCopy(analysis.suggestedPitch)} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors" aria-label="Copiar sugestão">
                                        {copied ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Local Analysis */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 lg:col-span-2">
                     <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><MapPinIcon className="w-6 h-6 text-indigo-400"/>Análise Local com Google Maps</h3>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                            type="text"
                            value={localQuery}
                            onChange={(e) => setLocalQuery(e.target.value)}
                            placeholder="Ex: restaurantes para almoço, clientes em potencial, concorrentes..."
                            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-md focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={!empresa?.endereco_principal.latitude}
                        />
                        <button onClick={handleLocalSearch} disabled={loadingLocal || !localQuery || !empresa?.endereco_principal.latitude} className="flex-shrink-0 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md text-md hover:bg-indigo-500 transition-colors disabled:opacity-50">
                            <SearchIcon className="w-5 h-5"/>
                            {loadingLocal ? "Analisando..." : "Perguntar"}
                        </button>
                     </div>
                     {!empresa?.endereco_principal.latitude && <p className="text-xs text-yellow-400 mt-2">Coordenadas geográficas não disponíveis para esta empresa.</p>}
                     {loadingLocal && <p className="text-sm text-center text-gray-400 mt-4">Buscando informações locais...</p>}
                     {errorLocal && <p className="text-sm text-center text-red-400 mt-4">{errorLocal}</p>}
                     {localResult && (
                         <div className="mt-4 text-md text-gray-300 prose prose-invert prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: localResult.text.replace(/\n/g, '<br />') }} />
                            {localResult.sources.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-600">
                                    <h4 className="font-semibold text-gray-400 text-md">LOCAIS NO MAPS:</h4>
                                    <ul className="list-disc pl-5 space-y-1 mt-2">
                                        {localResult.sources.map(source => (
                                            <li key={source.uri}>
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all">{source.title}</a>
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

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
             <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <SearchCircleIcon className="w-8 h-8 text-indigo-400" />
                    Análise de Cliente On-Demand
                </h1>
                <p className="mt-1 text-gray-400">
                    Insira um CNPJ para obter dados atualizados e análises preditivas instantâneas com IA.
                </p>
            </div>
             <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-xl shadow-lg space-y-4">
                <label htmlFor="cnpj-input" className="block text-md font-medium text-gray-300">
                    Digite o CNPJ que deseja analisar
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        id="cnpj-input"
                        type="text"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading || !cnpj.trim()}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-500 transition-colors duration-200 disabled:bg-indigo-800/50 disabled:text-gray-400 disabled:cursor-not-allowed text-lg"
                    >
                        <SearchIcon className="w-6 h-6" />
                        {loading ? 'Buscando...' : 'Analisar'}
                    </button>
                </div>
            </div>

            {loading && <p className="text-center text-lg text-gray-400">Buscando dados da empresa...</p>}
            {error && <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>}
            {empresa && renderEmpresaData()}
            
        </div>
    );
};

export default AnaliseCliente;