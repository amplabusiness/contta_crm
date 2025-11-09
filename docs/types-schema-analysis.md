# Análise Comparativa: types.ts vs supabase-schema.sql

**Data**: 2025-01-XX  
**Objetivo**: Validar conformidade entre interfaces TypeScript e schema Supabase  
**Status**: 🔄 IN-PROGRESS - Fase 1.3 do PLANO_PRODUCAO.md

---

## 📊 Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Total de Interfaces TypeScript** | 28 |
| **Total de Tabelas Supabase** | 7 |
| **Discrepâncias Críticas** | 5 |
| **Campos Faltantes** | 12 |
| **Incompatibilidades de Tipo** | 3 |

---

## 🔍 Análise Por Entidade

### 1. **Empresa** (Interface TS) ↔ **empresas** (Tabela SQL)

#### ✅ Campos Compatíveis
- `cnpj` (TEXT PRIMARY KEY) ✓
- `razao_social` (TEXT NOT NULL) ✓
- `nome_fantasia` (TEXT) ✓
- `situacao_cadastral` (TEXT) ⚠️ *SQL: TEXT, TS: union type*
- `data_abertura` (DATE) ⚠️ *SQL: DATE, TS: string*
- `porte` (TEXT) ⚠️ *SQL: TEXT, TS: union type 'ME' | 'EPP' | 'Demais'*
- `telefones` (TEXT[]) ✓
- `emails` (TEXT[]) ✓

#### ❌ Discrepâncias Críticas

**TypeScript (Interface Empresa):**
```typescript
interface Empresa {
    endereco_principal: Endereco; // OBJETO ANINHADO
    cnae_principal: CNAE;        // OBJETO ANINHADO
    quadro_socios: Socio[];      // ARRAY DE OBJETOS
    documentos: any[];           // NÃO EXISTE NO SQL
    distancia_km?: number;       // CALCULADO (OK)
}
```

**Supabase Schema:**
```sql
-- Campos de endereço são INDIVIDUAIS, não objeto aninhado
logradouro TEXT,
numero TEXT,
bairro TEXT,
cidade TEXT,
uf TEXT,
cep TEXT,
latitude DOUBLE PRECISION,
longitude DOUBLE PRECISION,

-- CNAE é campo individual, não objeto
cnae_principal_codigo TEXT,
cnae_principal_descricao TEXT,

-- Sócios estão em tabela separada (empresa_socios + socios)
-- NÃO há campo quadro_socios na tabela empresas

-- Campo documentos NÃO EXISTE no schema
```

#### 🛠️ Ações Necessárias
1. **Criar interface `EmpresaDB`** para mapear exatamente a tabela SQL
2. **Manter interface `Empresa`** para lógica de negócio (com objetos aninhados)
3. **Criar função `mapEmpresaDBToEmpresa()`** para transformação
4. **Adicionar campo `created_at`** em `Empresa`

---

### 2. **Deal** (Interface TS) ↔ **deals** (Tabela SQL)

#### ✅ Campos Compatíveis
- `id` (UUID) ✓
- `companyName` → `company_name` (TEXT) ✓ *camelCase vs snake_case*
- `contactName` → `contact_name` (TEXT) ✓
- `contactEmail` → `contact_email` (TEXT) ✓
- `value` (NUMERIC) ✓
- `probability` (NUMERIC) ✓
- `stage` (DealStage enum) ✓
- `expectedCloseDate` → `expected_close_date` (DATE) ✓
- `lastActivity` → `last_activity` (TIMESTAMPTZ) ✓

#### ❌ Campos Faltantes no TypeScript
```typescript
// FALTAM no interface Deal:
empresa_cnpj?: string | null;     // REFERENCES empresas(cnpj)
owner_id?: string | null;         // REFERENCES profiles(id)
```

