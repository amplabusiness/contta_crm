

import React, { useState, useEffect } from 'react';
// FIX: Added file extensions to import paths.
import {
  fetchIndicacoesStatus,
  fetchMinhasIndicacoes,
  fetchEmpresasParaIndicar,
} from '../services/apiService.ts';
import {
  ProgramaIndicacoesStatus,
  Indicacao,
  EmpresaParaIndicar,
} from '../types.ts';
import {
  GiftIcon,
  TrophyIcon,
  TrendingUpIcon,
  MapPinIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from './icons/Icons.tsx';

// Hardcoded for simulation, as we don't have a logged-in user context
const ESCRITORIO_CEP = '04551-010'; 

const LoadingState: React.FC = () => (
    <div className="flex items-center justify-center p-10 text-center text-gray-400">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Carregando dados do programa...</p>
    </div>
);

const StatusIcon: React.FC<{ status: Indicacao['status'] }> = ({ status }) => {
    switch (status) {
        case 'Convertido':
            return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
        case 'Em negociação':
            return <ClockIcon className="w-5 h-5 text-yellow-400" />;
        case 'Rejeitado':
            return <XCircleIcon className="w-5 h-5 text-red-400" />;
        default:
            return null;
    }
};

const proximoNivelMap: Record<ProgramaIndicacoesStatus['nivel'], ProgramaIndicacoesStatus['nivel'] | null> = {
    Bronze: 'Prata',
    Prata: 'Ouro',
    Ouro: 'Platina',
    Platina: null,
};

const Indicacoes: React.FC = () => {
  const [status, setStatus] = useState<ProgramaIndicacoesStatus | null>(null);
  const [minhasIndicacoes, setMinhasIndicacoes] = useState<Indicacao[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaParaIndicar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statusData, indicacoesData, empresasData] = await Promise.all([
          fetchIndicacoesStatus(),
          fetchMinhasIndicacoes(),
          fetchEmpresasParaIndicar(ESCRITORIO_CEP),
        ]);
        setStatus(statusData);
        setMinhasIndicacoes(indicacoesData);
        setEmpresas(empresasData);
      } catch (err) {
        setError('Falha ao carregar os dados do programa de indicações.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>;
  if (!status) return null;

  const metaAtual = Math.max(1, status.meta_proximo_nivel);
  const proximoNivel = proximoNivelMap[status.nivel];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <GiftIcon className="w-8 h-8 text-indigo-400" />
          Programa de Indicações
        </h1>
        <p className="mt-1 text-gray-400">
          Indique empresas próximas e ganhe recompensas a cada novo cliente convertido!
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-4">
          <TrophyIcon className="w-12 h-12 text-yellow-400" />
          <div>
            <p className="text-sm text-gray-400">Seu Nível</p>
            <p className="text-2xl font-bold text-white">{status.nivel}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <TrendingUpIcon className="w-12 h-12 text-green-400" />
          <div>
            <p className="text-sm text-gray-400">Total Ganho</p>
            <p className="text-2xl font-bold text-white">
              {status.total_ganho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
    <div>
       <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-indigo-300">
          {proximoNivel ? `Próximo Nível: ${proximoNivel}` : 'Nível máximo atingido'}
        </span>
        <span className="text-sm font-medium text-indigo-300">{status.indicacoes_convertidas} de {status.meta_proximo_nivel}</span>
      </div>
      <progress
        value={Math.min(status.indicacoes_convertidas, metaAtual)}
        max={metaAtual}
        className="w-full h-2.5 overflow-hidden rounded-full bg-gray-700 text-indigo-600 accent-indigo-600"
      />
       <p className="text-xs text-center mt-2 text-gray-400">{status.beneficio_atual}</p>
    </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Empresas para Indicar */}
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">📍 Empresas Próximas para Indicar (raio de 5km)</h2>
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {empresas.length === 0 && (
          <p className="text-sm text-gray-400 bg-gray-800/40 border border-dashed border-gray-700 rounded-lg p-4">
            Não encontramos empresas próximas com perfil aderente no momento. Tente novamente em alguns minutos.
          </p>
        )}
        {empresas.map(empresa => {
          const distanciaLegivel = typeof empresa.distancia_km === 'number'
            ? `${empresa.distancia_km.toFixed(1)} km`
            : 'Distância indisponível';
          return (
            <div key={empresa.cnpj} className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white">{empresa.nome_fantasia || empresa.razao_social}</h3>
                  <p className="text-sm text-gray-400">{empresa.razao_social}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4"/> {distanciaLegivel}</span>
                    <span className="flex items-center gap-1"><BriefcaseIcon className="w-4 h-4"/> {empresa.porte}</span>
                  </div>
                </div>
                <button 
                  onClick={() => alert(`Indicação de ${empresa.razao_social} enviada com sucesso! (simulação)`)}
                  className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors text-sm whitespace-nowrap"
                >
                  Indicar
                </button>
              </div>
              <p className="text-xs text-center mt-3 text-green-300 bg-green-900/30 py-1 rounded-md">
                Ganhe ~{empresa.recompensa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} com esta indicação!
              </p>
            </div>
          );
        })}
      </div>
        </div>

        {/* Minhas Indicações */}
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Suas Indicações</h2>
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {minhasIndicacoes.length === 0 && (
          <p className="text-sm text-gray-400 bg-gray-800/40 border border-dashed border-gray-700 rounded-lg p-4">
            Você ainda não enviou indicações. Assim que registrar uma nova empresa, ela aparecerá aqui.
          </p>
        )}
        {minhasIndicacoes.map(indicacao => (
          <div key={indicacao.id} className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-4">
               <StatusIcon status={indicacao.status} />
              <div>
                <p className="font-semibold text-white">{indicacao.empresa_nome}</p>
                <p className="text-xs text-gray-400">
                  Status: {indicacao.status} • Indicado em {new Date(indicacao.data_indicacao).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            {typeof indicacao.recompensa_ganha === 'number' && (
              <p className="font-bold text-green-400 text-lg">
                +{indicacao.recompensa_ganha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
          </div>
        ))}
      </div>
        </div>
      </div>
    </div>
  );
};

export default Indicacoes;