# Rotinas Automáticas do Contta CRM

Este documento descreve as rotinas de manutenção e automação do sistema, incluindo configuração para execução via cron jobs ou CI/CD.

## 📋 Índice

1. [Scripts Disponíveis](#scripts-disponíveis)
2. [Configuração de Ambiente](#configuração-de-ambiente)
3. [Deploy com Vercel Cron](#deploy-com-vercel-cron)
4. [Deploy com GitHub Actions](#deploy-com-github-actions)
5. [Monitoramento e Logs](#monitoramento-e-logs)

---

## 🔧 Scripts Disponíveis

### 1. Atualização Diária do Cache CNPJá

**Script**: `scripts/update-cnpja-cache.ts`  
**Comando**: `npm run update:cnpja`  
**Frequência sugerida**: Diária (madrugada)  
**Duração estimada**: 3-10 min (dependendo do número de empresas)

**Objetivo**: Atualizar empresas no Supabase cujos dados estão desatualizados (> 90 dias) consultando a API do CNPJá.

**Rate Limiting**:
- 20 requisições/minuto (sem API key)
- 60 requisições/minuto (com API key)
- Delay de 3 segundos entre requests

**Requisitos**:
- Executar migration `20251110_add_data_ultima_atualizacao.sql` antes
- Variáveis de ambiente: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CNPJA_API_KEY` (opcional)

**Exemplo de execução**:
```bash
npm run update:cnpja
```

**Saída esperada**:
```
🚀 Iniciando atualização do cache CNPJá...
🔍 Buscando empresas desatualizadas desde 2025-08-12...
✅ Encontradas 15 empresas para atualizar

📊 RESUMO DA ATUALIZAÇÃO
==========================================================
✅ Atualizadas: 14
❌ Erros: 1
⏱️ Tempo total: 47.32s
📈 Taxa de sucesso: 93.3%
```

---

### 2. Revisão Semanal de Tarefas

**Script**: `scripts/update-tasks-weekly.ts`  
**Comando**: `npm run update:tasks`  
**Frequência sugerida**: Semanal (segunda-feira, 8h)  
**Duração estimada**: < 5 segundos

**Objetivo**: Gerar relatório de tarefas atrasadas, sem responsável ou sem deal vinculado.

**Métricas monitoradas**:
- Tarefas atrasadas (due_date < hoje e status != 'Concluída')
- Tarefas sem assignee
- Tarefas sem deal vinculado
- Distribuição por status (Pendente, Em Andamento, Concluída)

**Requisitos**:
- Variáveis de ambiente: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

**Exemplo de execução**:
```bash
npm run update:tasks
```

**Saída esperada**:
```
📊 RELATÓRIO SEMANAL DE TAREFAS
======================================================================
📈 Visão Geral:
   Total de tarefas: 47
   ✅ Concluídas: 12 (25.5%)
   🔄 Em andamento: 12 (25.5%)
   📋 Pendentes: 23 (48.9%)

⚠️ Alertas:
   🚨 Tarefas atrasadas: 3
   👤 Sem responsável: 0
   💼 Sem deal vinculado: 0
```

**Futuras melhorias**:
- [ ] Enviar relatório por e-mail para admins
- [ ] Notificar assignees de tarefas atrasadas
- [ ] Integração com Slack/Discord

---

### 3. Automação de Casos EIRELI (213-5)

**Script**: `scripts/process-213-5-cases.ts`  
**Comando**: `npm run update:213-5`  
**Frequência sugerida**: Mensal (dia 1, 9h)  
**Duração estimada**: < 10 segundos

**Objetivo**: Detectar empresas com natureza jurídica 213-5 (EIRELI) e gerar ordens de serviço para migração para SLU (Sociedade Limitada Unipessoal), conforme Lei 14.195/2021.

**Contexto Legal**:
- Lei 14.195/2021 extinguiu a EIRELI e criou a SLU
- Todas EIRELI foram automaticamente convertidas em SLU
- É necessário atualizar contrato social para refletir mudança

**Requisitos**:
- Executar migration `20251110_create_ordens_servico.sql` antes
- Variáveis de ambiente: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

**Exemplo de execução**:
```bash
npm run update:213-5
```

**Saída esperada**:
```
📊 RELATÓRIO DE EMPRESAS EIRELI (213-5)
======================================================================
📈 Resumo:
   Total de empresas EIRELI ativas: 8
   Ordens de serviço geradas: 8
   Ordens já existentes: 0

🏢 Empresas EIRELI Detectadas:
──────────────────────────────────────────────────────────────────────
   1. EXEMPLO SERVICOS CONTABEIS EIRELI
      CNPJ: 12.345.678/0001-90
      Cidade: São Paulo/SP
      Data abertura: 2019-03-15
```

---

## ⚙️ Configuração de Ambiente

### Variáveis Obrigatórias

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # Service Role Key (nunca expor!)

# CNPJá (opcional, aumenta rate limit)
CNPJA_API_KEY=your_api_key_here
```

### Migrations Necessárias

Execute as migrations no Supabase SQL Editor antes de usar os scripts:

1. **Adicionar campo data_ultima_atualizacao**:
   ```bash
   cat supabase/migrations/20251110_add_data_ultima_atualizacao.sql | pbcopy
   ```
   Colar no Supabase SQL Editor e executar.

2. **Criar tabela ordens_servico**:
   ```bash
   cat supabase/migrations/20251110_create_ordens_servico.sql | pbcopy
   ```
   Colar no Supabase SQL Editor e executar.

---

## 🚀 Deploy com Vercel Cron

### Configuração

1. Criar arquivo `vercel.json` (já existe):
```json
{
  "crons": [
    {
      "path": "/api/cron/update-cnpja",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/update-tasks",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/api/cron/update-213-5",
      "schedule": "0 9 1 * *"
    }
  ]
}
```

2. Criar endpoints em `api/cron/`:

**`api/cron/update-cnpja.ts`**:
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { spawn } from 'child_process';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Verificar authorization header para segurança
  const authHeader = request.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  // Executar script
  const child = spawn('npx', ['tsx', 'scripts/update-cnpja-cache.ts']);
  
  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.on('close', (code) => {
    if (code === 0) {
      response.status(200).json({ success: true, output });
    } else {
      response.status(500).json({ error: 'Script failed', output });
    }
  });
}
```

3. Adicionar `CRON_SECRET` nas variáveis de ambiente da Vercel.

### Schedules (Cron Syntax)

- `0 3 * * *` - Diariamente às 3h (madrugada)
- `0 8 * * 1` - Segundas-feiras às 8h
- `0 9 1 * *` - Dia 1 de cada mês às 9h

---

## 🐙 Deploy com GitHub Actions

### Configuração

Criar arquivo `.github/workflows/cron-jobs.yml`:

```yaml
name: Rotinas Automáticas CRM

on:
  schedule:
    # Atualização CNPJá - Diária às 3h UTC (0h BRT)
    - cron: '0 3 * * *'
    # Revisão de Tarefas - Segundas às 11h UTC (8h BRT)
    - cron: '0 11 * * 1'
    # Casos 213-5 - Dia 1 de cada mês às 12h UTC (9h BRT)
    - cron: '0 12 1 * *'
  
  workflow_dispatch: # Permite executar manualmente

jobs:
  update-cnpja:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 3 * * *' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run update:cnpja
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          CNPJA_API_KEY: ${{ secrets.CNPJA_API_KEY }}

  update-tasks:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 11 * * 1' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run update:tasks
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}

  update-213-5:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 12 1 * *' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run update:213-5
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### Adicionar Secrets no GitHub

1. Ir em **Settings** → **Secrets and variables** → **Actions**
2. Adicionar:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `CNPJA_API_KEY`

---

## 📊 Monitoramento e Logs

### Logs Locais

Todos os scripts geram logs no console com formato estruturado:

```
🚀 Iniciando...
🔍 Buscando...
✅ Sucesso
❌ Erro
📊 Resumo
```

### Integração com Sentry (Futuro)

Adicionar em cada script:

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

try {
  // Script code
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

### Métricas Recomendadas

- Taxa de sucesso de atualizações CNPJá
- Número de tarefas atrasadas (alerta se > 10)
- Empresas EIRELI pendentes de migração
- Tempo médio de execução de cada script

---

## 🔧 Troubleshooting

### Erro: "SUPABASE_URL não definido"

**Solução**: Verificar se `.env.local` existe e contém variáveis corretas.

```bash
cp env.local.template .env.local
# Editar .env.local com valores reais
```

### Erro: Rate limit atingido (CNPJá)

**Solução**: 
1. Aumentar `RATE_LIMIT_MS` em `update-cnpja-cache.ts`
2. Obter API key no CNPJá para aumentar limite
3. Executar em horários de menor uso (madrugada)

### Erro: "Tabela ordens_servico não existe"

**Solução**: Executar migration antes de rodar script 213-5.

```sql
-- No Supabase SQL Editor
\i supabase/migrations/20251110_create_ordens_servico.sql
```

---

## 📝 Próximos Passos

- [ ] Implementar notificações por e-mail (Resend/SendGrid)
- [ ] Dashboard de monitoramento de rotinas
- [ ] Logs persistentes no Supabase (tabela `cron_logs`)
- [ ] Retry automático em caso de falha
- [ ] Notificações Slack/Discord para alertas

---

**Última atualização**: 10/11/2025  
**Autor**: Contta CRM Team
