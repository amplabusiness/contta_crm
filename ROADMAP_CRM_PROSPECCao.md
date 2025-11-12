# 🎯 ROADMAP - CRM & Prospecção Inteligente

> **⚠️ IMPORTANTE**: Esta feature será implementada **APÓS** conclusão das Fases 3 e 4 atuais (Dashboard + Migração Global)

---

## Status Atual - 2025-11-11

- [ ] Fase 1 - Ingestão completa CNPJA (planejada)
- [ ] Fase 2 - Vínculos societários (dependente da Fase 1)
- [ ] Fase 3 - Genealogia de sócios (dependente da Fase 2)
- [ ] Fase 4 - Geolocalização e prospecção (dependente da Fase 1)
- [ ] Fase 5 - Programa de indicações (após Fase 4)
- [ ] Fase 6 - Compliance LGPD (após consolidar dados)
- [ ] Fase 7 - Analytics e relatórios (fase final)

### Próximos passos imediatos

1. Preparar infraestrutura da Fase 1:
  - [x] Criar tabelas adicionais no Supabase conforme seção "Estrutura de Dados". ✅ 2025-11-11
  - [ ] Desenvolver scripts de ingestão (`scripts/ingerir-cnpja-completo.ts`).
  - [ ] Configurar buckets no Supabase Storage para arquivos completos da CNPJA.
  - [ ] Definir cron jobs e limites de taxa para atualização periódica.
2. Definir entregáveis do dashboard individual por empresa:
  - [x] Especificar contrato da API `/api/empresas/:cnpj/dashboard`. ✅ 2025-11-11
    - **Método:** `GET` (autenticado via Supabase JWT); **Rota base:** `/api/empresas/:cnpj/dashboard` com `:cnpj` sanitizado para 14 dígitos.
    - **Query params opcionais:** `include=metrics,pipeline,tasks,genealogy,geo,legal` (default retorna todos os módulos), `refresh=true` força reidratação em cache MCP.
    - **Resposta (payload v1):**
      ```json
      {
        "empresa": { "cnpj": "00000000000191", "razaoSocial": "...", "nomeFantasia": "...", "situacao": "Ativa", "porte": "EPP", "cnaePrincipal": { "codigo": "6201-5/01", "descricao": "..." }, "endereco": { "logradouro": "...", "numero": "...", "bairro": "...", "cidade": "...", "uf": "SP", "cep": "01001000", "latitude": -23.55, "longitude": -46.63 } },
        "metrics": { "totalDeals": 4, "openValue": 185000, "winRate": 0.35, "avgCycleDays": 26, "atividadeRecente": "2025-11-09T18:12:00.000Z" },
        "pipeline": { "ativos": [{ "id": "uuid", "stage": "Proposal", "value": 45000, "probability": 70, "expectedCloseDate": "2025-11-20", "owner": { "id": "uuid", "name": "..." } }], "historico": [{ "id": "uuid", "stage": "Closed Won", "closedAt": "2025-05-18" }] },
        "tasks": { "pendentes": [{ "id": "uuid", "title": "Follow-up fiscal", "dueDate": "2025-11-14", "priority": "Alta", "status": "A Fazer" }], "atrasadas": 2, "concluidas30d": 5 },
        "genealogy": { "nodes": [{ "id": "root", "type": "empresa", "name": "Razão Social", "level": 0, "children": [{ "id": "socio-1", "type": "pessoa", "name": "João Silva", "grauVinculo": 1, "cpfParcial": "***123***", "children": [{ "id": "empresa-2", "type": "empresa", "name": "Empresa Vinculada", "level": 1 }] }] }] },
        "geo": { "enderecos": [{ "rotulo": "Matriz", "lat": -23.55, "lng": -46.63, "updatedAt": "2025-11-08" }], "empresasProximas": [{ "cnpj": "12345678000111", "nome": "Padaria Vizinha", "distanciaMetros": 320, "statusProspeccao": "nao_contatado" }] },
        "legal": { "processos": [{ "numero": "0012345-67.2023.8.26.0100", "tribunal": "TJSP", "classe": "Execução Fiscal", "riscoScore": 72, "ultimoEvento": { "data": "2025-11-07", "descricao": "Intimação" } }], "alertas": [{ "tipo": "alto_risco", "descricao": "Acompanhar audiência em 15/11", "origem": "LegalAdvisor" }] }
      }
      ```
    - **Fontes internas:** tabelas `empresas`, `deals`, `tasks`, `processos_judiciais`, `processo_movimentacoes`, `empresas_proximas`, `genealogia_socios`; chamadas auxiliares: `vinculosService`, `businessGenealogyService`, DataJud cache.
    - **Regras:** tempo de resposta alvo < 800 ms com cache Redis/MCP; erros por módulo retornam chave com `null` + `warnings[]`; logs seguem `request_id` gerado no Edge.
  - [x] Mapear componentes React (Resumo, Pipeline, Genealogia, Indicadores, Mapa). ✅ 2025-11-11
    - `EmpresaDetalhe.tsx` evolui para consumir hook `useEmpresaDashboard(cnpj)` e renderizar abas `Visão Geral`, `Pipeline`, `Atividades`, `Genealogia`, `Risco Jurídico`, `Mapa`.
    - Criar `components/EmpresaPipeline.tsx`, `EmpresaIndicadores.tsx`, `EmpresaMapa.tsx`, `EmpresaRiscoJuridico.tsx` com props tipadas a partir do contrato acima.
    - Adotar `context/EmpresaDashboardContext.tsx` para compartilhar loading/errors entre abas e permitir polling seletivo (ex.: atualizar módulo `tasks` a cada 60s).
    - Ajustar `types.ts` com interfaces `EmpresaDashboardResponse`, `EmpresaDashboardMetrics`, `EmpresaDashboardPipelineDeal`, `EmpresaDashboardLegalAlert`.
  - [x] Ajustar cards do dashboard global para apontar links de drill-down. ✅ 2025-11-11
    - `components/Dashboard.tsx`: incorporar `onClick` nos cartões de `StatCard` e nos itens de `RecentActivity` chamando `navigate('EmpresaDetalhe', { cnpj })`.
    - `components/DealCard.tsx`, `RecentActivity.tsx` e `Analytics.tsx` exibem CTA "Ver detalhamento" (ícone `ArrowTopRightIcon`) que dispara o drill-down.
    - Adicionar métrica "Último acesso ao dashboard" no Supabase (`profiles` → `last_dashboard_visit`) para auditoria de uso.
