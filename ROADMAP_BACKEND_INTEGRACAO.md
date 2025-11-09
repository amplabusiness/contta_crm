# Roadmap de Integração Backend

> Guia de execução para conectar supabase, funções Vercel e frontend (AI Studio)

## Fase 1 – Base Supabase
- [x] Confirmar execução do `supabase-schema.sql` e políticas RLS ativas
- [x] Validar `.env.local` e variáveis na Vercel (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`) *(produção/preview/development atualizados para SUPABASE_URL/SERVICE_KEY/VITE_SUPABASE_*/GEMINI_API_KEY; `.env.local` sincronizado via Vercel CLI)*
- [x] Revisar `services/supabaseClient.ts` e garantir conexão com `@supabase/supabase-js` seguindo a doc do Context7
- [x] Registrar scripts operacionais (`scripts/setup-database.js`, `scripts/load-cnpjs.js`) e acessos via MCP para auditoria *(detalhado em BACKEND_DOCUMENTATION.md)*

## Fase 2 – Endpoints Core
- [x] `/api/deals`: CRUD completo com joins em `empresas` e `profiles` *(DELETE adicionado, CORS e validações revisados)*
- [x] `/api/tasks`: CRUD com desnormalização de `related_deal_name` *(DELETE incluído, validações e CORS padronizados)*
- [x] `/api/dashboard-data`: agregar estatísticas (stat cards, funil, atividades) e fallback da IA Gemini *(insightsHtml gerado quando Gemini disponível)*
- [x] `/api/team`: CRUD Supabase (GET/POST/PATCH/DELETE) com normalização de campos
- [x] `/api/prospects`: consulta paginada com sócios e upsert integrado
- [x] `/api/analytics-data`: agregações determinísticas + relatório Gemini (fallback seguro)
- [x] Consultar Context7 quando ajustar limites de memória/duração das Serverless da Vercel *(doc "Vercel Functions Limits" consultado em 08/11/2025 — Hobby: até 2 GB/300s, Pro/Ent: até 4 GB/800s; Edge exige primeira resposta <25s)*

## Fase 3 – Integração Frontend
- [x] Substituir mocks em `services/apiService.ts` por chamadas reais (Deals, Tasks, Dashboard, Team, Prospects, Analytics)
- [x] Atualizar componentes (`components/Prospeccao.tsx`, `components/Negocios.tsx`, `components/Tarefas.tsx`, `components/Dashboard.tsx`, `components/Analytics.tsx`, `components/Header.tsx`) para os novos campos
- [x] Implementar feedback de loading e erros com dados vindos do backend
- [x] Validar paginação, filtros e ordenação com queries Supabase (execução end-to-end com QA)
- [x] Remover dependências remanescentes de mocks (compliance, indicações, relatórios simulados) substituindo por endpoints reais

## Fase 4 – Autenticação e Segurança
- [x] Implementar fluxo Supabase Auth no frontend (login, sessão, sign-out) *(AuthProvider + LoginView integrados; `App.tsx` protege conteúdo e Header/Sidebar exibem sessão com sign-out)*
- [x] Adicionar validação de token nos endpoints sensíveis (`/api/tasks`, `/api/deals`, etc.) *(helper `api/_lib/auth.ts` valida Bearer; `tasks.ts`, `deals.ts` e `team.ts` exigem sessão; frontend injeta Authorization via `authorizedFetch`)*
- [x] Revisar políticas RLS para perfis Admin/User e cobrir com testes básicos *(`supabase-schema.sql` atualizado com políticas; `scripts/qa-rls.js` valida mutações-permitidas/bloqueadas via `npm run qa:rls`)*
- [x] Registrar procedimentos de auditoria via MCP para alterações em políticas ou dados críticos *(`MCP_AUDITORIA.md` descreve fluxo; `logs/audit-log.ndjson` usado pelos comandos `npx mcp call filesystem.appendFile`)*

## Fase 5 – Qualidade e Deploy
- [x] Criar scripts de seed/test (aproveitando MCP quando aplicável) *(`scripts/seed-demo-data.js` popula dados [SEED]; `npm run seed:demo`/`--reset`/`--dry-run` documentados em BACKEND_DOCUMENTATION.md)*
- [x] Testar `vercel dev` e deploy; monitorar invocações/duração das funções *(projeto `vercel link`; `npx vercel dev --yes` operacional na porta 3000, com fallback automático; vars sincronizadas via `vercel env add/pull`)*
- [x] Documentar endpoints e payloads atualizados em `BACKEND_DOCUMENTATION.md` *(Seção 6 consolidada com todos os serviços serverless em 08/11/2025)*
- [x] Executar checklist final e handoff *(ver lista "Checklist final & handoff" abaixo para evidências)*

---

### Checklist final & handoff

- [x] Guia de backend atualizado com todos os endpoints (`BACKEND_DOCUMENTATION.md`, seção 6)
- [x] Seeds de demonstração reexecutados para validação (`node scripts/seed-demo-data.js`, 08/11/2025)
- [x] Ambiente local alinhado com Vercel (`.env.local.vercel` puxado via `npx vercel env pull`)
- [x] Servidor local verificado (`npx vercel dev --yes` respondendo na porta 3000 após restart do Node)
- [x] Status de monitoramento anotado: aguardar testes de carga para revisar limites Vercel *(tarefa aberta na Fase 2)*
