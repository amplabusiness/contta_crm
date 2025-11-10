import React, { useEffect } from 'react';
import { useCNPJGroup, CNPJUtils } from '../hooks/useCNPJGroup';

interface CNPJGroupDisplayProps {
  cnpj: string;
  onMatrizSelected?: (empresa: any) => void;
  onFilialSelected?: (empresa: any) => void;
  autoLoad?: boolean;
  showDetails?: boolean;
}

/**
 * Componente para exibir Matriz e Filiais de um CNPJ
 * 
 * Detecta automaticamente se o CNPJ fornecido é matriz ou filial,
 * e busca todas as empresas do mesmo grupo (mesmo CNPJ raiz).
 * 
 * @example
 * <CNPJGroupDisplay
 *   cnpj="12345678000190"
 *   autoLoad={true}
 *   onMatrizSelected={(empresa) => console.log('Matriz:', empresa)}
 *   onFilialSelected={(filial) => console.log('Filial:', filial)}
 * />
 */
export default function CNPJGroupDisplay({
  cnpj,
  onMatrizSelected,
  onFilialSelected,
  autoLoad = true,
  showDetails = true
}: CNPJGroupDisplayProps) {
  const { grupo, loading, error, findGroup } = useCNPJGroup();

  // Auto-carregar ao montar ou quando CNPJ mudar
  useEffect(() => {
    if (autoLoad && cnpj && cnpj.replace(/\D/g, '').length === 14) {
      findGroup(cnpj);
    }
  }, [cnpj, autoLoad, findGroup]);

  if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
    return null;
  }

  // Loading State
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center text-blue-700">
          <svg
            className="animate-spin h-5 w-5 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">Buscando matriz e filiais...</span>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start text-red-700">
          <svg
            className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  // No Data
  if (!grupo) {
    return null;
  }

  // Render grupo empresarial
  return (
    <div className="space-y-3">
      {/* Header com CNPJ Raiz */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h4 className="font-semibold text-gray-900">Grupo Empresarial</h4>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              CNPJ Raiz: <span className="font-mono font-medium">{CNPJUtils.formatCNPJRaiz(grupo.cnpjRaiz)}</span>
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{grupo.totalEmpresas}</div>
            <div className="text-xs text-gray-500">
              {grupo.totalEmpresas === 1 ? 'empresa' : 'empresas'}
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="mt-3 flex gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            {grupo.matriz ? '1 Matriz' : 'Sem matriz'}
          </div>
          
          {grupo.totalFiliais > 0 && (
            <div className="flex items-center text-gray-600">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              {grupo.totalFiliais} {grupo.totalFiliais === 1 ? 'Filial' : 'Filiais'}
            </div>
          )}

          {grupo.fromCache && (
            <div className="flex items-center text-gray-500 ml-auto">
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="text-xs">Cache</span>
            </div>
          )}
        </div>
      </div>

      {/* Matriz */}
      {grupo.matriz && (
        <div
          className={`border-2 border-green-200 bg-green-50 rounded-lg p-4 ${
            onMatrizSelected ? 'cursor-pointer hover:border-green-400 transition-colors' : ''
          }`}
          onClick={() => onMatrizSelected && onMatrizSelected(grupo.matriz)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Badge Matriz */}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                  🏢 MATRIZ
                </span>
                
                <span className="text-xs text-gray-500 font-mono">
                  {grupo.matriz.cnpj}
                </span>
              </div>

              {/* Razão Social */}
              <h5 className="font-semibold text-gray-900 text-sm">
                {grupo.matriz.razao_social}
              </h5>

              {/* Nome Fantasia */}
              {grupo.matriz.nome_fantasia && (
                <p className="text-xs text-gray-600 mt-1">
                  {grupo.matriz.nome_fantasia}
                </p>
              )}

              {/* Detalhes (opcional) */}
              {showDetails && (
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  {grupo.matriz.situacao_cadastral && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {grupo.matriz.situacao_cadastral}
                    </div>
                  )}

                  {grupo.matriz.endereco?.municipio && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {grupo.matriz.endereco.municipio}/{grupo.matriz.endereco.uf}
                    </div>
                  )}

                  {grupo.matriz.telefone && (
                    <div className="flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {grupo.matriz.telefone}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ícone de seleção */}
            {onMatrizSelected && (
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Filiais */}
      {grupo.filiais.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Filiais ({grupo.totalFiliais})
          </h5>

          {grupo.filiais.map((filial, idx) => (
            <div
              key={filial.cnpj}
              className={`border border-blue-200 bg-blue-50 rounded-lg p-3 ${
                onFilialSelected ? 'cursor-pointer hover:border-blue-400 transition-colors' : ''
              }`}
              onClick={() => onFilialSelected && onFilialSelected(filial)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Badge Filial */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                      📍 FILIAL {parseInt(filial.ordem!) - 1}
                    </span>
                    
                    <span className="text-xs text-gray-500 font-mono">
                      {filial.cnpj}
                    </span>
                  </div>

                  {/* Razão Social */}
                  <h6 className="font-medium text-gray-900 text-sm">
                    {filial.razao_social}
                  </h6>

                  {/* Nome Fantasia */}
                  {filial.nome_fantasia && (
                    <p className="text-xs text-gray-600 mt-1">
                      {filial.nome_fantasia}
                    </p>
                  )}

                  {/* Detalhes (opcional) */}
                  {showDetails && filial.endereco?.municipio && (
                    <div className="mt-1 text-xs text-gray-500 flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {filial.endereco.municipio}/{filial.endereco.uf}
                    </div>
                  )}
                </div>

                {/* Ícone de seleção */}
                {onFilialSelected && (
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State - Sem filiais */}
      {grupo.totalFiliais === 0 && grupo.matriz && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-sm text-gray-500">
            Esta empresa não possui filiais cadastradas
          </p>
        </div>
      )}
    </div>
  );
}