3. Concluir pendências atuais (pré-Fase 1):
  - [ ] Monitorar incidente da Vercel (builds em fila) e reenfileirar deploy de produção quando normalizar.
  - [ ] Validar novas rotas `/api/deals`, `/api/cron/update-*` em produção assim que o deploy concluir.
  - [ ] Atualizar documentação (BACKEND_DOCUMENTATION.md e PROXIMOS_PASSOS.md) com cron jobs, `CRON_SECRET` e fluxos de deploy.

### Alinhamento com Plano de Produção (Novembro 2025)

- **P1 · Operacionalizar dados core**
  - [ ] Mapear, com gpt-5-codex e mcp, as fontes reais de `deals`, `tasks` e `indicacoes`.
  - [ ] Definir campos obrigatórios, gatilhos de atualização e periodicidade de cada fonte.
  - [x] Preparar estrutura base no Supabase (tabelas e índices atualizados em 2025-11-11).
  - [ ] Validar checklist abaixo com stakeholders e congelar contrato de dados.

  **Fontes e responsabilidades sugeridas**
  - `deals`
    - Fonte primária: pipeline comercial interno (formularios Contta + reuniões de triagem) consolidado via painel do parceiro (Ampla) + import manual de oportunidades vindas do site Contta.
    - Owner: time comercial Contta (Adm) com apoio de Sérgio para deals oriundos de indicações Ampla.
    - Ingestão inicial: planilha compartilhada (Google Sheets → `scripts/seed-deals.ts`).
    - Atualização contínua: formulário “Iniciar Negócio” no CRM + importador semanal do Sheets (MCP Filesystem registra execuções).
  - `tasks`
    - Fonte primária: follow-ups operacionais gerados pelos owners de deals; segundos canais: tarefas de compliance disparadas pelos cron jobs.
    - Owner: responsável pelo negócio (profile `owner_id`) com supervisão do coordenador Ampla.
    - Ingestão inicial: gerar tarefas padrão a partir do seed de deals (ex.: “Enviar proposta”, “Follow-up 7 dias”).
    - Atualização contínua: criação via modais no CRM, cron `/api/cron/update-tasks` cria lembretes D-2, auditoria diária registra lacunas.
  - `indicacoes`
    - Fonte primária: clientes ativos da Ampla + parceiros (inputs manuais ou landing page “Indique e Ganhe”).
    - Owner: Sérgio (aprovação) + CS Contta (tratativa) — somente Admin cria/edita status.
    - Ingestão inicial: importar base histórica de indicações válidas; relacionar com `empresas` quando houver CNPJ.
    - Atualização contínua: componentes `Indicacoes`, API `/api/indicacoes`, cron mensal valida recompensas pendentes.
  - `risco_juridico`
    - Fonte primária: CNJ DataJud (API GraphQL pública) para empresas, sócios e parentes.
    - Complementos: scrapers MCP para tribunais sem integração automática (e-SAJ, Projudi) com consentimento.
    - Owner: corpo jurídico Ampla + time de compliance Contta.
    - Frequência: sincronização diária via cron protegido (`scripts/sync-datajud.ts`), auditoria MCP após cada run.
    - Agente: "LegalAdvisor" (Gemini + Communicator) revisa movimentações, gera parecer resumido e orientações de próximos passos para o jurídico.

  **Campos mínimos e gatilhos recomendados**
  - `deals`
    - Obrigatórios: `empresa_cnpj` ou `company_name`, `value`, `stage`, `owner_id`, `expected_close_date`.
    - Opcional variável: `probability`, `health_score`, `health_reasoning` (preenchidos pelos agentes MCP).
    - Gatilhos: mover estágio atualiza `last_activity`; fechamento `Closed Won` cria tarefa “Onboarding Contábil”.
    - SLA: revisão semanal (segunda-feira) + audit script aponta deals sem atividade ≥ 10 dias.
  - `tasks`
    - Obrigatórios: `title`, `status`, `priority`, `assignee_id`, `related_deal_id` ou `related_deal_name`.
    - Gatilhos: mudança de `status` para “Concluída” registra `last_activity` do deal; cron verifica `due_date` < hoje e marca como “Atrasada”.
    - SLA: borda 48h antes do vencimento gera notificação (cron + IA Communicator prepara e-mail/WhatsApp).
  - `indicacoes`
    - Obrigatórios: `empresa_nome` ou `empresa_cnpj`, `status`, `indicador_id`, `data_indicacao`.
    - Campos de recompensa: `recompensa_ganha`, `tipo_remuneracao`, `pago` (sincronizados com `programa_indicacoes`).
    - Gatilhos: mudança para “Convertido” dispara criação de deal + registro em `programa_indicacoes` com `data_conversao`.
    - SLA: indicador recebe feedback em até 72h; cron semanal envia lembrete se `status = 'Em negociação'` > 14 dias.
  - `socios`
    - Obrigatórios: `cpf_parcial`, `nome_socio`; `data_nascimento` torna-se campo requerido quando a ingestão automática não preencher (captura manual pelo CRM).
  - Fluxo manual: detalhe da empresa (Quadro Societário) expõe ação **Atualizar dados** → modal coleta CPF completo (validação 11 dígitos com máscara `000.000.000-00`) e data `type="date"` (`aaaa-mm-dd`), normaliza entrada BR (`dd/mm/aaaa`) e envia via `PATCH /api/socios`.
    - Gatilhos: cron diário gera tarefas “Enviar mensagem de aniversário” quando `data_nascimento` corresponde ao dia seguinte; agente Communicator sugere roteiro personalizado.
    - SLA: time de CS registra retorno do cliente em até 48h após o contato comemorativo e marca reminder como concluído no módulo de tarefas.
  - `processos_judiciais`
    - Obrigatórios: `numero_processo`, `entidade_alvo` (empresa/sócio/parente), `tribunal`, `classe`, `ultimo_evento_data`.
    - Gatilhos: nova movimentação relevante cria tarefa jurídica e alerta o corpo legal; fase “Cumprimento de Sentença” gera deal de serviço jurídico.
    - SLA: checagem diária automática (cron DataJud); revisão manual semanal pelo jurídico Ampla.
