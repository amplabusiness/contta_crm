# Roadmap de Integração Backend

> Guia de execução para conectar supabase, funções Vercel e frontend (AI Studio)

## Fase 1 – Base Supabase
- [x] Confirmar execução do `supabase-schema.sql` e políticas RLS ativas
- [ ] Validar `.env.local` e variáveis na Vercel (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`)
- [ ] Revisar `services/supabaseClient.ts` e garantir conexão com `@supabase/supabase-js` seguindo a doc do Context7
- [ ] Registrar scripts operacionais (`scripts/setup-database.js`, `scripts/load-cnpjs.js`) e acessos via MCP para auditoria

## Fase 2 – Endpoints Core
- [ ] `/api/deals`: CRUD completo com joins em `empresas` e `profiles` (GET/POST/PATCH prontos; revisar DELETE/CORS)
- [ ] `/api/tasks`: CRUD com desnormalização de `related_deal_name` (GET/POST/PATCH prontos; revisar delete/cors)
- [ ] `/api/dashboard-data`: agregar estatísticas (stat cards, funil, atividades) e fallback da IA Gemini
- [ ] `/api/team`, `/api/prospects`, `/api/analytics-data`: definir queries Supabase + integração Gemini conforme necessidade
- [ ] Consultar Context7 quando ajustar limites de memória/duração das Serverless da Vercel

## Fase 3 – Integração Frontend
- [ ] Substituir mocks em `services/apiService.ts` por chamadas reais (Deals, Tasks, Dashboard, Team, Prospects)
- [ ] Atualizar componentes (`components/Prospeccao.tsx`, `components/Negocios.tsx`, `components/Tarefas.tsx`, `components/Dashboard.tsx`) para os novos campos
- [ ] Implementar feedback de loading e erros com dados vindos do backend
- [ ] Validar paginação, filtros e ordenação com queries Supabase

## Fase 4 – Autenticação e Segurança
- [ ] Implementar fluxo Supabase Auth no frontend (login, sessão, sign-out)
- [ ] Adicionar validação de token nos endpoints sensíveis (`/api/tasks`, `/api/deals`, etc.)
- [ ] Revisar políticas RLS para perfis Admin/User e cobrir com testes básicos
- [ ] Registrar procedimentos de auditoria via MCP para alterações em políticas ou dados críticos

## Fase 5 – Qualidade e Deploy
- [ ] Criar scripts de seed/test (aproveitando MCP quando aplicável)
- [ ] Testar `vercel dev` e deploy; monitorar invocações/duração das funções
- [ ] Documentar endpoints e payloads atualizados em `BACKEND_DOCUMENTATION.md`
- [ ] Executar checklist final e handoff
