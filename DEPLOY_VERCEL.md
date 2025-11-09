# 🚀 Guia de Deploy Vercel

## Método 1: Via Dashboard (Mais Fácil)

### Passo 1: Conectar Repositório

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **"Import Git Repository"**
3. Selecione **amplabusiness/contta_crm**
4. Escolha branch: `feat/supabase-auth` (ou `main` se já fez merge)

### Passo 2: Configurar Build

- **Framework Preset**: Vite
- **Root Directory**: `contta-crm` ⚠️ IMPORTANTE
- **Build Command**: `npm run build` (já detectado)
- **Output Directory**: `dist` (já detectado)

### Passo 3: Environment Variables

Adicione as seguintes variáveis (todas):

```
GEMINI_API_KEY=AIzaSyA-2cKEYhCMFCBkAkoXm0VS29_dIcx6g4I
VITE_SUPABASE_URL=https://ucgpeofveguxgvxqqjec.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZ3Blb2Z2ZWd1eGd2eHFxamVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwODUwNTQsImV4cCI6MjA0NjY2MTA1NH0.1V8n9w4XyYL0pIqQYZ0T_eOX5sKiPCqwO8PrL_xLTdk
```

**Opcional (para features futuras):**
```
VITE_CNPJA_API_KEY=sua-key-cnpja
TRANSPARENCIA_API_KEY=sua-key-transparencia
```

### Passo 4: Deploy

1. Clique **"Deploy"**
2. Aguarde ~2-3 minutos
3. Vercel vai gerar URL: `https://contta-crm-xxx.vercel.app`

---

## Método 2: Via CLI (Avançado)

### Instalação

```bash
npm install -g vercel
```

### Login

```bash
vercel login
```

### Deploy

```bash
cd contta-crm
vercel --prod
```

Durante o processo, responda:

- **Set up and deploy "~/contta-crm"?** → `Y`
- **Which scope?** → Selecione sua conta/organização
- **Link to existing project?** → `N` (primeira vez)
- **What's your project's name?** → `contta-crm`
- **In which directory is your code located?** → `./`
- **Override settings?** → `N`

### Configurar Environment Variables via CLI

```bash
vercel env add GEMINI_API_KEY production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

Cole os valores quando solicitado.

### Redeploy com Variáveis

```bash
vercel --prod
```

---

## ✅ Pós-Deploy: Validação

### 1. Verificar Site Principal

Acesse: `https://seu-projeto.vercel.app`

- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Não há erros no console

### 2. Testar Endpoints de IA

**Churn Prediction:**
```bash
curl https://seu-projeto.vercel.app/api/analytics-churn
```

Esperado: JSON com array de clientes em risco

**Upsell Opportunities:**
```bash
curl https://seu-projeto.vercel.app/api/analytics-upsell
```

Esperado: JSON com oportunidades (confidence >= 50%)

**Automated Report:**
```bash
curl "https://seu-projeto.vercel.app/api/analytics-report?days=30"
```

Esperado: JSON com `{title, summary, generatedAt}`

### 3. Verificar Logs

No Vercel Dashboard:
1. Vá em **Deployments** → Último deploy
2. Clique em **Functions**
3. Verifique logs de `/api/analytics-*`

---

## 🔧 Troubleshooting

### Erro 500 nos Endpoints API

**Causa**: Environment variables não configuradas

**Solução**:
1. Vercel Dashboard → Settings → Environment Variables
2. Adicione `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Redeploy: Settings → Deployments → ... → Redeploy

### Build Failed

**Causa comum**: Root directory incorreto

**Solução**:
1. Settings → General → Root Directory
2. Altere para `contta-crm`
3. Save → Redeploy

### CORS Errors

**Causa**: Vercel não configurou headers CORS

**Solução**: Já configurado em `vercel.json` e cada endpoint API

---

## 📊 Monitoramento

### Vercel Analytics

Ative em: Settings → Analytics → Enable

### Function Logs

Real-time: Dashboard → Functions → View Logs

### Error Tracking

Integre Sentry (opcional):
```bash
npm install @sentry/vercel-edge
```

---

## 🔄 CI/CD Automático

Após primeiro deploy, Vercel monitora o GitHub:

- **Push na `main`** → Deploy production
- **Push em outras branches** → Deploy preview
- **Pull Requests** → Deploy preview automático

Configure em: Settings → Git → Production Branch

---

## 🎯 Próximos Passos

1. ✅ Deploy realizado
2. ⏳ Testar endpoints em produção
3. ⏳ Configurar domínio customizado (opcional)
4. ⏳ Integrar frontend Analytics.tsx com URLs production
5. ⏳ Monitorar métricas de uso dos agentes IA

---

**Dúvidas?** Consulte [Vercel Docs](https://vercel.com/docs) ou abra issue no GitHub.
