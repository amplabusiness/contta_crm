

import React, { useState, useCallback } from 'react';
// FIX: Added file extensions to import paths.
import { Deal } from '../types.ts';
import { generateCommunication } from '../services/geminiService.ts';
import { SparkleIcon, ClipboardIcon, CheckCircleIcon } from './icons/Icons.tsx';

interface CommunicationAssistantModalProps {
  deal: Deal;
  onClose: () => void;
}

const communicationTypes = ['Email de Follow-up', 'Mensagem de Proposta', 'Lembrete de Reunião', 'Agradecimento'];
const communicationTones = ['Profissional', 'Amigável', 'Urgente', 'Conciso'];

const CommunicationAssistantModal: React.FC<CommunicationAssistantModalProps> = ({ deal, onClose }) => {
  const [commType, setCommType] = useState(communicationTypes[0]);
  const [commTone, setCommTone] = useState(communicationTones[0]);
  const [instructions, setInstructions] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    setGeneratedText('');
    try {
      const result = await generateCommunication(deal, commType, commTone, instructions);
      setGeneratedText(result);
    } catch (err) {
      setError('Falha ao gerar a comunicação. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [deal, commType, commTone, instructions]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SparkleIcon className="w-6 h-6 text-indigo-400" />
            Assistente de Comunicação IA
          </h2>
          <p className="text-sm text-gray-400">Gerar comunicação para o negócio: <span className="font-semibold text-indigo-300">{deal.companyName}</span></p>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Controls */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="comm-type" className="block text-sm font-medium text-gray-300 mb-1">Tipo de Comunicação</label>
                    <select id="comm-type" value={commType} onChange={e => setCommType(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
                        {communicationTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="comm-tone" className="block text-sm font-medium text-gray-300 mb-1">Tom</label>
                    <select id="comm-tone" value={commTone} onChange={e => setCommTone(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
                        {communicationTones.map(tone => <option key={tone} value={tone}>{tone}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="instructions" className="block text-sm font-medium text-gray-300 mb-1">Instruções Adicionais (Opcional)</label>
                    <textarea 
                        id="instructions"
                        rows={4}
                        value={instructions}
                        onChange={e => setInstructions(e.target.value)}
                        placeholder="Ex: Mencionar que a proposta expira em 3 dias."
                        className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                    <SparkleIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Gerando...' : 'Gerar Texto'}
                </button>
            </div>

            {/* Right Column: Result */}
            <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-2">Texto Gerado</h3>
                <div className="flex-grow bg-gray-800 rounded-md p-3 text-sm text-gray-300 whitespace-pre-wrap min-h-[200px] overflow-y-auto">
                    {loading && <p className="text-gray-400">Gerando texto...</p>}
                    {error && <p className="text-red-400">{error}</p>}
                    {generatedText}
                </div>
                {generatedText && (
                    <div className="pt-2 text-right">
                        <button onClick={handleCopy} className="flex items-center gap-2 text-xs bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1.5 px-3 rounded-md">
                            {copied ? <CheckCircleIcon className="w-4 h-4 text-green-400"/> : <ClipboardIcon className="w-4 h-4"/>}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                )}
            </div>
        </div>
        <div className="p-4 bg-gray-900/50 border-t border-gray-700/50 text-right rounded-b-xl">
          <button
            onClick={onClose}
            className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunicationAssistantModal;