- **P2 · Backend real-time**
  - [ ] Implementar endpoints Supabase/Vercel (`GET/POST/PUT/PATCH`) completos para `deals`, `tasks` e `indicacoes` com Supabase Auth.
  - [ ] Remover mocks correspondentes no `apiService.ts` e serviços auxiliares.
- **P3 · Seed inicial confiável**
  - [ ] Criar scripts de seed/ingestão (Node + Supabase) que substituam os mocks por dados reais ou curadoria inicial.
  - [ ] Documentar o fluxo de execução dos seeds e respectivas rotinas de validação.
- **P4 · Sincronização front**
  - [ ] Atualizar hooks/serviços (`services/apiService.ts`, `services/vinculosService.ts`, etc.) para consumir os novos endpoints.
  - [ ] Ajustar componentes (`Negocios`, `Tarefas`, `Indicacoes`, dashboards) para refletir KPIs reais.
- **P5 · Rotina contínua**
  - [ ] Documentar e automatizar cron jobs/queues para: atualização diária do importador CNPJá, revisão semanal de tarefas e geração de ordens de serviço 213-5.
  - [ ] Garantir armazenamento seguro do `CRON_SECRET` e registrar fluxos no `BACKEND_DOCUMENTATION.md`.
  - [ ] Implementar monitoramento DataJud: tabelas `processos_judiciais` + `processo_movimentacoes`, script `scripts/sync-datajud.ts`, cron diário e alertas ao jurídico.
  - [ ] Criar rotina `scripts/sync-birthdays.ts` que lê `public.socios.data_nascimento`, gera notificações + tarefas comemorativas, integra com Communicator para enviar felicitações automáticas quando autorizado.
- **P6 · Qualidade & validação**
  - [ ] Adicionar scripts de auditoria (`scripts/audit-genealogy.ts`, `audit-deals.ts`, `audit-tasks.ts`, `audit-indicacoes.ts`).
  - [ ] Expor dashboards de lacunas (tarefas vazias, indicadores sem atualização >= 7 dias).