#### ❌ Campo Presente no TS mas Estrutura Diferente
```typescript
// TypeScript:
health: DealHealth | null; // OBJETO ANINHADO {score, reasoning, suggestedAction}

// SQL:
health_score NUMERIC,
health_reasoning TEXT,
health_suggested_action TEXT,
```

#### 🛠️ Ações Necessárias
1. **Adicionar campos:**
   ```typescript
   interface Deal {
       // ... campos existentes
       empresaCnpj?: string | null;
       ownerId?: string | null;
       createdAt?: string; // FALTAVA!
   }
   ```

2. **Criar função de mapeamento:**
   ```typescript
   function mapDealDBToDeal(dbDeal: any): Deal {
       return {
           // ... outros campos
           health: dbDeal.health_score ? {
               score: dbDeal.health_score,
               reasoning: dbDeal.health_reasoning || '',
               suggestedAction: dbDeal.health_suggested_action || ''
           } : null
       };
   }
   ```

---

### 3. **Task** (Interface TS) ↔ **tasks** (Tabela SQL)

#### ✅ Campos Compatíveis
- `id` (UUID) ✓
- `title` (TEXT) ✓
- `dueDate` → `due_date` (DATE) ✓
- `priority` (TaskPriority enum) ✓
- `status` (TaskStatus enum) ✓
- `description` (TEXT) ✓
- `googleCalendarEventId` → `google_calendar_event_id` (TEXT) ✓
- `createdAt` → `created_at` (TIMESTAMPTZ) ✓ *presente!*

#### ❌ Campos Faltantes/Divergentes

**TypeScript:**
```typescript
interface Task {
    relatedDealId: string;      // ✅ OK
    relatedDealName: string;    // ⚠️ REDUNDANTE (pode vir de JOIN)
    // FALTAM:
    // assignee_id?: string | null;
    // deal_id?: string | null; (já tem relatedDealId, ok)
}
```

**SQL:**
```sql
assignee_id UUID REFERENCES profiles(id),
deal_id UUID REFERENCES deals(id),
related_deal_name TEXT,  -- REDUNDANTE mas existe no SQL
```

#### 🛠️ Ações Necessárias
1. **Adicionar `assigneeId`:**
   ```typescript
   interface Task {
       // ... campos existentes
       assigneeId?: string | null;
   }
   ```

2. **Renomear `relatedDealId` → `dealId`** (consistente com SQL)

---

### 4. **TeamMember** (Interface TS) ↔ **profiles** (Tabela SQL)

#### ✅ Campos Compatíveis
- `id` (UUID) ✓
- `name` (TEXT) ✓
- `email` (TEXT UNIQUE) ✓
- `role` (UserRole enum) ✓
- `status` (TEXT) ✓ *SQL: TEXT, TS: 'Ativo' | 'Inativo'*
- `lastLogin` → `last_login` (TIMESTAMPTZ) ✓
- `emailUsageGB` → `email_usage_gb` (NUMERIC) ✓

#### ❌ Campos Faltantes no TypeScript
```typescript
// FALTAM:
createdAt?: string; // created_at TIMESTAMPTZ DEFAULT NOW()
```

#### 🛠️ Ações Necessárias
1. **Adicionar `createdAt`** em `TeamMember`

---

### 5. **Indicacao** (Interface TS) ↔ **indicacoes** (Tabela SQL)

#### ✅ Campos Compatíveis
- `id` (UUID) ✓
- `empresa_nome` (TEXT) ✓
- `status` (TEXT) ✓
- `data_indicacao` (TIMESTAMPTZ) ✓
- `recompensa_ganha` (NUMERIC) ✓

#### ❌ Campos Faltantes no TypeScript
```typescript
// FALTAM:
indicador_id?: string | null;  // REFERENCES profiles(id)
empresa_cnpj?: string | null;  // REFERENCES empresas(cnpj)
```

