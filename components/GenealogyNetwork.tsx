import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CNPJUtils } from '../hooks/useCNPJGroup';

// Custom Node Components
import { Handle, Position } from 'reactflow';

/**
 * Node customizado para Empresas
 */
function EmpresaNode({ data }: { data: any }) {
  const badge = data.cnpj ? CNPJUtils.getTipoBadge(data.cnpj) : null;
  const isMatriz = badge?.type === 'matriz';
  
  return (
    <div 
      className={`px-4 py-3 shadow-lg rounded-lg border-2 min-w-[200px] ${
        isMatriz 
          ? 'bg-green-50 border-green-500' 
          : 'bg-blue-50 border-blue-400'
      }`}
    >
      <Handle 
        type="target" 
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />
      
      <div className="flex items-start gap-2">
        <div className={`rounded-full w-10 h-10 flex justify-center items-center ${
          isMatriz ? 'bg-green-200' : 'bg-blue-200'
        }`}>
          {isMatriz ? '🏢' : '🏪'}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-900 truncate">
            {data.label}
          </div>
          
          {data.nome_fantasia && (
            <div className="text-xs text-gray-600 truncate mt-0.5">
              {data.nome_fantasia}
            </div>
          )}
          
          <div className="flex gap-1 mt-1 flex-wrap">
            {badge && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                isMatriz 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 text-white'
              }`}>
                {badge.label}
              </span>
            )}
            
            {data.situacao_cadastral && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                data.situacao_cadastral === 'ATIVA'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {data.situacao_cadastral}
              </span>
            )}
          </div>
          
          {data.cnpj && (
            <div className="text-xs text-gray-500 font-mono mt-1">
              {data.cnpj}
            </div>
          )}

          {data.endereco?.cidade && (
            <div className="text-xs text-gray-500 mt-1">
              📍 {data.endereco.cidade}/{data.endereco.uf}
            </div>
          )}
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
}

/**
 * Node customizado para Sócios/Pessoas
 */
function SocioNode({ data }: { data: any }) {
  return (
    <div className="px-3 py-2 shadow-md rounded-lg bg-purple-50 border-2 border-purple-400 min-w-[150px]">
      <Handle 
        type="target" 
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500"
      />
      
      <div className="flex items-center gap-2">
        <div className="rounded-full w-8 h-8 flex justify-center items-center bg-purple-200">
          👤
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-900 truncate">
            {data.label}
          </div>
          
          {data.qualificacao && (
            <div className="text-xs text-gray-600 truncate">
              {data.qualificacao}
            </div>
          )}
          
          {data.participacao && (
            <div className="text-xs font-medium text-purple-700 mt-0.5">
              {data.participacao}%
            </div>
          )}
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom}
        className="w-3 h-3 !bg-purple-500"
      />
    </div>
  );
}

// Tipos de nodes customizados
const nodeTypes = {
  empresa: EmpresaNode,
  socio: SocioNode,
};

interface GenealogyNetworkProps {
  cnpj: string;
  maxDegree?: number; // Profundidade máxima (1-4)
  autoLayout?: boolean;
}

/**
 * Componente de Visualização de Rede Genealógica
 * 
 * Exibe empresas e sócios em grafo interativo até 4º grau
 * 
 * @example
 * <GenealogyNetwork 
 *   cnpj="12345678000190" 
 *   maxDegree={3}
 *   autoLayout={true}
 * />
 */
export default function GenealogyNetwork({
  cnpj,
  maxDegree = 3,
  autoLayout = true
}: GenealogyNetworkProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ empresas: 0, socios: 0, relacoes: 0 });

  // Buscar dados da rede
  useEffect(() => {
    async function loadNetwork() {
      setLoading(true);
      setError(null);

      try {
        console.log(`🌳 Carregando rede genealógica: ${cnpj}, grau ${maxDegree}`);
        
        const response = await fetch(`/api/genealogy?cnpj=${cnpj}&degree=${maxDegree}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao buscar rede genealógica');
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Erro desconhecido');
        }

        console.log(`✅ Rede carregada:`, data.stats);
        
        // Converter dados para formato React Flow
        const flowNodes = convertToFlowNodes(data.nodes);
        const flowEdges = convertToFlowEdges(data.edges);

        setNodes(flowNodes);
        setEdges(flowEdges);
        
        setStats({
          empresas: data.stats.empresas,
          socios: data.stats.socios,
          relacoes: data.stats.relacoes
        });
        
      } catch (err: any) {
        console.error('❌ Erro ao carregar rede:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (cnpj) {
      loadNetwork();
    }
  }, [cnpj, maxDegree]);

  // Converter nodes do formato backend para React Flow
  function convertToFlowNodes(backendNodes: any[]): Node[] {
    return backendNodes.map((node, index) => {
      const isCompany = node.type === 'company';
      
      return {
        id: node.id,
        type: isCompany ? 'empresa' : 'socio',
        data: {
          label: node.label,
          ...node.data,
        },
        position: autoLayout 
          ? calculatePosition(index, backendNodes.length, node.degree)
          : node.position || { x: 0, y: 0 },
      };
    });
  }

  // Converter edges do formato backend para React Flow
  function convertToFlowEdges(backendEdges: any[]): Edge[] {
    return backendEdges.map((edge) => ({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      label: edge.relationship === 'socio' 
        ? `Sócio ${edge.strength ? Math.round(edge.strength * 100) + '%' : ''}`
        : edge.relationship,
      type: 'smoothstep',
      animated: edge.relationship === 'socio',
      style: {
        stroke: edge.relationship === 'socio' ? '#8b5cf6' : '#94a3b8',
        strokeWidth: 2,
      },
      labelStyle: {
        fontSize: 10,
        fill: '#6b7280',
      },
    }));
  }

  // Layout automático simples (circular por grau)
  function calculatePosition(index: number, total: number, degree: number) {
    const radius = 150 * degree;
    const angle = (2 * Math.PI * index) / total;
    
    return {
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
    };
  }

  // Mock data para desenvolvimento
  function loadMockData() {
    const mockNodes: Node[] = [
      {
        id: '12345678000190',
        type: 'empresa',
        data: {
          label: 'EMPRESA MATRIZ LTDA',
          nome_fantasia: 'Matriz Corp',
          cnpj: '12.345.678/0001-90',
          situacao_cadastral: 'ATIVA',
          endereco: { cidade: 'São Paulo', uf: 'SP' }
        },
        position: { x: 400, y: 50 },
      },
      {
        id: '12345678912',
        type: 'socio',
        data: {
          label: 'João Silva',
          qualificacao: 'Sócio-Administrador',
          participacao: 70,
        },
        position: { x: 200, y: 250 },
      },
      {
        id: '98765432198',
        type: 'socio',
        data: {
          label: 'Maria Santos',
          qualificacao: 'Sócia',
          participacao: 30,
        },
        position: { x: 600, y: 250 },
      },
      {
        id: '98765432000110',
        type: 'empresa',
        data: {
          label: 'EMPRESA FILIAL 1 LTDA',
          cnpj: '12.345.678/0002-71',
          situacao_cadastral: 'ATIVA',
          endereco: { cidade: 'Rio de Janeiro', uf: 'RJ' }
        },
        position: { x: 200, y: 450 },
      },
    ];

    const mockEdges: Edge[] = [
      {
        id: 'e1',
        source: '12345678912',
        target: '12345678000190',
        label: 'Sócio 70%',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
      },
      {
        id: 'e2',
        source: '98765432198',
        target: '12345678000190',
        label: 'Sócia 30%',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
      },
      {
        id: 'e3',
        source: '12345678912',
        target: '98765432000110',
        label: 'Sócio',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
      },
    ];

    setNodes(mockNodes);
    setEdges(mockEdges);
    setStats({ empresas: 2, socios: 2, relacoes: 3 });
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-500"
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
          <p className="text-gray-600">Mapeando rede genealógica...</p>
          <p className="text-sm text-gray-500 mt-2">
            Buscando empresas e sócios até {maxDegree}º grau
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-red-50 rounded-lg">
        <div className="text-center max-w-md">
          <svg
            className="h-12 w-12 mx-auto mb-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Erro ao carregar rede
          </h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Stats Panel */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Estatísticas da Rede</h3>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-gray-600">{stats.empresas} Empresas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span className="text-gray-600">{stats.socios} Sócios</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            <span className="text-gray-600">{stats.relacoes} Relações</span>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
  <div className="h-[600px] bg-gray-50 rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              if (node.type === 'empresa') return '#3b82f6';
              if (node.type === 'socio') return '#a855f7';
              return '#94a3b8';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          
          <Panel position="top-right">
            <div className="bg-white rounded-lg shadow-lg p-3">
              <div className="text-xs text-gray-600">
                <p>🖱️ Arraste para mover</p>
                <p>🔍 Scroll para zoom</p>
                <p>👆 Clique para selecionar</p>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <h4 className="font-semibold text-gray-900 mb-2 text-sm">Legenda</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 border-2 border-green-500 rounded flex items-center justify-center">
              🏢
            </div>
            <span className="text-gray-600">Matriz</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 border-2 border-blue-400 rounded flex items-center justify-center">
              🏪
            </div>
            <span className="text-gray-600">Filial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 border-2 border-purple-400 rounded flex items-center justify-center">
              👤
            </div>
            <span className="text-gray-600">Sócio/Pessoa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-8 bg-purple-500 animate-pulse"></div>
            <span className="text-gray-600">Participação societária</span>
          </div>
        </div>
      </div>
    </div>
  );
}
