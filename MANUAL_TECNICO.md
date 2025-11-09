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
Você é um engenheiro sênior encarregado de levar o Contta CRM para produção. Trabalhe dentro do repositório atual (Vite + React 19 + Tailwind) e siga rigorosamente estas orientações:

Contexto e fontes obrigatórias
- Leia e consulte continuamente os guias: COMECE_AQUI.md, GUIA_RAPIDO_CONTADOR.md, GUIA_ENV.md, SETUP.md, README_SETUP.md, PROXIMOS_PASSOS.md, ROADMAP_COMPLETO.md, ROADMAP_IMPLANTACAO_COMPLETO.md, ROADMAP_BACKEND_INTEGRACAO.md e BACKEND_DOCUMENTATION.md. Eles descrevem fluxo operativo, checklists, RLS e scripts obrigatórios.
- Toda alteração estrutural em Supabase (tabela, RLS, seed) deve ser registrada via fluxo MCP descrito em MCP_AUDITORIA.md (use `npx mcp ...` e logue em `logs/audit-log.ndjson`).
- Use os scripts em `scripts/` (setup-db, load-cnpjs, seed-demo-data, qa-queries, qa-rls) para preparar dados reais antes de validar UI.

Objetivos técnicos
1. Elimine totalmente qualquer dependência de mocks:
   - Revise `services/apiService.ts` e `data/mockData.ts`. Todas as funções (`fetchDashboardData`, `fetchProspectCompanies`, `fetchDeals`, `fetchTasks`, `fetchAnalyticsData`, `executeGlobalSearch`, etc.) devem consumir apenas endpoints reais (`/api/dashboard-data`, `/api/prospects`, `/api/deals`, `/api/tasks`, `/api/analytics-data`, `/api/team`, `/api/reports`, `/api/compliance`, `/api/indicacoes`). Remova fallbacks e normalize respostas para bater com `types.ts`.
   - Garanta que componentes (ex.: `Dashboard.tsx`, `Prospeccao.tsx`, `Negocios.tsx`, `Tarefas.tsx`, `Analytics.tsx`, `ReportGenerationModal.tsx`, `Indicacoes.tsx`, `Compliance.tsx`, `Header.tsx`) tratem loading/erro reais.

2. Confirmar Supabase + RLS:
   - Valide `supabase-schema.sql` contra `types.ts` (ex.: `Deal` agora aceita `createdAt?: string`).
   - Rode `npm run setup-db` ou `scripts/setup-database.js` e aplique no Supabase.
   - Use `scripts/qa-rls.js` para garantir que políticas permitem apenas o esperado (Admins vs Users). Registre qualquer mudança com MCP.

3. Backend Vercel:
   - Cada arquivo em `api/` deve validar input, autenticar via `api/_lib/auth.ts`, aplicar CORS padronizado e retornar erros significativos.
   - Certifique-se de que rotas cobrem todos os casos de uso descritos em `BACKEND_DOCUMENTATION.md` (CRUD deals/tasks/team, prospects com sÓcios, analytics, dashboard, compliance, indicações, relatórios com Gemini, cnpj-lookup).
   - Adapte o mapeamento para novos campos (ex.: `created_at -> createdAt` em `api/deals.ts`) e mantenha consistência com o front.

4. Integração Gemini:
   - `services/geminiService.ts` já expõe helpers (insights, análises, copilotos, relatórios, mapas). Certifique-se de que cada funcionalidade disponível na UI chame esses helpers passando prompts contextualizados (ex.: insights do dashboard, análises de prospect, assistente de comunicação). 
   - Considere adicionar novas rotinas IA onde fizer sentido (ex.: sugerir próximas tarefas, ajustar roteiros em Negócios, revisar compliance). Sempre valide a presença de `GEMINI_API_KEY` e trate erros com fallback informativo, nunca com mocks.

5. Experiência end-to-end:
   - Rode `npm install`, `npm run build`, `npx vercel dev --yes` e execute smoke tests navegando por todas as views autenticadas (use Supabase Auth real).
   - Verifique logs de cada rota serverless, garantindo que leituras/escritas batem no banco preenchido via scripts `load-cnpjs` e `seed-demo-data`.
   - Documente qualquer requisito operacional adicional diretamente nos .md apropriados.

6. Qualidade e engenharia:
   - Siga padrões de código existentes (React hooks, Tailwind, TypeScript estrito). Mantenha imports com extensões explícitas.
   - Adicione logs úteis e mensagens de erro amigáveis, mas nunca exponha segredos.
   - Antes de finalizar, execute `npm run lint` (se disponível), `npm run build` e os scripts QA (queries/RLS). Inclua instruções de verificação no PR.
   - Não esqueça de atualizar `tsconfig.json`, `vercel.json` e `.env` templates se surgirem novas variáveis ou caminhos.

Checklist final
- [ ] Zero mocks referenciados no front/back.
- [ ] Banco Supabase alinhado ao schema + RLS verificados + logs MCP atualizados.
- [ ] Todos os endpoints `/api/*` respondem com dados reais e estão cobertos no front.
- [ ] Fluxos Gemini funcionam com prompt engineering consistente e fallback seguro.
- [ ] Build (`npm run build`) e execução (`npx vercel dev --yes`) passam sem erros.
- [ ] Documentação (.md) ajustada informando nova arquitetura ou passos adicionais.
- [ ] PR preparado com testes verificados e instruções claras para reviewers.

Siga essas etapas, registrando cada mudança relevante e garantindo que a aplicação entregue dados reais em produção.
