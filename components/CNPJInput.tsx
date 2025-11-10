import React from 'react';
import { useAutoCNPJLookup } from '../hooks/useCNPJLookup';
import { useCNPJGroup } from '../hooks/useCNPJGroup';
import CNPJGroupDisplay from './CNPJGroupDisplay';

interface CNPJInputProps {
  onEmpresaLoaded?: (empresa: any, socios: any[]) => void;
  onError?: (error: string) => void;
  className?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  showGroupInfo?: boolean; // Mostrar matriz/filiais automaticamente
}

/**
 * Componente de Input de CNPJ com Auto-Complete
 * 
 * Funcionalidades:
 * - Formatação automática: 00.000.000/0000-00
 * - Busca automática ao completar 14 dígitos
 * - Loading indicator visual
 * - Preview de dados encontrados
 * - Tratamento de erros amigável
 * - Exibição automática de matriz/filiais (opcional)
 * 
 * @example
 * <CNPJInput
 *   label="CNPJ da Empresa"
 *   showGroupInfo={true}
 *   onEmpresaLoaded={(empresa, socios) => {
 *     setFormData({ ...formData, ...empresa });
 *   }}
 * />
 */
export default function CNPJInput({
  onEmpresaLoaded,
  onError,
  className = '',
  placeholder = '00.000.000/0000-00',
  label = 'CNPJ',
  required = false,
  showGroupInfo = false
}: CNPJInputProps) {
  const [showGroup, setShowGroup] = React.useState(false);
  
  const {
    cnpjFormatted,
    handleCNPJChange,
    empresa,
    socios,
    loading,
    error,
    isFromCache
  } = useAutoCNPJLookup();

  const { grupo, loading: groupLoading, findGroup } = useCNPJGroup();

  // Notificar parent quando dados carregados
  React.useEffect(() => {
    if (empresa && onEmpresaLoaded) {
      onEmpresaLoaded(empresa, socios);
    }
  }, [empresa, socios, onEmpresaLoaded]);

  // Buscar grupo automaticamente quando empresa carregada
  React.useEffect(() => {
    if (empresa && showGroupInfo && empresa.cnpj) {
      findGroup(empresa.cnpj);
    }
  }, [empresa, showGroupInfo, findGroup]);

  // Notificar parent quando erro
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  return (
    <div className={`cnpj-input-container ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <input
          type="text"
          value={cnpjFormatted}
          onChange={handleCNPJChange}
          placeholder={placeholder}
          required={required}
          maxLength={18} // 00.000.000/0000-00
          className={`
            w-full px-4 py-2 border rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${loading ? 'bg-gray-50' : 'bg-white'}
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${empresa ? 'border-green-500' : ''}
          `}
          disabled={loading}
        />

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5 text-blue-500"
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
          </div>
        )}

        {/* Success Icon */}
        {empresa && !loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-start text-sm text-red-600">
          <svg
            className="h-4 w-4 mt-0.5 mr-1 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Success Preview */}
      {empresa && !error && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                {empresa.razao_social}
              </p>
              
              {empresa.nome_fantasia && (
                <p className="text-xs text-green-700 mt-1">
                  Nome Fantasia: {empresa.nome_fantasia}
                </p>
              )}
              
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {empresa.situacao_cadastral && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800">
                    {empresa.situacao_cadastral}
                  </span>
                )}
                
                {empresa.porte_empresa && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {empresa.porte_empresa}
                  </span>
                )}
                
                {socios && socios.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    👥 {socios.length} sócio{socios.length > 1 ? 's' : ''}
                  </span>
                )}
                
                {isFromCache && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    📦 Cache
                  </span>
                )}
              </div>

              {/* Sócios Preview */}
              {socios && socios.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-green-700 cursor-pointer hover:text-green-800">
                    Ver sócios ({socios.length})
                  </summary>
                  <ul className="mt-1 space-y-1 ml-4">
                    {socios.slice(0, 5).map((socio, idx) => (
                      <li key={idx} className="text-xs text-green-700">
                        • {socio.nome} - {socio.qualificacao}
                      </li>
                    ))}
                    {socios.length > 5 && (
                      <li className="text-xs text-green-600 italic">
                        ... e mais {socios.length - 5} sócio{socios.length - 5 > 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                </details>
              )}

              {/* Grupo Empresarial Toggle */}
              {showGroupInfo && grupo && grupo.totalEmpresas > 1 && (
                <button
                  type="button"
                  onClick={() => setShowGroup(!showGroup)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                  {showGroup ? (
                    <>
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Ocultar grupo empresarial
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Ver grupo empresarial ({grupo.totalEmpresas} empresas)
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grupo Empresarial Display */}
      {showGroupInfo && showGroup && empresa && (
        <div className="mt-3">
          <CNPJGroupDisplay
            cnpj={empresa.cnpj}
            autoLoad={false} // Já carregamos via useEffect
            showDetails={true}
          />
        </div>
      )}

      {/* Loading State Text */}
      {loading && (
        <p className="mt-2 text-sm text-gray-500 flex items-center">
          <svg
            className="animate-spin h-4 w-4 mr-1"
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
          Buscando dados da empresa...
        </p>
      )}
    </div>
  );
}
