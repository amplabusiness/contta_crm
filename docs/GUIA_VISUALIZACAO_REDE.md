# Guia de Visualização de Rede Genealógica

## 📚 Biblioteca Escolhida: React Flow

### Por Que React Flow?

✅ **Vantagens**:
- Performance excelente (milhares de nós sem lag)
- Integração nativa com React (hooks, TypeScript)
- Drag & drop built-in
- Zoom e pan suaves
- Layouts automáticos
- Customização total de nodes e edges
- MiniMap e controles inclusos
- Documentação completa
- Comunidade ativa

❌ **Alternativas Descartadas**:
- **D3.js**: Curva de aprendizado íngreme, integração React complexa
- **Vis.js**: Performance inferior, customização limitada
- **Cytoscape.js**: Focado em grafos científicos, overkill

---

## 🚀 Instalação

```bash
npm install reactflow
```

**Dependências**: React 18+, React DOM 18+

---

## 📦 Componente Criado: `GenealogyNetwork.tsx`

### Funcionalidades Implementadas

1. **Nodes Customizados**:
   - 🏢 **EmpresaNode**: Card verde (Matriz) ou azul (Filial)
     - Badge tipo (Matriz/Filial N)
     - Situação cadastral (ATIVA/BAIXADA)
     - CNPJ formatado
     - Localização (cidade/UF)
   
   - 👤 **SocioNode**: Card roxo com avatar
     - Nome do sócio
     - Qualificação (Sócio-Administrador, etc)
     - % de participação

2. **Edges (Conexões)**:
   - Tipo `smoothstep` (curvas suaves)
   - Animadas para relações societárias
   - Label com % de participação
   - Cores diferenciadas por tipo

3. **Controles**:
   - ➕➖ Zoom in/out
   - 🔄 Fit view (ajustar ao tamanho)
   - 🔒 Lock (travar posições)
   - 🗺️ MiniMap (visão geral)

4. **Features Extras**:
   - Loading state com spinner
   - Error handling visual
   - Stats panel (total empresas, sócios, relações)
   - Legend (legenda visual)
   - Background com grid pontilhado
   - Panel de instruções (arrastar, zoom, clicar)

---

## 💻 Como Usar

### Uso Básico

```tsx
import GenealogyNetwork from '../components/GenealogyNetwork';

export default function NetworkView() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Rede Genealógica</h1>
      
      <GenealogyNetwork 
        cnpj="12345678000190" 
        maxDegree={3}
        autoLayout={true}
      />
    </div>
  );
}
```

### Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `cnpj` | string | - | CNPJ da empresa raiz (obrigatório) |
| `maxDegree` | number | 3 | Profundidade máxima (1-4 graus) |
| `autoLayout` | boolean | true | Layout automático circular por grau |

### Integração com API

O componente espera um endpoint `/api/genealogy`:

```typescript
// api/genealogy.ts
export default async function handler(req, res) {
  const { cnpj, degree } = req.query;
  
  // Buscar rede usando buildNetworkGraph (já implementado)
  const network = await buildNetworkGraph(cnpj, { maxDegree: degree });
  
  res.json({
    nodes: network.nodes,
    edges: network.edges,
    insights: network.insights
  });
}
```

**Formato de Dados Esperado**:

```typescript
// Response da API
{
  nodes: [
    {
      id: "12345678000190",           // CNPJ ou CPF
      type: "company" | "person",     // Tipo do node
      label: "EMPRESA MATRIZ LTDA",   // Nome para exibir
      degree: 1,                      // Grau (1-4)
      data: {
        // Dados específicos do node
        nome_fantasia: "Matriz Corp",
        cnpj: "12.345.678/0001-90",
        situacao_cadastral: "ATIVA",
        endereco: {
          cidade: "São Paulo",
          uf: "SP"
        }
      }
    }
  ],
  edges: [
    {
      from: "12345678912",        // ID do sócio
      to: "12345678000190",       // ID da empresa
      relationship: "socio",      // Tipo de relação
      strength: 0.7               // Força (0-1, opcional)
    }
  ]
}
```

---

## 🎨 Customização de Visual

### Alterar Cores dos Nodes

```tsx
// Em GenealogyNetwork.tsx, função EmpresaNode:

const isMatriz = badge?.type === 'matriz';

<div className={`
  px-4 py-3 shadow-lg rounded-lg border-2 
  ${isMatriz 
    ? 'bg-green-50 border-green-500'    // ← Altere aqui
    : 'bg-blue-50 border-blue-400'      // ← E aqui
  }
`}>
```

### Alterar Layout Automático

```tsx
// Layout hierárquico (árvore)
function calculatePosition(index: number, total: number, degree: number) {
  const y = degree * 200; // Vertical por grau
  const x = (index * 250) - ((total * 250) / 2); // Horizontal distribuído
  
  return { x, y };
}

// Layout force-directed (física)
// Use o hook useReactFlow() e chame layout.apply()
import { useReactFlow } from 'reactflow';
import dagre from 'dagre';

const { fitView } = useReactFlow();

// Aplicar layout Dagre
const g = new dagre.graphlib.Graph();
g.setDefaultEdgeLabel(() => ({}));
// ... configurar graph
dagre.layout(g);
```

### Adicionar Interatividade

```tsx
// Click em node para abrir detalhes
const onNodeClick = useCallback((event, node) => {
  console.log('Node clicado:', node);
  
  if (node.type === 'empresa') {
    // Navegar para detalhes da empresa
    navigate(`/empresas/${node.id}`);
  } else {
    // Exibir modal com dados do sócio
    setSelectedSocio(node.data);
    setShowModal(true);
  }
}, []);

<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodeClick={onNodeClick}
  // ... outras props
/>
```

