# Manual Técnico - Frontend Contta CRM

## 1. Visão Geral

Este documento detalha a arquitetura técnica, as convenções e os principais componentes do frontend do Contta CRM. O objetivo é servir como um guia para desenvolvedores que trabalham na manutenção ou expansão do projeto.

## 2. Tecnologias e Stack

-   **Framework Principal**: React 19 (utilizando Hooks)
-   **Linguagem**: TypeScript
-   **Estilização**: Tailwind CSS com classes de utilitário. Estilos globais e customizações pontuais estão no `<style>` de `index.html`.
-   **Bibliotecas de Gráficos**: Recharts
-   **Geração de PDF**: jspdf & html2canvas (carregados via CDN)
-   **Mapas**: Leaflet & Leaflet.markercluster (carregados via CDN)
-   **Inteligência Artificial**: SDK `@google/genai` para interação com a API Gemini.

## 3. Estrutura do Projeto

O projeto segue uma estrutura organizada por funcionalidade e tipo de arquivo.

```
/
├── components/          # Componentes reutilizáveis e de visualização
│   ├── icons/           # Ícones SVG como componentes React
│   └── ...              # Ex: Dashboard.tsx, Prospeccao.tsx, etc.
├── data/                # Dados mockados estáticos
│   └── mockData.ts
├── services/            # Lógica de negócio e comunicação com APIs
│   ├── apiService.ts    # Simula chamadas para a API do CRM (backend)
│   ├── geminiService.ts # Centraliza todas as chamadas para a API Gemini
│   ├── cnpjaService.ts  # Lógica para buscar dados de empresas
│   └── ...              # Outros serviços específicos
├── App.tsx              # Componente principal, gerencia a navegação
├── index.tsx            # Ponto de entrada da aplicação React
├── types.ts             # Definições de tipos e interfaces TypeScript
├── index.html           # Arquivo HTML principal, onde a app é montada
└── ...
```

## 4. Principais Componentes

-   **`App.tsx`**: O coração da aplicação. Gerencia o estado da visualização atual (`currentView`) e renderiza o componente correspondente. É responsável pelo layout principal, incluindo `Sidebar` e `Header`.
-   **`Sidebar.tsx`**: A barra de navegação lateral. Define os itens do menu e controla a navegação entre as diferentes `Views`.
-   **`Header.tsx`**: O cabeçalho da aplicação. Contém a busca global inteligente, notificações e informações do usuário.
-   **`Dashboard.tsx`**: A tela inicial, que agrega múltiplos componentes menores (`StatCard`, `SalesChart`, `AIAssistant`) para fornecer uma visão geral.
-   **`Prospeccao.tsx`**: Tela principal de prospecção. Gerencia a busca, filtragem e paginação de empresas. Utiliza o `EmpresaCard` para exibir cada prospect.
-   **`EmpresaDetalhe.tsx`**: Uma visão 360º de um cliente ou prospect, com múltiplas abas para diferentes tipos de análise (Plano de Ação, Rede de Contatos, Dados Públicos, etc.).
-   **`Negocios.tsx`**: Implementa o funil de vendas no estilo Kanban, onde cada coluna representa um estágio do negócio.

## 5. Serviços e Lógica de Negócio

A lógica de negócio é abstraída em serviços dentro da pasta `/services`.

-   **`apiService.ts`**: Simula a camada de comunicação com o backend. Todas as funções aqui (ex: `fetchDeals`, `fetchTasks`) devem ser substituídas por chamadas a uma API real (ex: `fetch('/api/deals')`).
-   **`geminiService.ts`**: Ponto central para todas as interações com a IA do Gemini. Cada função é projetada para uma tarefa específica (ex: `getSalesInsights`, `generateProspectAnalysis`), encapsulando o prompt e a configuração da chamada à API.
-   **`cnpjaService.ts`**: Simula a busca de dados detalhados de empresas a partir de um CNPJ. Atualmente, usa os dados de `mockData.ts`.
-   **`geolocationService.ts`**: Fornece utilitários para geolocalização, como obter coordenadas a partir de um CEP e calcular distâncias.
-   **`googleApiService.ts`**: Simula a integração com as APIs do Google Workspace (Calendar, Gmail). Gerencia um estado de autenticação falso para fins de desenvolvimento.

## 6. Gerenciamento de Estado

O estado é gerenciado primariamente através dos hooks do React (`useState`, `useEffect`, `useCallback`, `useMemo`). O estado global, como a visão atual, é mantido no componente `App.tsx` e passado para os componentes filhos via props (ex: `navigate`).

## 7. Convenções de Código

-   **Componentes**: PascalCase (ex: `StatCard.tsx`).
-   **Tipos**: PascalCase (ex: `interface Empresa`).
-   **Funções e Variáveis**: camelCase (ex: `fetchDeals`).
-   **Importações**: Organizadas com importações de bibliotecas primeiro, seguidas por importações locais. Usar caminhos relativos e incluir extensões de arquivo (`.ts`, `.tsx`).
-   **Estilo**: Seguir as convenções do Tailwind CSS. Evitar CSS inline sempre que possível.