> Cada prioridade P1–P6 deve gerar commit + registro de auditoria MCP antes do avanço para a próxima.

### Observações

- Usar este arquivo como checklist mestre, atualizando as caixas ao concluir cada item.
- A visão detalhada por empresa só ficará completa após as Fases 1 a 4.
- Alinhar prioridades com stakeholders antes de iniciar novas fases.

## 📋 Visão Geral

Sistema avançado de **CRM e Prospecção de Clientes** para escritórios contábeis, utilizando:
- API CNPJA completa (sócios, documentos, vínculos)
- Geolocalização (raio de proximidade)
- Análise de vínculos societários (até 3º grau)
- Genealogia de sócios e familiares
- Storage organizado por cliente
- Gamificação (remuneração por indicação)

---

## 🎯 Objetivos de Negócio

1. **Prospecção Inteligente**: Identificar empresas próximas aos clientes atuais
2. **Rede de Relacionamentos**: Mapear vínculos entre sócios e empresas
3. **CRM Automatizado**: Gestão de leads baseada em geolocalização
4. **Programa de Indicações**: Incentivar clientes a trazerem vizinhos
5. **Análise de Mercado**: Identificar clusters de atividades por região

---

## 🏗️ Arquitetura Técnica

### **1. Módulos Principais**

```
┌─────────────────────────────────────────────────────────┐
│                   SISTEMA CRM                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Ingestão   │  │   Análise    │  │  Prospecção  │  │
│  │  CNPJA API   │→│  Vínculos    │→│ Geolocalizada│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                  ↓                  ↓         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Storage    │  │  Genealogia  │  │ Gamificação  │  │
│  │ Documentos   │  │   Sócios     │  │  Indicações  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **2. Estrutura de Dados**

```sql
-- Nova tabela: socios
CREATE TABLE socios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id),
  cpf_parcial VARCHAR(14), -- Ex: ***123.456.789**
  nome_socio TEXT NOT NULL,
  qualificacao TEXT, -- Administrador, Sócio, etc.
  data_entrada DATE,
  percentual_capital DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nova tabela: vinculos_societarios
CREATE TABLE vinculos_societarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  socio_id UUID REFERENCES socios(id),
  empresa_vinculada_cnpj VARCHAR(18),
  empresa_vinculada_nome TEXT,
  grau_vinculo INTEGER, -- 1º, 2º ou 3º grau
  tipo_vinculo TEXT, -- direto, indireto_socio, indireto_familiar
  data_descoberta TIMESTAMP DEFAULT NOW()
);

-- Nova tabela: genealogia_socios
CREATE TABLE genealogia_socios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  socio_principal_id UUID REFERENCES socios(id),
  cpf_parcial_relacionado VARCHAR(14),
  nome_relacionado TEXT,
  grau_parentesco TEXT, -- pai, mae, irmao, conjuge, filho, etc.
  tipo_descoberta TEXT, -- mesmo_sobrenome, mesmo_endereco, declaracao_ir
  confiabilidade INTEGER, -- 0-100%
  notas TEXT
);

-- Nova tabela: empresas_proximas
CREATE TABLE empresas_proximas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_referencia_id UUID REFERENCES clientes(id),
  cnpj_proxima VARCHAR(18),
  razao_social_proxima TEXT,
  distancia_metros INTEGER,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  cnae_principal VARCHAR(10),
  porte TEXT,
  status_prospeccao TEXT, -- nao_contatado, em_negociacao, cliente, rejeitado
  indicado_por_cliente_id UUID REFERENCES clientes(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nova tabela: programa_indicacoes
CREATE TABLE programa_indicacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_indicador_id UUID REFERENCES clientes(id),
  empresa_indicada_cnpj VARCHAR(18),
  data_indicacao TIMESTAMP DEFAULT NOW(),
  status TEXT, -- pendente, convertido, expirado
  data_conversao TIMESTAMP,
  tipo_remuneracao TEXT, -- desconto_mensalidade, bonus_credito, cashback
  valor_remuneracao DECIMAL(10,2),
  pago BOOLEAN DEFAULT FALSE,
  notas TEXT
);

-- Nova tabela: documentos_cnpja
CREATE TABLE documentos_cnpja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id),
  tipo_documento TEXT, -- qsa, cnaes, enderecos, contatos, etc.
  storage_path TEXT, -- clients/{cliente_id}/cnpja/{tipo}.json
  tamanho_bytes INTEGER,
  data_download TIMESTAMP DEFAULT NOW(),
  versao INTEGER DEFAULT 1
);
```

---

## 📦 FASE 1: Ingestão Completa CNPJA

### **1.1 Download de Dados Completos**

**Script**: `scripts/ingerir-cnpja-completo.ts`

```typescript
/**
 * Dados a serem baixados por empresa:
 */