---

## 📊 Exemplos de Uso

### 1. Integrar no componente `Vinculos.tsx`

```tsx
// components/Vinculos.tsx
import { useState } from 'react';
import GenealogyNetwork from './GenealogyNetwork';

export default function Vinculos() {
  const [selectedCnpj, setSelectedCnpj] = useState('');
  const [maxDegree, setMaxDegree] = useState(3);

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Digite o CNPJ"
          value={selectedCnpj}
          onChange={(e) => setSelectedCnpj(e.target.value)}
          className="border rounded px-4 py-2"
        />
        
        <select
          value={maxDegree}
          onChange={(e) => setMaxDegree(Number(e.target.value))}
          className="border rounded px-4 py-2"
        >
          <option value={1}>1º Grau</option>
          <option value={2}>2º Grau</option>
          <option value={3}>3º Grau</option>
          <option value={4}>4º Grau</option>
        </select>
        
        <button
          onClick={() => {/* forçar reload */}}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Buscar Rede
        </button>
      </div>

      {selectedCnpj && (
        <GenealogyNetwork 
          cnpj={selectedCnpj} 
          maxDegree={maxDegree}
        />
      )}
    </div>
  );
}
```

### 2. Usar em Modal

```tsx
// components/EmpresaDetalhe.tsx
import { useState } from 'react';
import GenealogyNetwork from './GenealogyNetwork';

export default function EmpresaDetalhe({ empresa }) {
  const [showNetwork, setShowNetwork] = useState(false);

  return (
    <div>
      {/* ... outros detalhes da empresa */}
      
      <button
        onClick={() => setShowNetwork(true)}
        className="mt-4 bg-purple-500 text-white px-4 py-2 rounded"
      >
        🌳 Ver Rede Genealógica
      </button>

      {showNetwork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Rede de {empresa.razao_social}</h2>
              <button
                onClick={() => setShowNetwork(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ Fechar
              </button>
            </div>
            
            <GenealogyNetwork cnpj={empresa.cnpj} />
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Exportar como Imagem

```tsx
import { toPng } from 'html-to-image';
import { useReactFlow } from 'reactflow';

function ExportButton() {
  const { getNodes } = useReactFlow();

  const exportAsImage = async () => {
    const nodeElement = document.querySelector('.react-flow');
    
    if (nodeElement) {
      const dataUrl = await toPng(nodeElement);
      
      // Download
      const link = document.createElement('a');
      link.download = 'rede-genealogica.png';
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <button onClick={exportAsImage}>
      📸 Exportar como PNG
    </button>
  );
}
```

---

## 🔧 Otimizações de Performance

### 1. Virtualização (Muitos Nodes)

```tsx
// Renderizar apenas nodes visíveis no viewport
<ReactFlow
  nodes={nodes}
  edges={edges}
  onlyRenderVisibleElements={true}  // ← Ativa virtualização
  minZoom={0.1}
  maxZoom={4}
/>
```

### 2. Lazy Loading de Dados

```tsx
// Carregar graus sob demanda
const [currentDegree, setCurrentDegree] = useState(1);

async function expandNode(nodeId) {
  // Buscar apenas filhos diretos deste node
  const children = await fetch(`/api/genealogy/expand?node=${nodeId}`);
  
  setNodes([...nodes, ...children.nodes]);
  setEdges([...edges, ...children.edges]);
  setCurrentDegree(currentDegree + 1);
}

// Click em node para expandir
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodeClick={(e, node) => {
    if (node.data.hasChildren) {
      expandNode(node.id);
    }
  }}
/>
```

### 3. Debounce em Buscas

```tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback((cnpj) => {
  loadNetwork(cnpj);
}, 500);

<input 
  onChange={(e) => debouncedSearch(e.target.value)}
/>
```

---

## 📚 Recursos Adicionais

### Documentação Oficial React Flow
https://reactflow.dev/docs/

### Exemplos Interativos
https://reactflow.dev/examples/

### Custom Nodes
https://reactflow.dev/docs/examples/nodes/custom-node/

### Layouts Avançados
https://reactflow.dev/docs/examples/layout/dagre/

---

## 🐛 Troubleshooting

### Erro: "Module not found: reactflow"
```bash
npm install reactflow
```

### Erro: "Cannot read property 'getNodes' of undefined"
Certifique-se de que hooks do React Flow são usados dentro de `<ReactFlowProvider>`:

```tsx
import { ReactFlowProvider } from 'reactflow';

<ReactFlowProvider>
  <GenealogyNetwork cnpj="..." />
</ReactFlowProvider>
```

### Nodes não aparecem
Verifique se `position` está definido ou se `fitView` está ativo:

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  fitView  // ← Adicione isto
/>
```

### Performance ruim com muitos nodes
- Ative virtualização: `onlyRenderVisibleElements={true}`
- Reduza `maxDegree`
- Use lazy loading

---

## ✅ Checklist de Implementação

- [x] Biblioteca React Flow instalada
- [x] Componente `GenealogyNetwork.tsx` criado
- [x] Custom nodes (Empresa, Sócio) implementados
- [x] Loading e error states
- [x] Stats panel
- [x] Legend
- [x] Controls e MiniMap
- [ ] API endpoint `/api/genealogy` (TODO)
- [ ] Integração com `buildNetworkGraph` (TODO)
- [ ] Testes com dados reais (TODO)
- [ ] Click handlers para navegação (TODO)
- [ ] Export como imagem (TODO)

---

**Próximos Passos**:
1. Criar endpoint `/api/genealogy`
2. Conectar com `buildNetworkGraph` existente
3. Testar com dados reais
4. Adicionar interatividade (click, hover)
5. Implementar export de imagem
