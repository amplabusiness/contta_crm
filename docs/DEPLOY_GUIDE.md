# 🚀 Guia de Deploy - Contta CRM

## 📋 Pré-requisitos

### 1. Conta Vercel
- [ ] Criar conta em [vercel.com](https://vercel.com)
- [ ] Conectar com GitHub
- [ ] Instalar Vercel CLI: `npm install -g vercel`

### 2. Projeto Supabase
- [ ] Projeto criado em [supabase.com](https://supabase.com)
- [ ] Tabelas criadas via migrations
- [ ] RLS policies configuradas

### 3. APIs Externas
- [ ] Chave Gemini AI (opcional): [ai.google.dev](https://ai.google.dev)
- [ ] Chave CNPJá API: [cnpja.com](https://cnpja.com)

---

## 🔐 Variáveis de Ambiente

### Configurar no Vercel Dashboard

Após criar o projeto no Vercel, vá em **Settings > Environment Variables** e adicione:

| Variável | Descrição | Ambiente | Exemplo |
|----------|-----------|----------|---------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Production, Preview, Development | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anon | Production, Preview, Development | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `SUPABASE_URL` | URL para API Routes | Production, Preview, Development | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Chave service_role (SECRETA) | Production | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `GEMINI_API_KEY` | Chave Gemini AI (opcional) | Production, Preview | `AIzaSyExemplo123456789` |
| `CNPJA_API_KEY` | Chave CNPJá API | Production | `sua-chave-cnpja` |
| `CRON_SECRET` | Secret para validar cron jobs | Production | `gerar-string-aleatoria-segura` |
| `VITE_API_BASE_URL` | Base URL da API | Production, Preview, Development | `/api` |

**⚠️ IMPORTANTE:**
- `SUPABASE_SERVICE_KEY` e `CRON_SECRET` são **SECRETAS** - apenas em Production
- `VITE_*` são expostas no frontend - use apenas valores públicos
- Para gerar `CRON_SECRET`: `openssl rand -base64 32`

---

## 📦 Deploy via GitHub (Recomendado)

### 1. Push para GitHub
```bash
git add -A
git commit -m "chore: prepare for production deployment"
git push origin feat/supabase-auth
```

### 2. Importar no Vercel
1. Acesse [vercel.com/new](https://vercel.com/new)
2. Selecione o repositório `amplabusiness/contta_crm`
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Adicionar Variáveis de Ambiente
- Cole todas as variáveis da tabela acima
- Marque quais ambientes (Production/Preview/Development)

### 4. Deploy
- Clique em **Deploy**
- Aguarde ~2-3 minutos

---

## 🖥️ Deploy via CLI

### 1. Login no Vercel
```bash
vercel login
```

### 2. Deploy (primeira vez)
```bash
cd C:\Users\Samsung\OneDrive\Documentos\crm\contta-crm
vercel
```

Responda as perguntas:
- Set up and deploy? **Y**
- Which scope? (selecione sua conta)
- Link to existing project? **N**
- Project name? **contta-crm**
- In which directory? **./`**

### 3. Configurar Variáveis
```bash
# Exemplo de como adicionar variáveis via CLI
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add CRON_SECRET production
# ... adicionar todas as outras
```

### 4. Deploy para Produção
```bash
vercel --prod
```

---

## ⚙️ Configuração de Cron Jobs

### Verificar no Vercel Dashboard

1. Acesse seu projeto no Vercel
2. Vá em **Settings > Cron Jobs**
3. Verifique se os 3 jobs estão configurados:

| Path | Schedule | Descrição |
|------|----------|-----------|
| `/api/cron/update-cnpja` | `0 3 * * *` | Atualiza cache CNPJá diariamente às 3h AM |
| `/api/cron/update-tasks` | `0 8 * * 1` | Relatório tarefas segundas-feiras às 8h AM |
| `/api/cron/update-213-5` | `0 9 1 * *` | Processa EIRELI→SLU dia 1 de cada mês às 9h |

**Nota:** Cron jobs requerem plano **Pro** do Vercel ($20/mês)

### Testar Cron Jobs Manualmente

```bash
# Gerar CRON_SECRET
$CRON_SECRET = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString()))

# Testar endpoint
curl -X GET https://seu-dominio.vercel.app/api/cron/update-tasks `
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## ✅ Checklist Pós-Deploy

### Build & Performance
- [ ] Build completo sem erros
- [ ] Bundle size < 500 KB (inicial)
- [ ] Lighthouse score > 90
- [ ] Lazy loading funcionando

### Funcionalidades Core
- [ ] Login/Logout funcionando
- [ ] Dashboard carrega dados reais do Supabase
- [ ] Prospecção + CNPJá lookup funciona
- [ ] Criação de Deals/Tasks funciona
- [ ] React Flow (Vínculos) renderiza

### APIs e Integrações
- [ ] Endpoints `/api/deals`, `/api/tasks` funcionam
- [ ] Supabase Auth valida sessões
- [ ] Gemini AI retorna insights (se configurado)
- [ ] CNPJá retorna dados de empresas

### Segurança
- [ ] RLS policies ativas no Supabase
- [ ] Service key não exposta no frontend
- [ ] CRON_SECRET configurado
- [ ] CORS configurado corretamente

### Cron Jobs (plano Pro)
- [ ] 3 cron jobs aparecendo no dashboard
- [ ] Teste manual bem-sucedido
- [ ] Logs sem erros

---

## 🐛 Troubleshooting

### Erro: "Variável de ambiente não definida"
**Solução:**
1. Verifique em Settings > Environment Variables
2. Re-deploy após adicionar variáveis: `vercel --prod`

### Erro: "Build failed - TypeScript errors"
**Solução:**
```bash
npm run build  # Testar localmente primeiro
npm run type-check  # Verificar erros TypeScript
```

### Erro: "Cron job não executa"
**Possíveis causas:**
1. Plano Free (upgrade para Pro)
2. `CRON_SECRET` não configurado
3. Caminho errado em `vercel.json`

**Solução:**
- Verificar plano em Settings > General
- Adicionar `CRON_SECRET` nas env vars
- Verificar logs em Deployments > Functions

### Erro: "API retorna 401 Unauthorized"
**Solução:**
1. Verificar se `SUPABASE_SERVICE_KEY` está configurada
2. Validar tokens no frontend (`authorizedFetch`)
3. Verificar RLS policies no Supabase

### Erro: "React Flow não renderiza"
**Solução:**
- Lazy loading pode causar delay
- Verificar console do navegador
- Confirmar que `flow-vendor` chunk carregou

---

## 📊 Monitoramento

### Vercel Analytics
1. Habilitar em Settings > Analytics
2. Acompanhar métricas:
   - **Visitors**: usuários únicos
   - **Page Views**: visualizações
   - **Web Vitals**: FCP, LCP, CLS, FID

### Supabase Dashboard
1. Monitorar Database > Table Editor
2. Verificar logs em Logs > API
3. Acompanhar uso em Settings > Billing

### Custom Logging (opcional)
Adicionar tracking customizado:
```typescript
// utils/analytics.ts
export const trackEvent = (event: string, data?: any) => {
  if (process.env.NODE_ENV === 'production') {
    // Integrar com Google Analytics, Mixpanel, etc
  }
};
```

---

## 🔄 Deploy Contínuo

### Configuração Automática
Após conectar com GitHub, **todo push** para `feat/supabase-auth` faz deploy automático.

### Ambientes
- **Production**: branch `main` (após merge)
- **Preview**: branches de feature (PRs)
- **Development**: localhost

### Workflow Recomendado
```bash
# 1. Develop em branch feature
git checkout -b feature/nova-funcionalidade

# 2. Commit e push
git add -A
git commit -m "feat: adicionar nova funcionalidade"
git push origin feature/nova-funcionalidade

# 3. Vercel cria preview deploy automaticamente

# 4. Merge via PR para main
# 5. Vercel faz deploy automático em produção
```

---

## 📚 Recursos Adicionais

### Documentação
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

### Suporte
- Vercel: [vercel.com/support](https://vercel.com/support)
- Supabase: [supabase.com/support](https://supabase.com/support)
- GitHub Issues: `amplabusiness/contta_crm/issues`

### Performance
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Bundle Analyzer](https://www.npmjs.com/package/vite-bundle-visualizer)

---

## 🎉 Deploy Bem-Sucedido!

Seu Contta CRM está em produção! 🚀

**Próximos passos:**
1. Testar todas as funcionalidades
2. Configurar domínio customizado (opcional)
3. Monitorar métricas e erros
4. Coletar feedback dos usuários
5. Iterar e melhorar

**URL de produção:** `https://contta-crm.vercel.app` (ou seu domínio customizado)