interface CNPJACompleto {
  // Básicos
  dados_cadastrais: object;      // razao_social, nome_fantasia, etc.
  situacao_cadastral: object;    // ativa, suspensa, baixada
  
  // Sócios (QSA - Quadro Societário)
  quadro_socios: {
    cpf_parcial: string;         // ***123.456.789**
    nome: string;
    qualificacao: string;
    data_entrada: string;
    percentual_capital: number;
  }[];
  
  // Atividades
  cnaes_principais: object[];
  cnaes_secundarios: object[];
  
  // Endereços e Contatos
  enderecos: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    latitude?: number;           // IMPORTANTE para geolocalização
    longitude?: number;
  }[];
  contatos: {
    telefones: string[];
    emails: string[];
  };
  
  // Documentos Complementares
  certidoes: object[];
  protestos: object[];
  acoes_judiciais: object[];
  
  // Metadados
  data_consulta: string;
  fonte: 'cnpja_api';
}
```

**Fluxo de Ingestão:**
1. Para cada cliente no banco
2. Consultar API CNPJA com parâmetro `?maxAge=0` (dados atualizados)
3. Salvar JSON completo no Supabase Storage: `clients/{cliente_id}/cnpja/dados_completos.json`
4. Parsear e popular tabelas normalizadas (`socios`, `documentos_cnpja`)
5. Rate limiting: 1 request/segundo (86.400 consultas/dia)
6. Retry automático em caso de erro

**Storage Structure:**
```
storage/
  └── clients/
      └── {cliente_id}/
          ├── cnpja/
          │   ├── dados_completos.json
          │   ├── quadro_socios.json
          │   ├── cnaes.json
          │   ├── certidoes.json
          │   └── historico/
          │       ├── 2025-10-17_dados_completos.json
          │       └── 2025-09-15_dados_completos.json
          ├── documentos/
          │   ├── contratos/
          │   └── xmls/
          └── relatorios/
```

---

## 📊 FASE 2: Análise de Vínculos Societários

### **2.1 Mapear Sócios e Empresas (1º Grau)**

**Script**: `scripts/mapear-vinculos-1grau.ts`

```typescript
/**
 * Para cada sócio de cada cliente:
 * 1. Extrair CPF parcial (***123.456.789**)
 * 2. Consultar CNPJA: GET /office?person={cpf_parcial}
 * 3. Retorna todas as empresas onde essa pessoa é sócia
 * 4. Salvar em vinculos_societarios (grau_vinculo = 1)
 */

// Exemplo:
// Cliente A: CNPJ 12.345.678/0001-90
//   └── Sócio: João Silva (***123.456.789**)
//       ├── Empresa B: CNPJ 98.765.432/0001-10 (1º grau)
//       └── Empresa C: CNPJ 11.222.333/0001-20 (1º grau)
```

### **2.2 Mapear 2º Grau (Sócios dos Sócios)**

**Script**: `scripts/mapear-vinculos-2grau.ts`

```typescript
/**
 * Para cada empresa encontrada no 1º grau:
 * 1. Buscar QSA da empresa
 * 2. Para cada sócio encontrado (excluindo já mapeados):
 *    - Consultar suas outras empresas
 * 3. Salvar em vinculos_societarios (grau_vinculo = 2)
 */

// Exemplo:
// Empresa B (1º grau) tem sócia Maria Santos
//   └── Maria Santos (***987.654.321**)
//       └── Empresa D: CNPJ 44.555.666/0001-30 (2º grau)
```

### **2.3 Mapear 3º Grau**

Repetir processo para empresas do 2º grau.

**⚠️ Atenção**: Crescimento exponencial! 
- 1 cliente → ~5 sócios → ~25 empresas (1º grau)
- 25 empresas → ~125 sócios → ~625 empresas (2º grau)
- 625 empresas → ~3.125 sócios → ~15.625 empresas (3º grau)

**Estratégia**: Limitar análise a empresas ativas e do mesmo estado/região.

---

## 👨‍👩‍👧‍👦 FASE 3: Genealogia de Sócios

### **3.1 Análise de Sobrenomes**

```typescript
/**
 * Algoritmo de detecção de parentesco:
 */
interface DeteccaoParentesco {
  // 1. Análise de Sobrenomes
  mesmoSobrenome: boolean;          // Silva == Silva
  sobrenomesComuns: string[];       // Santos, Silva, Oliveira, etc.
  
  // 2. Análise de Endereços
  mesmoEndereco: boolean;           // Rua X, 123 == Rua X, 123
  enderecoProximo: boolean;         // Mesmo bairro/CEP
  
  // 3. Análise de CPF Parcial
  cpfSequencial: boolean;           // ***123.456.789** vs ***123.456.790**
  mesmaRegiao: boolean;             // Primeiros dígitos CPF (região emissão)
  