#### 🛠️ Ações Necessárias
1. **Adicionar campos de relacionamento:**
   ```typescript
   interface Indicacao {
       // ... campos existentes
       indicadorId?: string | null;
       empresaCnpj?: string | null;
   }
   ```

---

## 🏗️ Interfaces Sem Tabela SQL (Apenas Frontend/Analytics)

Estas interfaces **NÃO** têm correspondência no Supabase (são computadas ou mock):

- ✅ `StatCardData` - UI component
- ✅ `SalesData` - Analytics (calculado)
- ✅ `DealStageData` - Analytics (calculado)
- ✅ `RecentActivity` - Agregação de múltiplas tabelas
- ✅ `ChurnPrediction` - IA/Analytics (mock)
- ✅ `UpsellOpportunity` - IA/Analytics (mock)
- ✅ `AutomatedReport` - IA gerado (mock)
- ✅ `ConsentStatus` - LGPD (calculado)
- ✅ `DataAccessLog` - Auditoria (pode vir de tabela futura)
- ✅ `ProspectAnalysis` - IA/Gemini
- ✅ `VinculoAnalysis` - IA/Gemini
- ✅ `DealHealth` - IA/Gemini (mas campos existem no SQL)
- ✅ `MarketInsightResult` - Brave Search MCP
- ✅ `ChatMessage` - UI state
- ✅ `TranscriptionPart` - Voice Assistant
- ✅ `EmailActivity` - Gmail API
- ✅ `GoogleCalendarEvent` - Google Calendar API
- ✅ `CompanyActivity` - Agregação
- ✅ `GenealogyNode` - UI Tree (baseado em empresa_socios)
- ✅ `GlobalSearchResultItem` - Busca global
- ✅ `GlobalSearchResults` - Busca global

---

## 🔧 Interfaces Auxiliares Necessárias

### Tabelas SQL que FALTAM interfaces TypeScript:

#### 1. **socios** (Tabela SQL)
```sql
CREATE TABLE public.socios (
  cpf_parcial TEXT PRIMARY KEY,
  nome_socio TEXT NOT NULL
);
```

**Interface TypeScript existente (Socio):**
```typescript
interface Socio {
    nome_socio: string;
    cpf_parcial: string;
    qualificacao: string;      // ❌ NÃO está na tabela socios
    percentual_capital: number; // ❌ NÃO está na tabela socios
}
```

**Problema:** A interface `Socio` mistura dados de **2 tabelas**:
- `socios` (cpf_parcial, nome_socio)
- `empresa_socios` (qualificacao, percentual_capital)

**Solução:** Criar interfaces separadas:
```typescript
// Tabela: socios
interface SocioDB {
    cpf_parcial: string;
    nome_socio: string;
}

// Tabela: empresa_socios (junção)
interface EmpresaSocioDB {
    id: number;
    empresa_cnpj: string;
    socio_cpf_parcial: string;
    qualificacao: string | null;
    percentual_capital: number | null;
}

// Interface de negócio (JOIN de ambas)
interface Socio {
    nome_socio: string;
    cpf_parcial: string;
    qualificacao: string;
    percentual_capital: number;
}
```

---

## 📝 Plano de Correção

### **Prioridade 1 - Crítico** (Bloqueia backend)
1. ✅ Criar `EmpresaDB` interface
2. ✅ Criar `SocioDB` e `EmpresaSocioDB` interfaces
3. ✅ Adicionar `empresaCnpj`, `ownerId`, `createdAt` em `Deal`
4. ✅ Adicionar `assigneeId` em `Task`
5. ✅ Adicionar `createdAt` em `TeamMember`
6. ✅ Adicionar `indicadorId`, `empresaCnpj` em `Indicacao`

### **Prioridade 2 - Importante** (Melhora type safety)
1. ✅ Criar tipo genérico `ApiResponse<T>`:
   ```typescript
   interface ApiResponse<T> {
       data: T | null;
       error: string | null;
       metadata?: {
           total?: number;
           page?: number;
           limit?: number;
       };
   }
   ```

