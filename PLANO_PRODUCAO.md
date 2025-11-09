# Plano de Produção - Contta CRM
## Roadmap Completo para Entrega em Produção com MCPs Integrados

> **Engenharia & Arquitetura**: Este documento consolida todas as tarefas técnicas necessárias para transformar o Contta CRM de protótipo com mocks para aplicação production-ready com Supabase + Vercel + Gemini AI, utilizando Model Context Protocols (MCPs) para automação e qualidade.

---

## 🤖 MCPs Integrados ao Workflow

Este plano utiliza múltiplos MCPs trabalhando em conjunto:

### **MCP Context7** - Documentação de Bibliotecas
- **Função**: Consultar documentação oficial atualizada de React, Supabase, Vercel, Gemini
- **Uso**: Validar padrões de código, APIs, best practices
- **Comando**: `npx @context7/mcp get-library-docs`

### **MCP Filesystem** - Auditoria e Logs
- **Função**: Registrar alterações críticas, criar snapshots, gerar relatórios
- **Uso**: Log de mudanças em RLS, schema, seeds (conforme `MCP_AUDITORIA.md`)
- **Comando**: `npx mcp call filesystem.appendFile`

### **MCP Brave Search** - Pesquisa de Referências
- **Função**: Buscar soluções, exemplos de código, troubleshooting
- **Uso**: Resolver bugs complexos, encontrar patterns community-approved
- **Comando**: Integrado via busca contextual

### **Workflow Orquestrado**
```
┌──────────────┐
│   Context7   │──→ Validar padrões de código
└──────┬───────┘
       ↓
┌──────────────┐
│  Filesystem  │──→ Auditar mudanças críticas
└──────┬───────┘
       ↓
┌──────────────┐
│ Brave Search │──→ Resolver problemas técnicos
└──────────────┘
```

---

## 📋 Índice