  // 4. Análise de Vínculos
  sociosJuntos: number;             // Quantas empresas compartilham
  
  // 5. Scoring de Confiabilidade
  score: number;                    // 0-100%
}
```

### **3.2 Árvore Genealógica Visual**

```
João Silva (***123.456.789**)
├── Possíveis Familiares (85% confiança):
│   ├── Maria Silva (***123.456.790**) - mesmo sobrenome, CPF sequencial
│   │   └── Empresas: XYZ Ltda, ABC Comércio
│   ├── José Silva (***123.456.800**) - mesmo sobrenome, mesmo endereço
│   └── Ana Santos Silva (***987.654.321**) - sobrenome composto
│
└── Empresas Diretas:
    ├── Empresa A (12.345.678/0001-90)
    ├── Empresa B (98.765.432/0001-10)
    └── Empresa C (11.222.333/0001-20)
```

---

## 🗺️ FASE 4: Geolocalização e Prospecção

### **4.1 Enriquecimento de Coordenadas**

```typescript
/**
 * Para cada cliente:
 * 1. Extrair endereço completo
 * 2. Se latitude/longitude não vieram da CNPJA:
 *    - Geocodificar via Google Maps API / OpenStreetMap
 *    - Salvar coordenadas na tabela clientes
 */
```

### **4.2 Busca de Empresas Próximas**

```typescript
/**
 * Algoritmo de raio de proximidade:
 */
interface BuscaProximidade {
  cliente_referencia: string;       // CNPJ do cliente base
  latitude_centro: number;
  longitude_centro: number;
  raio_metros: number;              // Ex: 2000 (2km)
  
  // Filtros opcionais
  cnaes_interesse?: string[];       // CNAEs específicos
  portes?: string[];                // ME, EPP, etc.
  excluir_ja_clientes: boolean;
}

// Query SQL (PostGIS):
SELECT 
  cnpj,
  razao_social,
  ST_Distance(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint(:lng_centro, :lat_centro)::geography
  ) as distancia_metros
FROM empresas_receita -- tabela externa ou cache
WHERE ST_DWithin(
  ST_MakePoint(longitude, latitude)::geography,
  ST_MakePoint(:lng_centro, :lat_centro)::geography,
  :raio_metros
)
ORDER BY distancia_metros;
```

### **4.3 Visualização no Mapa**

```typescript
/**
 * Interface de Prospecção:
 * - Mapa Leaflet/Mapbox
 * - Marcadores por status:
 *   🟢 Verde: Clientes atuais
 *   🔵 Azul: Leads em negociação
 *   🟡 Amarelo: Não contatados (próximos)
 *   🔴 Vermelho: Rejeitados
 * 
 * - Clusters de atividades
 * - Heatmap de densidade empresarial
 * - Filtros por CNAE, porte, regime
 */
```

---

## 🎁 FASE 5: Programa de Indicações

### **5.1 Mecânica de Gamificação**

```typescript
interface ProgramaIndicacoes {
  // Regras
  regras: {
    raio_valido: number;              // Ex: 5km (não vale indicar muito longe)
    prazo_conversao: number;          // Ex: 90 dias
    limite_indicacoes_mes: number;    // Ex: 10 por cliente
  };
  
  // Recompensas
  recompensas: {
    desconto_mensalidade: {
      percentual: number;             // Ex: 10%
      meses_validade: number;         // Ex: 3 meses
    };
    bonus_credito: {
      valor_por_conversao: number;    // Ex: R$ 100
      uso: string;                    // "servicos_adicionais"
    };
    cashback: {
      percentual_honorarios: number;  // Ex: 5% dos honorários do indicado
      prazo_meses: number;            // Ex: 12 meses
    };
  };
  
  // Gamificação
  niveis: {
    bronze: { indicacoes_minimas: 1, bonus_adicional: 0 };
    prata: { indicacoes_minimas: 5, bonus_adicional: 10 };
    ouro: { indicacoes_minimas: 10, bonus_adicional: 25 };
    platina: { indicacoes_minimas: 20, bonus_adicional: 50 };
  };
}
```

### **5.2 Interface do Cliente**

```
┌─────────────────────────────────────────────────────────┐
│ 🎯 Programa de Indicações                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Seu Nível: 🥇 OURO (12 indicações convertidas)         │
│ Benefício Atual: +25% bônus em todas indicações        │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📍 Empresas Próximas a Você (2km)                   │ │
│ │                                                     │ │
│ │ 1. PADARIA BOM DIA LTDA                             │ │
│ │    📍 300m • Panificação • ME                       │ │
│ │    [Indicar Agora] → Ganhe R$ 100 + 10% desconto   │ │
│ │                                                     │ │
│ │ 2. RESTAURANTE SABOR CASEIRO                        │ │
│ │    📍 450m • Restaurante • EPP                      │ │
│ │    [Indicar Agora]                                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Suas Indicações:                                        │
│ ├─ ✅ Farmácia Santa Rita (Convertido) → R$ 100        │
│ ├─ 🕐 Loja de Roupas Moda & Estilo (Em negociação)     │
│ └─ ❌ Mercado do Bairro (Rejeitado)                     │
│                                                         │
│ Total Ganho: R$ 1.250  |  Próximo Nível: Platina (8)   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 FASE 6: Compliance e LGPD