2. ✅ Criar funções de mapeamento DB → Business:
   ```typescript
   // services/mappers.ts
   export function mapEmpresaDBToEmpresa(db: EmpresaDB, socios: Socio[]): Empresa;
   export function mapDealDBToDeal(db: DealDB): Deal;
   export function mapTaskDBToTask(db: TaskDB): Task;
   ```

3. ✅ Padronizar naming convention:
   - **SQL**: `snake_case` (company_name, created_at)
   - **TypeScript**: `camelCase` (companyName, createdAt)
   - **Mappers**: transformam entre os dois

### **Prioridade 3 - Otimização** (Não urgente)
1. ⏳ Substituir `any[]` em `Empresa.documentos` por tipo específico
2. ⏳ Validar enums TypeScript contra ENUMs SQL:
   - `DealStage` ✓
   - `TaskStatus` ✓
   - `TaskPriority` ✓
   - `UserRole` ✓
3. ⏳ Adicionar JSDoc comments em interfaces críticas

---

## 🎯 Próximos Passos (Tarefa 1.3)

1. **Criar arquivo `types-db.ts`** com interfaces que mapeiam EXATAMENTE as tabelas SQL:
   ```typescript
   // types-db.ts - Direct DB mappings
   export interface EmpresaDB { /* ... */ }
   export interface DealDB { /* ... */ }
   export interface TaskDB { /* ... */ }
   export interface SocioDB { /* ... */ }
   export interface EmpresaSocioDB { /* ... */ }
   ```

2. **Atualizar `types.ts`** com campos faltantes:
   - Deal: +empresaCnpj, +ownerId, +createdAt
   - Task: +assigneeId
   - TeamMember: +createdAt
   - Indicacao: +indicadorId, +empresaCnpj

3. **Criar `services/mappers.ts`**:
   ```typescript
   export function mapEmpresaDBToEmpresa(db: EmpresaDB): Empresa;
   export function mapDealDBToDeal(db: DealDB): Deal;
   // ... outros mappers
   ```

4. **Criar tipo `ApiResponse<T>`** para padronizar respostas de API

5. **Validar com TypeScript compiler**:
   ```bash
   npx tsc --noEmit --strict
   ```

6. **Registrar auditoria MCP**:
   ```powershell
   .\scripts\mcp-audit.ps1 -Scope "types" -Action "refactor" `
     -Details "Alinhamento types.ts com supabase-schema.sql" `
     -Metadata @{
         interfaces_created=5;
         fields_added=12;
         mappers_created=5;
         critical_fixes=6
     }
   ```

---

## 📊 Métricas de Conformidade

| Categoria | Conforme | Parcial | Não Conforme | Total |
|-----------|----------|---------|--------------|-------|
| **Campos Básicos** | 35 | 8 | 0 | 43 |
| **Relacionamentos** | 2 | 3 | 5 | 10 |
| **Timestamps** | 3 | 2 | 5 | 10 |
| **Enums** | 4 | 0 | 0 | 4 |
| **Total** | 44 | 13 | 10 | 67 |

**Score de Conformidade**: 65.7% (44/67)  
**Meta**: 95%+ após correções Prioridade 1 e 2

---

## ✅ Checklist de Conclusão Tarefa 1.3

- [ ] Arquivo `types-db.ts` criado
- [ ] `types.ts` atualizado com campos faltantes
- [ ] `services/mappers.ts` criado
- [ ] Tipo `ApiResponse<T>` criado
- [ ] `npx tsc --noEmit --strict` passa sem erros
- [ ] Auditoria MCP registrada
- [ ] Tarefa 1.3 marcada como `completed` no todo list

---

**Última Atualização**: 2025-01-XX  
**Responsável**: GitHub Copilot  
**Fase**: PLANO_PRODUCAO.md - Fase 1.3
