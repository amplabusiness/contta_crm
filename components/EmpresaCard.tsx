
import React, { useState } from 'react';
// FIX: Added file extensions to import paths.
import { Empresa, ProspectAnalysis, MarketInsightResult } from '../types.ts';
import { generateProspectAnalysis, getLocalAnalysisWithMaps } from '../services/geminiService.ts';
import { 
    MapPinIcon, 
    BriefcaseIcon, 
    SparkleIcon, 
    ClipboardIcon,
    CheckCircleIcon,
    SearchIcon,
} from './icons/Icons.tsx';

interface EmpresaCardProps {
  empresa: Empresa;
  navigate: (view: string, payload: any) => void;
}

const EmpresaCard: React.FC<EmpresaCardProps> = ({ empresa, navigate }) => {
    const [analysis, setAnalysis] = useState<ProspectAnalysis | null>(null);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    const [copied, setCopied] = useState(false);

    const [showLocalAnalysis, setShowLocalAnalysis] = useState(false);
    const [localQuery, setLocalQuery] = useState('');
    const [localResult, setLocalResult] = useState<MarketInsightResult | null>(null);
    const [loadingLocal, setLoadingLocal] = useState(false);
    const [errorLocal, setErrorLocal] = useState('');

    const handleAnalysis = async () => {
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

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleLocalSearch = async () => {
        const { latitude, longitude } = empresa.endereco_principal;
        if (!latitude || !longitude || !localQuery) return;
        setLoadingLocal(true);
        setErrorLocal('');
        setLocalResult(null);
        try {
            const result = await getLocalAnalysisWithMaps(localQuery, { latitude, longitude });
            setLocalResult(result);
        } catch (e) {
            setErrorLocal('Falha na análise local.');
        } finally {
            setLoadingLocal(false);
        }
    };
    
    const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
        e.stopPropagation();
        action();
    };

  const getStatusColor = (status: Empresa['situacao_cadastral']) => {
    switch (status) {
      case 'Ativa':
        return 'bg-green-500';
      case 'Suspensa':
        return 'bg-yellow-500';
      case 'Baixada':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div 
        onClick={() => navigate('Empresa Detalhe', empresa)}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-5 flex flex-col justify-between transition-all hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer"
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg text-white pr-4">{empresa.nome_fantasia}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-300 whitespace-nowrap">
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(empresa.situacao_cadastral)}`}></span>
            {empresa.situacao_cadastral}
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-1">{empresa.razao_social}</p>
        <p className="text-xs text-gray-500 font-mono">{empresa.cnpj}</p>
        
        <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-2 text-sm text-gray-300">
           <div className="flex items-start gap-2">
                <BriefcaseIcon className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <span>{empresa.cnae_principal.descricao}</span>
            </div>
          <div className="flex items-start gap-2">
            <MapPinIcon className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
            <span>{`${empresa.endereco_principal.logradouro}, ${empresa.endereco_principal.numero} - ${empresa.endereco_principal.bairro}, ${empresa.endereco_principal.cidade} - ${empresa.endereco_principal.uf}`}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={(e) => handleButtonClick(e, () => setShowLocalAnalysis(!showLocalAnalysis))}
                    disabled={!empresa.endereco_principal.latitude}
                    className="w-full flex items-center justify-center gap-2 bg-gray-700/50 text-gray-300 font-semibold py-2 px-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    <MapPinIcon className="w-4 h-4" />
                    Análise Local
                </button>
                 <button
                    onClick={(e) => handleButtonClick(e, handleAnalysis)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 text-indigo-300 font-semibold py-2 px-3 rounded-lg hover:bg-indigo-600/40 transition-colors duration-200 text-xs"
                    >
                    <SparkleIcon className="w-4 h-4" />
                    Análise Rápida
                </button>
            </div>
            {showLocalAnalysis && (
                <div className="mt-2 p-3 bg-gray-900/30 rounded-md border border-gray-700/50 space-y-2">
                    <input 
                        type="text"
                        value={localQuery}
                        onChange={(e) => setLocalQuery(e.target.value)}
                        placeholder="Ex: restaurantes para almoço"
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button onClick={(e) => handleButtonClick(e, handleLocalSearch)} disabled={loadingLocal || !localQuery} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50">
                        <SearchIcon className="w-4 h-4"/>
                        {loadingLocal ? "Analisando..." : "Perguntar"}
                    </button>
                    {loadingLocal && <p className="text-xs text-center text-gray-400">Buscando informações locais...</p>}
                    {errorLocal && <p className="text-xs text-center text-red-400">{errorLocal}</p>}
                    {localResult && (
                         <div className="mt-2 text-xs text-gray-300 prose prose-invert prose-xs max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: localResult.text.replace(/\n/g, '<br />') }} />
                            {localResult.sources.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-600">
                                    <h4 className="font-semibold text-gray-400 text-xs">LOCAIS NO MAPS:</h4>
                                    <ul className="space-y-1 mt-1">
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
            )}
             <div className="pt-2">
                {isLoadingAnalysis ? (
                    <div className="flex items-center justify-center space-x-2 p-4">
                        <SparkleIcon className="w-5 h-5 text-indigo-400 animate-spin" />
                        <p className="text-sm text-gray-400">Analisando...</p>
                    </div>
                ) : analysis ? (
                    <div className="space-y-3 text-sm pt-2">
                        <h4 className="font-semibold text-indigo-300">Análise Preditiva da IA</h4>
                        <div>
                            <label className="text-xs text-gray-400">Potencial de Conversão</label>
                            <div className="flex items-center gap-2">
                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-green-500 h-2.5 rounded-full transition-width duration-500" style={{ width: `${analysis.potentialScore}%` }}></div>
                                </div>
                                <span className="font-bold text-white">{analysis.potentialScore}%</span>
                            </div>
                        </div>
                        <p><strong className="text-gray-300">Justificativa:</strong> {analysis.justification}</p>
                        <div>
                            <strong className="text-gray-300">Sugestão de Abordagem:</strong>
                            <div className="relative mt-1">
                                <p className="p-2 text-gray-300 bg-gray-900/50 rounded-md border border-gray-600 italic pr-10">{analysis.suggestedPitch}</p>
                                <button onClick={(e) => handleButtonClick(e, () => handleCopy(analysis.suggestedPitch))} className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors" aria-label="Copiar sugestão">
                                    {copied ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-xs text-gray-500 italic pt-2 h-[26px]">Clique no card para ver detalhes</div>
                )}
             </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm">
            <span className="text-gray-400">Porte: </span>
            <span className="font-semibold text-white">{empresa.porte}</span>
        </div>
        {empresa.distancia_km !== undefined && (
          <div className="text-sm font-bold text-indigo-400 bg-indigo-900/40 px-3 py-1 rounded-full">
            {empresa.distancia_km.toFixed(1)} km
          </div>
        )}
      </div>
    </div>
  );
};

export default EmpresaCard;