### **6.1 Tratamento de Dados Sensíveis**

```typescript
/**
 * ⚠️ CPF Parcial (Lei nº 13.709/2018 - LGPD)
 */
interface ComplianceLGPD {
  // Armazenamento
  cpf_formato: '***123.456.789**';  // NUNCA armazenar CPF completo
  
  // Anonimização
  hash_cpf: string;                 // SHA-256 para matching interno
  
  // Consentimento
  termo_aceite: {
    cliente_autorizou_prospeccao: boolean;
    data_aceite: string;
    ip_aceite: string;
  };
  
  // Direitos do Titular
  anonimizacao_solicitada: boolean;
  data_anonimizacao?: string;
  
  // Logs de Acesso
  quem_acessou: string;
  quando_acessou: string;
  motivo_acesso: string;
}
```

### **6.2 Termo de Consentimento**

```markdown
## Termo de Adesão ao Programa de Indicações

Ao aderir ao Programa de Indicações, você autoriza:

✅ Uso do endereço da sua empresa para identificar empresas próximas
✅ Compartilhamento do seu nome como "indicador" com leads prospectados
✅ Análise de vínculos societários públicos para fins de prospecção
✅ Armazenamento de dados de sócios conforme dados públicos da Receita Federal

❌ NÃO utilizamos CPF completo (apenas parcial conforme Receita)
❌ NÃO vendemos seus dados para terceiros
❌ NÃO fazemos contato sem sua indicação prévia

Você pode cancelar a qualquer momento pelo painel do cliente.
```

---

## 📈 FASE 7: Analytics e Relatórios

### **7.1 Dashboard de Prospecção**

```typescript
interface DashboardProspeccao {
  metricas: {
    total_clientes_ativos: number;
    total_leads_prospectados: number;
    taxa_conversao: number;              // %
    ticket_medio_novos_clientes: number;
    roi_programa_indicacoes: number;     // R$
  };
  
  analises: {
    clusters_atividade: {
      cnae: string;
      descricao: string;
      quantidade: number;
      taxa_conversao: number;
    }[];
    
    regioes_quentes: {
      bairro: string;
      cidade: string;
      densidade_empresarial: number;
      clientes_atuais: number;
      potencial_leads: number;
    }[];
    
    vinculos_societarios: {
      total_socios_mapeados: number;
      total_empresas_vinculadas: number;
      grau_medio_separacao: number;
    };
  };
}
```

### **7.2 Relatórios Executivos**

1. **Relatório de Rede de Relacionamentos**
   - Visualização em grafo
   - Identificação de "hubs" (sócios com muitas empresas)
   - Oportunidades de cross-selling

2. **Relatório de Mercado Territorial**
   - Mapa de calor por bairro/cidade
   - Análise de concorrência
   - Potencial de crescimento por região

3. **Relatório de Performance do Programa**
   - Ranking de clientes indicadores
   - ROI por cliente
   - Análise de churn vs. indicações

---

## 🛠️ Stack Tecnológico

```typescript
// Backend
- Supabase Edge Functions (Deno)
- PostgreSQL + PostGIS (geolocalização)
- Supabase Storage (arquivos JSON)

// Frontend
- React + TypeScript
- Mapbox/Leaflet (mapas)
- Recharts (gráficos)
- React Flow (árvores genealógicas)
- Framer Motion (animações)

// APIs Externas
- CNPJA API (dados empresariais)
- Google Maps API (geocodificação)
- ViaCEP (complemento endereços)

// Processamento
- Bull/BullMQ (filas de ingestão)
- Redis (cache de consultas)
- Cron Jobs (atualização periódica)
```

---

## 📅 Cronograma Estimado

```
FASE 1: Ingestão CNPJA Completa        → 2 semanas
FASE 2: Vínculos Societários           → 2 semanas
FASE 3: Genealogia de Sócios           → 1 semana
FASE 4: Geolocalização e Prospecção    → 2 semanas
FASE 5: Programa de Indicações         → 1 semana
FASE 6: Compliance e LGPD              → 1 semana
FASE 7: Analytics e Relatórios         → 1 semana
─────────────────────────────────────────────────
TOTAL ESTIMADO:                         10 semanas
```

---

## 💰 Modelo de Negócio

### **Planos de Assinatura**