1. [Visão Geral & Objetivos](#1-visão-geral--objetivos)
2. [Pré-requisitos & Setup Inicial](#2-pré-requisitos--setup-inicial)
3. [Setup de MCPs](#3-setup-de-mcps)
4. [Fase 1: Auditoria & Limpeza de Código](#fase-1-auditoria--limpeza-de-código)
5. [Fase 2: Infraestrutura Supabase](#fase-2-infraestrutura-supabase)
6. [Fase 3: Backend Vercel Serverless](#fase-3-backend-vercel-serverless)
7. [Fase 4: Integração Frontend Real](#fase-4-integração-frontend-real)
8. [Fase 5: Inteligência Artificial (Gemini)](#fase-5-inteligência-artificial-gemini)
9. [Fase 6: Autenticação & Segurança](#fase-6-autenticação--segurança)
10. [Fase 7: Testes End-to-End](#fase-7-testes-end-to-end)
11. [Fase 8: Deploy & Monitoramento](#fase-8-deploy--monitoramento)
12. [Checklist de Qualidade](#checklist-de-qualidade)
13. [Critérios de Aceitação](#critérios-de-aceitação)

---

## 1. Visão Geral & Objetivos

### 🎯 Meta Principal
Transformar o Contta CRM em uma aplicação totalmente funcional, sem mocks, pronta para uso em produção por contadores e escritórios contábeis.

### 🏗️ Arquitetura Alvo
```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO (Navegador)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND (React 19 + Vite)                     │
│  • Tailwind CSS                                             │
│  • TypeScript Strict                                        │
│  • Supabase Auth Client                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        ↓                           ↓
┌──────────────────┐       ┌───────────────────┐
│  VERCEL (CDN)    │       │  VERCEL FUNCTIONS │
│  • Static Files  │       │  • /api/*         │
│  • Edge Network  │       │  • Node 20.x      │
└──────────────────┘       └────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
          ┌──────────────────┐          ┌──────────────────┐
          │   SUPABASE       │          │   GEMINI AI      │
          │  • PostgreSQL    │          │  • Insights      │
          │  • Row Level Sec │          │  • Reports       │
          │  • Auth          │          │  • Analysis      │
          └──────────────────┘          └──────────────────┘
```

### 📊 Documentação de Referência
- `COMECE_AQUI.md` - Onboarding
- `GUIA_RAPIDO_CONTADOR.md` - Manual do usuário final
- `GUIA_ENV.md` - Variáveis de ambiente
- `SETUP.md` / `README_SETUP.md` - Setup técnico
- `PROXIMOS_PASSOS.md` - Roadmap de features
- `ROADMAP_COMPLETO.md` - Visão estratégica
- `ROADMAP_BACKEND_INTEGRACAO.md` - Backend detalhado
- `BACKEND_DOCUMENTATION.md` - Referência de APIs
- `MCP_AUDITORIA.md` - Protocolo de auditoria

---

## 2. Pré-requisitos & Setup Inicial

### ✅ Checklist de Ambiente

#### Ferramentas Necessárias
- [ ] Node.js >= 20.x instalado
- [ ] npm ou pnpm atualizado
- [ ] Git configurado
- [ ] Vercel CLI: `npm i -g vercel`
- [ ] Editor com TypeScript LSP (VS Code recomendado)

#### Credenciais Obrigatórias
- [ ] Conta Supabase (free tier suficiente para MVP)
- [ ] API Key Gemini (`GEMINI_API_KEY` ou `API_KEY`)
- [ ] Projeto Vercel criado e linkado

#### Variáveis de Ambiente
Copie `.env.local.template` → `.env.local` e preencha:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc... # apenas backend

# Gemini AI
GEMINI_API_KEY=AIzaSy...
API_KEY=AIzaSy... # fallback

# Opcional
CNPJA_API_KEY=... # se usar API externa de CNPJ
```

### 🔧 Instalação
```bash
git clone https://github.com/amplabusiness/contta_crm.git
cd contta_crm
npm install
npm run build  # validar que compila
```

---

## 3. Setup de MCPs

### 🤖 Configuração dos Model Context Protocols

#### 3.1 Variáveis de Ambiente para MCPs
```powershell
# Windows PowerShell
$env:MCP_ACTOR = "seu-email@amplabusiness.com.br"
$env:SUPABASE_URL = "https://xxx.supabase.co"
$env:SUPABASE_SERVICE_KEY = "eyJhbGc..."

# Validar
echo $env:MCP_ACTOR
```

```bash
# Linux/Mac
export MCP_ACTOR="seu-email@amplabusiness.com.br"
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGc..."

# Validar
echo $MCP_ACTOR
```

#### 3.2 Inicialização dos Logs de Auditoria
```powershell
# Criar diretório de logs
New-Item -ItemType Directory -Force -Path logs

# Criar arquivo de auditoria
New-Item -ItemType File -Force -Path logs\audit-log.ndjson
New-Item -ItemType File -Force -Path logs\audit-attachments.ndjson
New-Item -ItemType File -Force -Path logs\mcp-commands.log

# Primeira entrada de auditoria
$initLog = @{
    timestamp = (Get-Date -Format o)
    actor = $env:MCP_ACTOR
    scope = "project.init"
    action = "create"
    description = "Inicialização do sistema de auditoria MCP"
    metadata = @{
        version = "1.0.0"
        project = "contta_crm"
    }
} | ConvertTo-Json -Compress

Add-Content -Path logs\audit-log.ndjson -Value $initLog
```

#### 3.3 Teste de MCPs

##### 3.3.1 Context7 - Documentação
```powershell
# Testar resolução de biblioteca React
Write-Host "🔍 Testando Context7..." -ForegroundColor Cyan

# Consultar React
$reactDocs = "Consultar docs de React Hooks via Context7"

# Consultar Supabase
$supabaseDocs = "Consultar docs de Supabase Auth via Context7"

# Consultar Vercel
$vercelDocs = "Consultar docs de Vercel Serverless via Context7"
```

**Checklist**:
- [ ] Context7 retorna documentação válida
- [ ] Cache de docs criado localmente
- [ ] Integração com AI Assistant funcional

##### 3.3.2 Filesystem - Auditoria
```powershell
# Teste de escrita
$testLog = @{
    timestamp = (Get-Date -Format o)
    actor = $env:MCP_ACTOR
    scope = "test.mcp"
    action = "test"
    description = "Teste do MCP Filesystem"
} | ConvertTo-Json -Compress

Add-Content -Path logs\audit-log.ndjson -Value $testLog

# Teste de leitura
Get-Content logs\audit-log.ndjson | Select-Object -Last 1
```

**Checklist**:
- [ ] Arquivo `audit-log.ndjson` criado
- [ ] Leitura retorna JSON válido
- [ ] Encoding UTF-8 preservado

##### 3.3.3 Brave Search - Pesquisa (via AI Assistant)
```powershell
# Testar busca técnica via AI
Write-Host "🔎 Brave Search integrado via AI Assistant" -ForegroundColor Cyan
```

**Checklist**:
- [ ] Resultados relevantes retornados
- [ ] Links acessíveis
- [ ] Snippets úteis para referência

#### 3.4 Scripts de Automação MCP

Vou criar scripts PowerShell para automatizar tarefas com MCPs:

##### 3.4.1 `scripts/mcp-audit.ps1`
```powershell
<#
.SYNOPSIS
    Registra uma entrada de auditoria no sistema MCP
.EXAMPLE
    .\scripts\mcp-audit.ps1 -Scope "supabase.rls" -Action "update" -Description "Política atualizada"
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$Scope,
    
    [Parameter(Mandatory=$true)]
    [string]$Action,
    
    [Parameter(Mandatory=$true)]
    [string]$Description,
    
    [hashtable]$Metadata = @{}
)

$logEntry = @{
    timestamp = (Get-Date -Format o)
    actor = $env:MCP_ACTOR
    scope = $Scope
    action = $Action
    description = $Description
    metadata = $Metadata
} | ConvertTo-Json -Compress

Add-Content -Path logs\audit-log.ndjson -Value $logEntry

Write-Host "✅ Auditoria registrada: $Description" -ForegroundColor Green
```

##### 3.4.2 `scripts/mcp-report.ps1`
```powershell
<#
.SYNOPSIS
    Gera relatório de auditoria
.EXAMPLE
    .\scripts\mcp-report.ps1 -Days 7
#>
param(
    [int]$Days = 30
)

$cutoffDate = (Get-Date).AddDays(-$Days)

Write-Host "📊 Relatório de Auditoria - Últimos $Days dias" -ForegroundColor Cyan
Write-Host "=" * 80

$entries = Get-Content logs\audit-log.ndjson | ForEach-Object {
    $_ | ConvertFrom-Json
} | Where-Object {
    [DateTime]$_.timestamp -gt $cutoffDate
}

# Agrupar por scope
$byScope = $entries | Group-Object -Property scope

foreach ($group in $byScope) {
    Write-Host "`n📁 $($group.Name)" -ForegroundColor Yellow
    Write-Host "   Total de ações: $($group.Count)" -ForegroundColor White
    
    $actions = $group.Group | Group-Object -Property action
    foreach ($action in $actions) {
        Write-Host "   - $($action.Name): $($action.Count)" -ForegroundColor Gray
    }
}

Write-Host "`n" ("=" * 80)
Write-Host "Total de entradas: $($entries.Count)" -ForegroundColor Green
```

##### 3.4.3 `scripts/validate-mcp-setup.ps1`
```powershell
<#
.SYNOPSIS
    Valida configuração completa dos MCPs
#>

Write-Host "🔍 Validando Setup de MCPs..." -ForegroundColor Cyan

# 1. Verificar variáveis de ambiente
$requiredEnvVars = @('MCP_ACTOR', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY')
$missingVars = @()

foreach ($var in $requiredEnvVars) {
    if (-not (Test-Path env:$var)) {
        $missingVars += $var
        Write-Host "❌ Variável $var não configurada" -ForegroundColor Red
    } else {
        Write-Host "✅ Variável $var configurada" -ForegroundColor Green
    }
}

# 2. Verificar estrutura de logs
if (Test-Path logs\audit-log.ndjson) {
    Write-Host "✅ Arquivo de auditoria existe" -ForegroundColor Green
    $logCount = (Get-Content logs\audit-log.ndjson).Count
    Write-Host "   Entradas: $logCount" -ForegroundColor Gray
} else {
    Write-Host "❌ Arquivo de auditoria não encontrado" -ForegroundColor Red
}

# 3. Verificar scripts
$requiredScripts = @('mcp-audit.ps1', 'mcp-report.ps1')
foreach ($script in $requiredScripts) {
    if (Test-Path "scripts\$script") {
        Write-Host "✅ Script $script encontrado" -ForegroundColor Green
    } else {
        Write-Host "❌ Script $script ausente" -ForegroundColor Red
    }
}

# 4. Teste de escrita
try {
    .\scripts\mcp-audit.ps1 `
        -Scope "test.validation" `
        -Action "validate" `
        -Description "Teste de validação do sistema MCP" `
        -Metadata @{automated=$true}
    Write-Host "✅ Teste de escrita bem-sucedido" -ForegroundColor Green
} catch {
    Write-Host "❌ Falha no teste de escrita: $_" -ForegroundColor Red
}

Write-Host "`n" ("=" * 80)
if ($missingVars.Count -eq 0) {
    Write-Host "✅ Setup de MCPs validado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Configure as variáveis faltantes: $($missingVars -join ', ')" -ForegroundColor Yellow
}
```

#### 3.5 Integração MCPs no Workflow de Desenvolvimento

##### Workflow: Alteração de Schema Supabase
```powershell
# 1. Consultar documentação via Context7 (via AI Assistant)
# Pedir ao AI: "Mostre exemplos de RLS policies no Supabase"

# 2. Fazer alteração
code supabase-schema.sql

# 3. Auditar mudança
.\scripts\mcp-audit.ps1 `
    -Scope "supabase.schema" `
    -Action "update" `
    -Description "Adicionada coluna last_login em profiles" `
    -Metadata @{
        file = "supabase-schema.sql"
        commit = (git rev-parse HEAD)
        ticket = "SCHEMA-101"
    }

# 4. Aplicar no Supabase
node scripts\setup-database.js

# 5. Auditar aplicação
.\scripts\mcp-audit.ps1 `
    -Scope "supabase.migration" `
    -Action "apply" `
    -Description "Schema atualizado no Supabase (producao)" `
    -Metadata @{environment="production"}
```

##### Workflow: Implementação de Novo Endpoint
```powershell
# 1. Pesquisar patterns via Brave Search (via AI)
# Pedir ao AI: "Busque exemplos de Vercel serverless auth middleware"

# 2. Consultar docs via Context7 (via AI)
# Pedir ao AI: "Documentação de Vercel serverless functions"

# 3. Implementar
code api\new-endpoint.ts

# 4. Auditar criação
.\scripts\mcp-audit.ps1 `
    -Scope "backend.api" `
    -Action "create" `
    -Description "Novo endpoint /api/new-endpoint implementado" `
    -Metadata @{
        file = "api/new-endpoint.ts"
        methods = @("GET", "POST", "PATCH")
        authenticated = $true
    }

# 5. Testar endpoint
curl http://localhost:3000/api/new-endpoint

# 6. Auditar teste
.\scripts\mcp-audit.ps1 `
    -Scope "backend.test" `
    -Action "test" `
    -Description "Endpoint /api/new-endpoint testado localmente" `
    -Metadata @{status="passing"}
```

##### Workflow: Adição de Nova Dependência
```powershell
# 1. Pesquisar alternativas
# Pedir ao AI: "Compare bibliotecas de data fetching para React"

# 2. Consultar docs
# Pedir ao AI: "Documentação completa de SWR"

# 3. Instalar
npm install swr

# 4. Auditar
.\scripts\mcp-audit.ps1 `
    -Scope "dependencies" `
    -Action "add" `
    -Description "Biblioteca SWR adicionada para data fetching" `
    -Metadata @{
        package = "swr"
        version = (npm list swr --depth=0 | Select-String "swr@")
        justification = "Performance e cache automático"
    }
```

### 🧪 Testes de Integração MCP
```powershell
# Executar validação completa
.\scripts\validate-mcp-setup.ps1

# Gerar relatório
.\scripts\mcp-report.ps1 -Days 7

# Verificar logs
Get-Content logs\audit-log.ndjson | ConvertFrom-Json | Format-Table timestamp, scope, action, description
```

### ✅ Critério de Conclusão Setup MCPs
- [ ] Todos os 3 MCPs testados e funcionais
- [ ] Scripts de automação criados e testados
- [ ] Logs de auditoria inicializados
- [ ] Integração no workflow documentada
- [ ] Validação automatizada passando
- [ ] Time treinado no uso dos MCPs

---

## Fase 1: Auditoria & Limpeza de Código

**Objetivo**: Identificar e remover todos os mocks, mapear dependências reais.

### 📝 Tarefas

#### 1.1 Inventário de Mocks
- [ ] Listar todos os arquivos em `data/mockData.ts`
- [ ] Identificar onde cada mock é usado via `grep -r "mock" src/`
- [ ] Criar mapa de dependências: qual componente → qual mock → qual API real

**Arquivo de Saída**: `docs/mock-inventory.md`

#### 1.2 Análise de `services/apiService.ts`
- [ ] Documentar cada função exportada
- [ ] Verificar se já chama endpoint real ou retorna mock
- [ ] Mapear para endpoint em `api/` correspondente
- [ ] Identificar gaps (funções sem backend implementado)

**Exemplo de Mapeamento**:
```typescript
// Mock atual
fetchDashboardData() → mockStatCardsData

// Backend alvo
fetchDashboardData() → GET /api/dashboard-data
```

#### 1.3 Revisão de Tipos (`types.ts`)
- [ ] Validar que interfaces batem com schema Supabase
- [ ] Adicionar campos faltantes (ex: `createdAt` em `Deal`)
- [ ] Documentar campos opcionais vs obrigatórios
- [ ] Criar tipo `ApiResponse<T>` padrão para respostas

#### 1.4 Verificação de Imports
- [ ] Garantir que todos os imports incluem extensão (`.ts`, `.tsx`)
- [ ] Corrigir caminhos relativos inconsistentes
- [ ] Validar que `tsconfig.json` paths estão corretos

### 🧪 Testes Fase 1
```bash
# Compilação limpa
npm run build

# Buscar mocks restantes
grep -r "mockData" src/ components/ services/

# TypeScript strict check
npx tsc --noEmit --strict
```

### ✅ Critério de Conclusão
- [ ] Zero referências a `mockData.ts` no código de produção
- [ ] Todos os imports validados
- [ ] Build TypeScript sem erros
- [ ] Documentação de inventário completa

---

## Fase 2: Infraestrutura Supabase

**Objetivo**: Configurar banco de dados, RLS, seeds e validar estrutura.

### 📝 Tarefas

#### 2.1 Setup do Projeto Supabase
- [ ] Criar projeto no Supabase Dashboard
- [ ] Copiar credenciais (`SUPABASE_URL`, `ANON_KEY`, `SERVICE_KEY`)
- [ ] Configurar domínio customizado (opcional)
- [ ] Habilitar Auth Email/Password

#### 2.2 Aplicar Schema
```bash
# Executar migration principal
node scripts/setup-database.js

# Ou manualmente via SQL Editor no Supabase
cat supabase-schema.sql | pbcopy
# Colar no SQL Editor e executar
```

- [ ] Verificar criação de tabelas: `empresas`, `deals`, `tasks`, `profiles`, `empresa_socios`, `socios`
- [ ] Confirmar constraints e foreign keys
- [ ] Validar índices (CNPJ, CPF, relações)

#### 2.3 Row Level Security (RLS)
- [ ] Habilitar RLS em todas as tabelas
- [ ] Aplicar políticas de `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- [ ] Diferenciar `Admin` vs `User` (role em `profiles.role`)
- [ ] Testar políticas com `scripts/qa-rls.js`

**Exemplo de Política**:
```sql
-- Deals: apenas do próprio user OU admins
CREATE POLICY "Users can view own deals"
ON deals FOR SELECT
USING (auth.uid() = assignee_id OR 
       auth.uid() IN (SELECT id FROM profiles WHERE role = 'Admin'));
```

#### 2.4 Seeds de Dados Reais
```bash
# Carregar CNPJs exemplo
node scripts/load-cnpjs.js

# Seed de deals/tasks/profiles de demonstração
node scripts/seed-demo-data.js
```

- [ ] Validar que `empresas` tem pelo menos 50 registros
- [ ] Criar usuário admin (`scripts/create-master-user.js`)
- [ ] Popular `deals` e `tasks` para testes

#### 2.5 Auditoria MCP
- [ ] Registrar cada alteração no schema via `npx mcp audit log`
- [ ] Atualizar `logs/audit-log.ndjson`
- [ ] Documentar em `MCP_AUDITORIA.md`

### 🧪 Testes Fase 2
```bash
# QA de queries
node scripts/qa-queries.js

# QA de RLS
node scripts/qa-rls.js

# Verificar dados
# No Supabase SQL Editor:
SELECT COUNT(*) FROM empresas;
SELECT COUNT(*) FROM deals;
SELECT * FROM profiles WHERE role = 'Admin';
```

### ✅ Critério de Conclusão
- [ ] Schema aplicado sem erros
- [ ] RLS habilitado e testado
- [ ] Seeds executados com sucesso
- [ ] QA scripts passam 100%
- [ ] Log de auditoria atualizado

---

## Fase 3: Backend Vercel Serverless

**Objetivo**: Implementar e validar todos os endpoints `/api/*`.

### 📝 Tarefas

#### 3.1 Estrutura Base
- [ ] Revisar `api/_lib/auth.ts` (helper de autenticação)
- [ ] Padronizar headers CORS em todas as rotas
- [ ] Criar helper de erro: `toHttpError(status, message)`
- [ ] Validar que `SUPABASE_SERVICE_KEY` está disponível

#### 3.2 Endpoints de Dados (CRUD)

##### 3.2.1 `/api/deals`
- [ ] `GET /api/deals` - listar todos os deals do usuário
- [ ] `POST /api/deals` - criar novo deal
- [ ] `PATCH /api/deals/[id]` - atualizar deal
- [ ] `DELETE /api/deals/[id]` - deletar deal
- [ ] Mapear `created_at → createdAt` na resposta
- [ ] Validar campos obrigatórios no POST

##### 3.2.2 `/api/tasks`
- [ ] `GET /api/tasks` - listar tarefas
- [ ] `POST /api/tasks` - criar tarefa
- [ ] `PATCH /api/tasks/[id]` - atualizar tarefa
- [ ] `DELETE /api/tasks/[id]` - deletar tarefa
- [ ] Resolver `related_deal_name` via join

##### 3.2.3 `/api/team`
- [ ] `GET /api/team` - listar membros (profiles)
- [ ] `POST /api/team` - adicionar membro (apenas Admin)
- [ ] `PATCH /api/team/[id]` - atualizar status/role
- [ ] `DELETE /api/team/[id]` - remover membro
- [ ] Validar permissões via `requireUser` + role check

#### 3.3 Endpoints de Prospecção

##### 3.3.1 `/api/prospects`
- [ ] `GET /api/prospects?search=...&limit=...&offset=...` - buscar empresas
- [ ] Retornar header `X-Total-Count` para paginação
- [ ] Suportar filtro por razão social, CNPJ, CNAE
- [ ] Popular sócios via join `empresa_socios → socios`

##### 3.3.2 `/api/cnpj-lookup`
- [ ] `GET /api/cnpj-lookup?cnpj=12345678000190`
- [ ] Buscar em Supabase primeiro
- [ ] Fallback para API externa (CNPJá) se não encontrar
- [ ] Cachear resultado no Supabase

#### 3.4 Endpoints de Analytics

##### 3.4.1 `/api/dashboard-data`
- [ ] Agregar stats: receita, deals ativos, tarefas pendentes, taxa conversão
- [ ] Gerar `salesChartData` (últimos 6 meses)
- [ ] Gerar `dealStageData` (funil de vendas)
- [ ] Buscar `recentActivities` (últimas 10)
- [ ] Chamar Gemini para `insightsHtml` (opcional)

##### 3.4.2 `/api/analytics-data`
- [ ] Calcular churn predictions (pode ser mock inicial)
- [ ] Identificar upsell opportunities
- [ ] Gerar relatório automatizado via Gemini
- [ ] Retornar `{ report, churnPredictions, upsellOpportunities, insightsHtml }`

#### 3.5 Endpoints de Compliance & Indicações

##### 3.5.1 `/api/compliance`
- [ ] Buscar dados de consentimento (LGPD)
- [ ] Listar logs de acesso (`data_access_logs` table)
- [ ] Retornar `{ consentStatus, accessLogs }`

##### 3.5.2 `/api/indicacoes`
- [ ] `?section=status` - status do programa de indicações
- [ ] `?section=minhas` - minhas indicações
- [ ] `?section=sugestoes&cep=...` - empresas sugeridas por CEP

#### 3.6 Endpoints de Relatórios

##### 3.6.1 `/api/reports?type=network|territorial|performance`
- [ ] `network` - rede de relacionamentos (vínculos)
- [ ] `territorial` - análise territorial por CEP
- [ ] `performance` - performance de indicações
- [ ] Integrar com Gemini para geração de insights

### 🧪 Testes Fase 3
```bash
# Desenvolvimento local
npx vercel dev --yes

# Testar cada endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/deals
curl -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -d '{"title":"Test"}'

# Validar CORS
curl -X OPTIONS http://localhost:3000/api/deals -v
```

**Script de Testes Automatizado**:
```bash
# Criar scripts/test-endpoints.sh
#!/bin/bash
TOKEN=$(get-token-from-supabase)

echo "Testing GET /api/deals..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/deals | jq

echo "Testing POST /api/tasks..."
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Teste","priority":"Alta","status":"A Fazer"}' | jq

# ... continuar para todos os endpoints
```

### ✅ Critério de Conclusão
- [ ] Todos os 10+ endpoints implementados
- [ ] Autenticação funcionando em todas as rotas
- [ ] CORS configurado corretamente
- [ ] Erros retornam JSON estruturado
- [ ] Script de testes passa 100%
- [ ] Documentação em `BACKEND_DOCUMENTATION.md` atualizada

---

## Fase 4: Integração Frontend Real

**Objetivo**: Conectar todos os componentes React aos endpoints reais.

### 📝 Tarefas

#### 4.1 Refatoração de `services/apiService.ts`

##### 4.1.1 Remover Mocks
- [ ] Deletar imports de `mockData.ts`
- [ ] Remover todos os `await simulateDelay()`
- [ ] Substituir retornos fixos por `fetch()` real

##### 4.1.2 Implementar `authorizedFetch`
```typescript
const authorizedFetch = async (input: RequestInfo, init: RequestInit = {}) => {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  
  if (data?.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  
  return fetch(input, { ...init, headers });
};
```

##### 4.1.3 Atualizar Funções
- [ ] `fetchDashboardData()` → `GET /api/dashboard-data`
- [ ] `fetchProspectCompanies(options)` → `GET /api/prospects?...`
- [ ] `fetchDeals()` → `GET /api/deals`
- [ ] `fetchTasks()` → `GET /api/tasks`
- [ ] `addTask(data)` → `POST /api/tasks`
- [ ] `updateTask(id, data)` → `PATCH /api/tasks/${id}`
- [ ] `deleteTask(id)` → `DELETE /api/tasks/${id}`
- [ ] `fetchTeamMembers()` → `GET /api/team`
- [ ] `fetchAnalyticsData()` → `GET /api/analytics-data`
- [ ] `fetchComplianceData()` → `GET /api/compliance`
- [ ] `fetchIndicacoesStatus()` → `GET /api/indicacoes?section=status`
- [ ] `fetchReportData(type)` → `GET /api/reports?type=${type}`
- [ ] `executeGlobalSearch(params)` → usar múltiplas APIs em paralelo

#### 4.2 Atualização de Componentes

##### 4.2.1 `Dashboard.tsx`
- [ ] Usar `fetchDashboardData()` atualizado
- [ ] Tratar estado de loading com skeleton
- [ ] Exibir erros com toast ou banner
- [ ] Renderizar `insightsHtml` do Gemini se disponível

##### 4.2.2 `Prospeccao.tsx`
- [ ] Implementar paginação real com `offset` e `limit`
- [ ] Usar `X-Total-Count` header para total de páginas
- [ ] Adicionar debounce na busca (300ms)
- [ ] Mostrar spinner durante fetch
- [ ] Tratar lista vazia com estado específico

##### 4.2.3 `Negocios.tsx`
- [ ] Buscar deals reais via `fetchDeals()`
- [ ] Implementar drag-and-drop com atualização no backend
- [ ] Atualizar `stage` via `PATCH /api/deals/[id]`
- [ ] Otimistic update + rollback em caso de erro

##### 4.2.4 `Tarefas.tsx`
- [ ] Carregar tarefas reais
- [ ] Implementar criação, edição, exclusão
- [ ] Filtrar por status/prioridade localmente após fetch
- [ ] Sincronizar com Google Calendar (usar `services/googleApiService.ts`)

##### 4.2.5 `Analytics.tsx`
- [ ] Buscar dados via `fetchAnalyticsData()`
- [ ] Renderizar gráficos com dados reais (Recharts)
- [ ] Exibir insights HTML gerados por Gemini
- [ ] Adicionar botão "Atualizar Insights" para re-gerar

##### 4.2.6 `Equipe.tsx` (Admin)
- [ ] Listar membros via `fetchTeamMembers()`
- [ ] Adicionar modal de novo membro
- [ ] Implementar atualização de status (Ativo/Inativo)
- [ ] Restringir ações baseado em role do usuário

##### 4.2.7 `Header.tsx` (Busca Global)
- [ ] Implementar `executeGlobalSearch()` com IA
- [ ] Usar `services/geminiService.ts → getIntelligentSearchParams()`
- [ ] Parsear query natural para parâmetros estruturados
- [ ] Exibir resultados em dropdown unificado

##### 4.2.8 `EmpresaDetalhe.tsx`
- [ ] Buscar empresa via `/api/prospects?cnpj=...`
- [ ] Popular sócios, endereço, CNAEs
- [ ] Gerar análise de prospect via Gemini
- [ ] Implementar tabs: Plano de Ação, Rede, Dados Públicos, Documentos

##### 4.2.9 `Indicacoes.tsx`
- [ ] Buscar status e minhas indicações
- [ ] Listar empresas sugeridas por CEP
- [ ] Implementar botão "Indicar" com POST

##### 4.2.10 `Compliance.tsx`
- [ ] Buscar dados de compliance
- [ ] Exibir logs de acesso em tabela
- [ ] Gerar análise de auditoria via Gemini

##### 4.2.11 `ReportGenerationModal.tsx`
- [ ] Buscar dados via `/api/reports?type=...`
- [ ] Gerar PDF com jspdf + html2canvas
- [ ] Incluir insights gerados por Gemini

#### 4.3 Tratamento de Erros Global
- [ ] Criar `ErrorBoundary` React
- [ ] Implementar toast notifications (ex: `react-hot-toast`)
- [ ] Capturar erros de rede e exibir mensagem amigável
- [ ] Log de erros no console para debug

### 🧪 Testes Fase 4
```bash
# Desenvolvimento
npm run dev

# Checklist manual em cada view:
# 1. Dashboard - cards, gráficos, insights
# 2. Prospecção - busca, paginação, detalhes
# 3. Negócios - kanban, drag-drop, edição
# 4. Tarefas - CRUD, filtros, Google Calendar
# 5. Analytics - gráficos, churn, upsell
# 6. Equipe - listar, adicionar, atualizar
# 7. Busca Global - query natural, resultados
# 8. Indicações - status, sugestões
# 9. Compliance - logs, análise
# 10. Relatórios - geração PDF
```

**Script de Teste E2E** (Playwright/Cypress):
```typescript
// e2e/dashboard.spec.ts
test('Dashboard loads real data', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="stat-cards"]');
  
  const revenueText = await page.textContent('[data-testid="revenue-stat"]');
  expect(revenueText).not.toContain('R$ 0,00'); // Deve ter dados reais
});
```

### ✅ Critério de Conclusão
- [ ] Zero imports de `mockData.ts` nos componentes
- [ ] Todas as views carregam dados reais
- [ ] Loading states implementados
- [ ] Error handling funcional
- [ ] Testes E2E básicos passam
- [ ] UX responsiva e sem bugs visuais

---

## Fase 5: Inteligência Artificial (Gemini)

**Objetivo**: Integrar todas as funcionalidades de IA de forma robusta.

### 📝 Tarefas

#### 5.1 Validação de Configuração
- [ ] Confirmar `GEMINI_API_KEY` em `.env.local` e Vercel
- [ ] Testar conexão via `services/geminiService.ts`
- [ ] Implementar fallback gracioso se API falhar

#### 5.2 Funcionalidades de IA

##### 5.2.1 Dashboard Insights
```typescript
// Em api/dashboard-data.ts
const insightsHtml = await generateAutomatedReport({
  salesData: mockSalesChartData,
  dealData: mockDealStageData,
  churnData: mockChurnPredictions,
  upsellData: mockUpsellOpportunities,
});
```
- [ ] Implementar geração de insights no backend
- [ ] Retornar HTML formatado
- [ ] Renderizar no `Dashboard.tsx` com `dangerouslySetInnerHTML`

##### 5.2.2 Análise de Prospects
```typescript
// Em EmpresaDetalhe.tsx
const analysis = await generateProspectAnalysis(empresa);
// { potentialScore: 85, justification: "...", suggestedPitch: "..." }
```
- [ ] Gerar score de potencial (0-100)
- [ ] Justificativa baseada em dados da empresa
- [ ] Pitch sugerido personalizado

##### 5.2.3 Assistente de Comunicação
- [ ] Modal em `Negocios.tsx` para gerar e-mail/WhatsApp
- [ ] Selecionar tom: formal, casual, urgente
- [ ] Gerar texto via `generateCommunication(deal, type, tone, instructions)`
- [ ] Copiar para clipboard ou enviar direto

##### 5.2.4 Análise de Saúde de Negócio
```typescript
const health = await getDealHealth(deal);
// { score: 70, reasoning: "...", suggestedAction: "..." }
```
- [ ] Calcular score baseado em: valor, estágio, tempo parado, probabilidade
- [ ] Sugerir ação (ex: "Agende reunião", "Envie proposta")

##### 5.2.5 Busca Inteligente
```typescript
const params = await getIntelligentSearchParams("empresas de TI em São Paulo");
// { clients: { cnae: "6201-5/00", cidade: "São Paulo" } }
```
- [ ] Parsear query natural para filtros estruturados
- [ ] Executar busca com parâmetros extraídos
- [ ] Exibir resultados relevantes

##### 5.2.6 Relatórios IA
- [ ] Rede de Relacionamentos: `generateNetworkReport(vinculos)`
- [ ] Análise Territorial: `generateTerritorialReport(empresas)`
- [ ] Performance de Indicações: `generatePerformanceReport(status, indicacoes)`

##### 5.2.7 Compliance & Auditoria
```typescript
const analysis = await analyzeAuditLogs(logs);
// HTML com padrões incomuns, acessos fora de horário, etc.
```

#### 5.3 Otimizações de Prompt
- [ ] Revisar todos os prompts em `geminiService.ts`
- [ ] Adicionar exemplos de few-shot learning
- [ ] Usar `responseMimeType: 'application/json'` para respostas estruturadas
- [ ] Implementar retry com backoff exponencial

#### 5.4 Segurança & Custos
- [ ] Nunca enviar dados sensíveis (CPF completo, senhas) para Gemini
- [ ] Implementar rate limiting (max 100 requisições/minuto)
- [ ] Cachear respostas comuns (ex: insights do dashboard)
- [ ] Monitorar custos via logs (tokens consumidos)

### 🧪 Testes Fase 5
```bash
# Teste manual de cada feature IA
node scripts/test-gemini.js

# Verificar latência
time curl -X POST /api/dashboard-data

# Validar JSON parsing
const result = await generateProspectAnalysis(mockEmpresa);
console.assert(typeof result.potentialScore === 'number');
```

### ✅ Critério de Conclusão
- [ ] Todas as 7 funcionalidades IA implementadas
- [ ] Fallbacks funcionando (sem crash se API falhar)
- [ ] Prompts otimizados e testados
- [ ] Rate limiting ativo
- [ ] Logs de uso registrados

---

## Fase 6: Autenticação & Segurança

**Objetivo**: Garantir que apenas usuários autenticados acessem o sistema.

### 📝 Tarefas

#### 6.1 Supabase Auth Setup
- [ ] Habilitar Email/Password no Supabase Dashboard
- [ ] Configurar templates de e-mail (confirmação, reset senha)
- [ ] Adicionar domínio na whitelist de redirecionamento
- [ ] Configurar JWT secret (automático no Supabase)

#### 6.2 Frontend Auth

##### 6.2.1 `contexts/AuthContext.tsx`
```typescript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
```

##### 6.2.2 `components/auth/LoginView.tsx`
- [ ] Form de login com email/senha
- [ ] Validação de input
- [ ] Exibir erros (ex: credenciais inválidas)
- [ ] Redirecionar para dashboard após login

##### 6.2.3 Protected Routes em `App.tsx`
```typescript
if (loading) return <div>Carregando...</div>;
if (!user) return <LoginView />;
return <MainApp />; // Dashboard, Sidebar, Header
```

#### 6.3 Backend Auth

##### 6.3.1 `api/_lib/auth.ts`
```typescript
export const requireUser = async (request: VercelRequest, supabase: SupabaseClient) => {
  const token = extractBearerToken(request);
  if (!token) throw toHttpError(401, 'Token ausente');

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw toHttpError(401, 'Sessão inválida');

  return data.user;
};
```

##### 6.3.2 Aplicar em Todas as Rotas
```typescript
// Em cada api/*.ts
const user = await requireUser(request, supabase);

// Opcional: verificar role
if (user.user_metadata?.role !== 'Admin') {
  throw toHttpError(403, 'Permissão negada');
}
```

#### 6.4 Row Level Security (RLS)
- [ ] Revisar políticas criadas na Fase 2
- [ ] Testar com diferentes usuários (Admin vs User)
- [ ] Garantir que User só vê seus próprios dados
- [ ] Admin pode ver tudo

#### 6.5 Segurança Adicional
- [ ] HTTPS obrigatório em produção (Vercel automático)
- [ ] Content Security Policy headers
- [ ] Rate limiting no Vercel (via `vercel.json`)
- [ ] Validação de input em todas as rotas (sanitizar SQL injection)

### 🧪 Testes Fase 6
```bash
# Criar dois usuários de teste
node scripts/create-test-users.js
# Output: admin@test.com (Admin), user@test.com (User)

# Testar login
curl -X POST /api/auth/login -d '{"email":"admin@test.com","password":"..."}'

# Testar acesso sem token
curl /api/deals
# Esperado: 401 Unauthorized

# Testar acesso com token inválido
curl -H "Authorization: Bearer INVALID" /api/deals
# Esperado: 401

# Testar RLS
# Como User: acessar /api/team
# Esperado: 403 ou dados filtrados
```

### ✅ Critério de Conclusão
- [ ] Login/Logout funcionando
- [ ] Todas as rotas protegidas
- [ ] RLS testado e funcionando
- [ ] Sem vazamento de dados entre usuários
- [ ] Testes de segurança passam

---

## Fase 7: Testes End-to-End

**Objetivo**: Validar fluxos completos de usuário.

### 📝 Tarefas

#### 7.1 Setup de Testes
```bash
npm install -D @playwright/test
npx playwright install
```

#### 7.2 Cenários de Teste

##### 7.2.1 Fluxo de Login
```typescript
test('Usuário consegue fazer login', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'senha123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

##### 7.2.2 Prospecção
```typescript
test('Busca e visualiza empresa', async ({ page }) => {
  await login(page);
  await page.goto('/prospeccao');
  await page.fill('[placeholder="Buscar empresas..."]', 'Contta');
  await page.waitForSelector('.empresa-card');
  await page.click('.empresa-card:first-child');
  await expect(page.locator('h1')).toContainText('Contta');
});
```

##### 7.2.3 Criação de Negócio
```typescript
test('Cria novo deal', async ({ page }) => {
  await login(page);
  await page.goto('/negocios');
  await page.click('[data-testid="new-deal-btn"]');
  await page.fill('[name="companyName"]', 'Empresa Teste LTDA');
  await page.fill('[name="value"]', '50000');
  await page.click('[type="submit"]');
  await expect(page.locator('.deal-card')).toContainText('Empresa Teste LTDA');
});
```

##### 7.2.4 Gestão de Tarefas
```typescript
test('Adiciona e completa tarefa', async ({ page }) => {
  await login(page);
  await page.goto('/tarefas');
  await page.click('[data-testid="add-task-btn"]');
  await page.fill('[name="title"]', 'Ligar para cliente');
  await page.selectOption('[name="priority"]', 'Alta');
  await page.click('[type="submit"]');
  
  const taskCard = page.locator('.task-card', { hasText: 'Ligar para cliente' });
  await taskCard.locator('[data-action="complete"]').click();
  await expect(taskCard).toHaveClass(/completed/);
});
```

##### 7.2.5 Analytics
```typescript
test('Dashboard carrega analytics', async ({ page }) => {
  await login(page);
  await page.goto('/analytics');
  await page.waitForSelector('.recharts-wrapper');
  const revenueChart = page.locator('[data-chart="revenue"]');
  await expect(revenueChart).toBeVisible();
});
```

#### 7.3 Testes de Performance
```typescript
test('Dashboard carrega em menos de 3s', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  await page.waitForSelector('[data-testid="dashboard-loaded"]');
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(3000);
});
```

#### 7.4 Testes de Acessibilidade
```bash
npm install -D @axe-core/playwright

test('Dashboard é acessível', async ({ page }) => {
  await login(page);
  await injectAxe(page);
  const results = await checkA11y(page);
  expect(results.violations).toHaveLength(0);
});
```

### 🧪 Execução de Testes
```bash
# Todos os testes
npm run test:e2e

# Modo headless
npx playwright test

# Com interface gráfica
npx playwright test --ui

# Específico
npx playwright test dashboard.spec.ts
```

### ✅ Critério de Conclusão
- [ ] 15+ cenários de teste implementados
- [ ] Taxa de sucesso > 95%
- [ ] Performance: páginas carregam < 3s
- [ ] Acessibilidade: zero violações críticas
- [ ] Testes rodam em CI/CD

---

## Fase 8: Deploy & Monitoramento

**Objetivo**: Colocar a aplicação em produção e monitorar saúde.

### 📝 Tarefas

#### 8.1 Preparação para Deploy

##### 8.1.1 Otimizações de Build
```bash
# Analisar bundle
npm install -D vite-plugin-bundle-analyzer
npx vite-bundle-analyzer

# Reduzir tamanho
- [ ] Code splitting por rota
- [ ] Lazy loading de componentes pesados
- [ ] Comprimir assets (imagens, fonts)
- [ ] Tree shaking de bibliotecas não usadas
```

##### 8.1.2 Variáveis de Ambiente
```bash
# Configurar no Vercel Dashboard
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add GEMINI_API_KEY production
vercel env add CNPJA_API_KEY production
```

##### 8.1.3 `vercel.json` Final
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 10,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "Authorization, Content-Type" }
      ]
    }
  ]
}
```

#### 8.2 Deploy

##### 8.2.1 Deploy Inicial
```bash
# Link ao projeto
vercel link

# Deploy de preview
vercel

# Deploy de produção
vercel --prod
```

##### 8.2.2 Verificação Pós-Deploy
- [ ] Acessar URL de produção
- [ ] Testar login
- [ ] Verificar que todas as views carregam
- [ ] Checar console do navegador (sem erros)
- [ ] Validar que APIs retornam dados reais

#### 8.3 Monitoramento

##### 8.3.1 Vercel Analytics
- [ ] Habilitar Web Analytics no dashboard
- [ ] Configurar Core Web Vitals tracking
- [ ] Monitorar usage de Serverless Functions

##### 8.3.2 Supabase Monitoring
- [ ] Configurar alertas de uso (Database, Auth, Storage)
- [ ] Revisar logs de queries lentas
- [ ] Verificar taxa de erro em Auth

##### 8.3.3 Error Tracking (Sentry)
```bash
npm install @sentry/react @sentry/vercel

# Em index.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://...",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});
```

##### 8.3.4 Uptime Monitoring
- [ ] Configurar ping a cada 5min (UptimeRobot, Pingdom)
- [ ] Alertas por e-mail/SMS se site cair
- [ ] Monitorar latência de APIs

#### 8.4 CI/CD

##### 8.4.1 GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

#### 8.5 Rollback Plan
```bash
# Listar deployments
vercel ls

# Rollback para versão anterior
vercel rollback [deployment-url]
```

### 🧪 Testes Pós-Deploy
```bash
# Smoke test em produção
curl https://contta-crm.vercel.app/api/health
curl -H "Authorization: Bearer $PROD_TOKEN" https://contta-crm.vercel.app/api/deals

# Lighthouse audit
npx lighthouse https://contta-crm.vercel.app --view

# Load testing (Artillery)
npm install -D artillery
npx artillery quick --count 100 --num 10 https://contta-crm.vercel.app
```

### ✅ Critério de Conclusão
- [ ] Deploy de produção bem-sucedido
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Monitoramento ativo (Analytics, Sentry, Uptime)
- [ ] CI/CD rodando
- [ ] Lighthouse score > 90
- [ ] Load test: 100 usuários simultâneos sem erro

---

## Checklist de Qualidade

### 🔍 Code Quality
- [ ] ESLint configurado e passando: `npm run lint`
- [ ] TypeScript strict mode sem erros: `npx tsc --noEmit --strict`
- [ ] Prettier formatação consistente
- [ ] Zero `console.log` em produção (usar logger apropriado)
- [ ] Comentários em funções complexas
- [ ] README.md atualizado com instruções de setup

### 🎨 UI/UX
- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Loading states em todas as operações assíncronas
- [ ] Error states com mensagens claras
- [ ] Empty states (ex: "Nenhum negócio encontrado")
- [ ] Acessibilidade: navegação por teclado, ARIA labels
- [ ] Temas dark/light (opcional, mas recomendado)

### 🔒 Segurança
- [ ] Todas as rotas autenticadas
- [ ] Input sanitizado (proteção contra XSS, SQL injection)
- [ ] Rate limiting configurado
- [ ] HTTPS em produção
- [ ] Secrets nunca commitados no Git
- [ ] Dependências atualizadas (`npm audit`)

### ⚡ Performance
- [ ] Bundle size < 500KB gzipped
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Imagens otimizadas (WebP, lazy loading)
- [ ] Caching de APIs onde apropriado

### 📊 Monitoramento
- [ ] Logs estruturados (JSON)
- [ ] Métricas de uso registradas
- [ ] Erros capturados e alertados
- [ ] Uptime monitorado 24/7

---

## Critérios de Aceitação

### ✅ Funcional
1. **Login**: Usuário consegue fazer login com email/senha do Supabase
2. **Dashboard**: Exibe métricas reais (receita, deals, tarefas) e insights IA
3. **Prospecção**: Busca empresas, filtra por CNAE, visualiza detalhes
4. **Negócios**: Kanban funcional, drag-and-drop, edição inline
5. **Tarefas**: CRUD completo, integração Google Calendar (simulada)
6. **Analytics**: Gráficos Recharts com dados reais, relatórios IA
7. **Equipe**: Admin gerencia membros, roles, permissões
8. **Busca Global**: Query natural convertida em filtros via IA
9. **Indicações**: Programa de indicações funcional
10. **Compliance**: Logs de auditoria, análise LGPD

### ✅ Não-Funcional
1. **Performance**: Todas as páginas carregam < 3s em 3G
2. **Disponibilidade**: Uptime > 99.5% (medido por 30 dias)
3. **Segurança**: Zero vulnerabilidades críticas (npm audit)
4. **Escalabilidade**: Suporta 100 usuários simultâneos
5. **Manutenibilidade**: Código documentado, fácil onboarding

### ✅ Documentação
1. **Técnica**: `MANUAL_TECNICO.md`, `BACKEND_DOCUMENTATION.md` atualizados
2. **Usuário**: `GUIA_RAPIDO_CONTADOR.md` com screenshots
3. **Operacional**: `SETUP.md` com instruções de deploy
4. **Auditoria**: `MCP_AUDITORIA.md` e logs completos

---

## 🚀 Próximos Passos Pós-Produção

### Fase 9: Melhorias Contínuas
- [ ] Implementar testes unitários (Jest + React Testing Library)
- [ ] Adicionar feature flags (LaunchDarkly, Posthog)
- [ ] Criar dashboard de métricas internas (Metabase, Grafana)
- [ ] Implementar cache Redis para queries frequentes
- [ ] Adicionar webhooks para integrações externas

### Fase 10: Novas Features
- [ ] Integração real com Google Workspace (Calendar, Gmail, Drive)
- [ ] WhatsApp Business API para envio de mensagens
- [ ] Sistema de notificações push (web push)
- [ ] Modo offline com Service Workers
- [ ] Exportação de dados (CSV, Excel, JSON)

### Fase 11: Escalabilidade
- [ ] Migrar para Supabase Pro (se necessário)
- [ ] Implementar CDN para assets estáticos
- [ ] Otimizar queries com índices adicionais
- [ ] Implementar sharding de banco (se > 1M registros)
- [ ] Load balancer para Vercel Functions

---

## 📞 Suporte & Contato

**Desenvolvedor Responsável**: [Seu Nome]  
**Email**: dev@contta.com  
**Repositório**: https://github.com/amplabusiness/contta_crm  
**Docs**: https://contta-crm.vercel.app/docs  

---

## 📝 Log de Mudanças

| Data | Fase | Descrição |
|------|------|-----------|
| 2025-11-09 | Setup | Criação do plano de produção |
| ... | ... | ... |

---

**Última Atualização**: 2025-11-09  
**Versão do Documento**: 1.0.0