```
┌─────────────┬──────────┬──────────┬───────────┐
│ Recurso     │ Básico   │ Pro      │ Enterprise│
├─────────────┼──────────┼──────────┼───────────┤
│ Clientes    │ Até 50   │ Até 200  │ Ilimitado │
│ Prospecção  │ 5km raio │ 20km     │ Nacional  │
│ Vínculos    │ 1º grau  │ 2º grau  │ 3º grau   │
│ Genealogia  │ ❌       │ ✅       │ ✅        │
│ Indicações  │ ❌       │ ✅       │ ✅        │
│ API Access  │ ❌       │ ❌       │ ✅        │
│ Preço/mês   │ R$ 297   │ R$ 697   │ R$ 1.497  │
└─────────────┴──────────┴──────────┴───────────┘
```

---

## ✅ Checklist de Implementação

### **Pré-requisitos**
- [ ] Concluir Fase 3 atual (Dashboard queries reais)
- [ ] Concluir Fase 4 atual (Migração global AuthContext)
- [ ] Obter API Key CNPJA premium (necessária para QSA completo)
- [ ] Configurar PostGIS no Supabase
- [ ] Configurar Supabase Storage com políticas de acesso

### **Desenvolvimento**
- [ ] Criar tabelas (socios, vinculos_societarios, genealogia_socios, empresas_proximas, programa_indicacoes, documentos_cnpja)
- [ ] Implementar script de ingestão CNPJA completo
- [ ] Implementar análise de vínculos (1º, 2º, 3º grau)
- [ ] Implementar algoritmo de genealogia
- [ ] Implementar geocodificação de endereços
- [ ] Implementar busca por proximidade (PostGIS)
- [ ] Criar interface de mapa de prospecção
- [ ] Criar interface de programa de indicações
- [ ] Criar dashboard de analytics
- [ ] Implementar compliance LGPD

### **Testes**
- [ ] Testar ingestão com 10 clientes
- [ ] Validar precisão de vínculos societários
- [ ] Validar algoritmo de genealogia
- [ ] Testar busca geolocalizada
- [ ] Testar fluxo completo de indicação
- [ ] Validar cálculo de recompensas

### **Deploy**
- [ ] Configurar cron jobs de atualização
- [ ] Configurar monitoramento de filas
- [ ] Documentar API para integrações
- [ ] Criar guias de uso para clientes
- [ ] Lançar versão beta

---

## 🎓 Diferenciais Competitivos

1. **Rede de Relacionamentos**: Nenhum concorrente mapeia vínculos até 3º grau
2. **Gamificação**: Programa de indicações único no mercado contábil
3. **Geolocalização Avançada**: Prospecção territorial inteligente
4. **Genealogia de Sócios**: Identificação de famílias empresariais
5. **LGPD Compliant**: 100% em conformidade com legislação

---

## 📞 Casos de Uso Reais

### **Caso 1: Cluster de Restaurantes**
```
Cliente: Restaurante A (Bairro X)
├─ Prospecção: 12 restaurantes num raio de 2km
├─ Sócio do Cliente A também tem Distribuidora de Alimentos
└─ Oportunidade: Oferecer pacote "Gastronomia Completa"
```

### **Caso 2: Rede Familiar**
```
Cliente: Loja de Roupas B
├─ Análise genealógica: Sócios com sobrenome "Santos"
├─ Descobertos: 3 outras empresas de familiares
│   ├─ Loja de Calçados
│   ├─ Boutique de Acessórios
│   └─ E-commerce de Moda
└─ Oportunidade: Oferecer gestão integrada para grupo familiar
```

### **Caso 3: Programa de Indicações Bem-Sucedido**
```
Cliente: Padaria C (bairro residencial)
├─ Indicou: 5 comércios vizinhos em 3 meses
├─ Conversões: 3 viraram clientes
├─ Recompensa: R$ 300 + 30% desconto (3 meses)
└─ Resultado: Cliente satisfeito, marketing boca-a-boca orgânico
```

---

## 🚨 Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Rate limit CNPJA API | Alto | Cache agressivo, retry exponencial |
| Dados desatualizados | Médio | Atualização mensal automática |
| Falso positivo genealogia | Médio | Score de confiabilidade + validação manual |
| Violação LGPD | Alto | Auditoria externa, termo de consentimento |
| Crescimento exponencial vínculos | Alto | Limitar a 3º grau + filtros regionais |

---

## 📚 Referências

- [API CNPJA - Documentação](https://cnpja.com/docs/api)
- [PostGIS - Queries Geoespaciais](https://postgis.net/docs/reference.html)
- [LGPD - Lei nº 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Gamificação em CRM - HubSpot](https://blog.hubspot.com/service/gamification-crm)

---

**🎯 Status**: Documentado - Aguardando conclusão Fases 3 e 4 atuais

**📅 Previsão de Início**: Após sprint atual (Dashboard + Migração Global)

**👥 Stakeholders**: Escritório Contábil (prospect/CRM), Clientes (programa indicações)

**💡 ROI Esperado**: 300-500% em 12 meses (baseado em benchmark do setor)
