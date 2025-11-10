# 🌳 Genealogia Empresarial - Sistema de Prospecção Inteligente

## 📋 Visão Geral

Este sistema constrói uma **árvore genealógica empresarial completa** até 4º grau de relacionamento, permitindo prospecção estratégica baseada em conexões existentes.

### 🎯 Estratégia

**É muito mais fácil fazer prospecção com quem conhecemos!**

O sistema identifica:
1. ✅ Sócios das suas empresas atuais
2. ✅ Todas as empresas desses sócios
3. ✅ Sócios das novas empresas descobertas
4. ✅ **Parentes** dos sócios (sobrenome, CPF)
5. ✅ Empresas dos parentes (até 4º grau)
6. ✅ Rede completa de relacionamentos

---

## 🚀 Como Usar

### 1. Configurar Chave CNPJá

```bash
# Execute o assistente interativo
node scripts/setup-cnpja.js

# OU adicione manualmente no .env.local:
CNPJA_API_KEY=sua-chave-aqui
VITE_CNPJA_API_KEY=sua-chave-aqui
```

**Obter chave:**
- Acesse: https://www.cnpja.com/api
- Crie conta ou faça login
- Copie sua API Key

### 2. Executar Construção da Árvore

```bash
# Execução completa (todas as 196 empresas)
node scripts/build-business-genealogy.js

# OU execute por fases
node scripts/build-business-genealogy.js --fase=1  # Só sócios
node scripts/build-business-genealogy.js --fase=2  # + empresas dos sócios
node scripts/build-business-genealogy.js --fase=3  # + parentes até 4º grau
```

---

## 📊 O Que o Sistema Faz

### Fase 1: Sócios das 196 Empresas (Base)
```
Entrada: 196 empresas no Supabase
↓
Busca CNPJá API: Sócios de cada empresa
↓
Salva: tabela `socios` + `empresa_socios`
↓
Resultado: ~500-1000 sócios mapeados
```

### Fase 2: Empresas dos Sócios (1º Grau)
```
Entrada: Sócios da Fase 1
↓
Para cada sócio: Buscar TODAS empresas que ele participa
↓
Salva: novas empresas + relacionamentos
↓
Resultado: ~1000-3000 empresas expandidas
```

### Fase 3: Sócios das Novas Empresas (2º Grau)
```
Entrada: Empresas descobertas na Fase 2
↓
Busca: Sócios dessas empresas
↓
Salva: novos sócios + relacionamentos
↓
Resultado: ~2000-5000 sócios no total
```

### Fase 4: Identificação de Parentes (3º e 4º Grau)
```
Entrada: Todos os sócios descobertos
↓
Algoritmo de identificação:
  - Sobrenome igual (confidence 70%)
  - CPF parcial similar (confidence 50%)
↓
Para cada parente: Buscar empresas
↓
Resultado: Rede completa até 4º grau
```

---

## 🧮 Algoritmo de Identificação de Parentes

### Método 1: Sobrenome
```javascript
João Silva Santos + Maria Silva Oliveira
         ^^^^^              ^^^^^
       MATCH → Possível parentesco (70% confidence)
```

### Método 2: CPF Parcial
```javascript
***456789**  +  ***456123**
   ^^^^^^          ^^^^^^
  Primeiros 6 dígitos iguais → Possível família (50% confidence)
```

---

## 📈 Estrutura de Dados

### Tabelas Populadas

#### `socios`
```sql
cpf_parcial    | nome_socio
---------------|------------------
***123456**    | João Silva Santos
***789012**    | Maria Oliveira
```

#### `empresa_socios`
```sql
empresa_cnpj      | socio_cpf_parcial | qualificacao
------------------|-------------------|------------------
12345678000100    | ***123456**       | Sócio-Administrador
12345678000100    | ***789012**       | Sócio
```

#### Árvore Genealógica (Em Memória)
```javascript
{
  nodes: Map {
    '***123456**' => {
      socio: { cpf_parcial, nome_socio },
      empresas: Set([cnpj1, cnpj2, cnpj3]),
      grau: 0,  // grau 0 = sócios diretos
      parentes: Set(['***789012**'])
    }
  },
  edges: Set([
    '***123456**|***789012**|sobrenome'
  ])
}
```

---

## ⚙️ Rate Limiting & Cache

### Rate Limiting
```
CNPJá API: 5 requisições/minuto
Tempo entre requests: 12 segundos

Estimativa para 196 empresas:
196 empresas × 12s = 39 minutos (Fase 1)
```

### Cache Inteligente
1. **Cache em Memória**: Session única (Map)
2. **Cache Supabase**: 30 dias (empresas já buscadas)
3. **Evita requests duplicadas**: Apenas dados novos

---

## 📊 Visualização dos Resultados

### No Terminal
```bash
🌳 CONSTRUTOR DE GENEALOGIA EMPRESARIAL
═══════════════════════════════════════

📍 FASE 1: Buscando sócios das empresas existentes
[1/196] Empresa XYZ Ltda
   ✅ Sócio: João Silva Santos (***123456**)
   ✅ Sócio: Maria Oliveira (***789012**)

📊 RESUMO DA ÁRVORE GENEALÓGICA:
   Total de sócios: 847
   Total de relacionamentos: 234
   Grau 0: 500 sócios
   Grau 1: 200 sócios
   Grau 2: 100 sócios
   Grau 3: 47 sócios
   Total de empresas na rede: 2,345
```

### No Supabase (Tabelas)
- `empresas`: 2,345 empresas mapeadas
- `socios`: 847 sócios únicos
- `empresa_socios`: 5,000+ relacionamentos

---

## 🎨 Próximos Passos

### 1. API de Network
```typescript
// api/network.ts
GET /api/network?cnpj=12345678000100&grau=4

Response:
{
  empresa: { cnpj, razao_social },
  socios: [{ cpf_parcial, nome, empresas[] }],
  relacionamentos: [
    { de: cpf1, para: cpf2, tipo: 'parente', metodo: 'sobrenome' }
  ],
  graus: {
    0: 5 empresas,
    1: 15 empresas,
    2: 30 empresas,
    3: 12 empresas,
    4: 8 empresas
  }
}
```

### 2. Visualização com D3.js
```javascript
// components/NetworkGraph.tsx
import * as d3 from 'd3';

// Grafo interativo:
// - Nós = Empresas/Sócios
// - Edges = Relacionamentos
// - Cores = Grau de separação
// - Hover = Detalhes
```

### 3. Score de Prospecção
```javascript
// Quanto mais próximo, maior o score
Grau 0 (direto):     Score 100
Grau 1 (1º grau):    Score 80
Grau 2 (2º grau):    Score 60
Grau 3 (3º grau):    Score 40
Grau 4 (4º grau):    Score 20
```

---

## 🔒 Segurança & Compliance

### LGPD
- ✅ CPF parcial (últimos 2 dígitos ocultos)
- ✅ Dados públicos (Receita Federal via CNPJá)
- ✅ Cache com expiração (30 dias)
- ✅ Logs de auditoria

### Rate Limiting
- ✅ Respeita limites da API CNPJá
- ✅ Backoff exponencial em caso de erro
- ✅ Cache previne requests duplicadas

---

## 🧪 Testes

```bash
# Teste com 10 empresas apenas
node scripts/build-business-genealogy.js --limit=10

# Teste apenas Fase 1
node scripts/build-business-genealogy.js --fase=1

# Dry run (não salva no Supabase)
node scripts/build-business-genealogy.js --dry-run
```

---

## 📝 Auditoria

Todo processo é registrado em `logs/audit-log.ndjson`:

```json
{
  "timestamp": "2025-01-09T10:30:00.000Z",
  "actor": "admin@contta.com.br",
  "scope": "genealogia-empresarial",
  "action": "build-network",
  "description": "Construção completa da árvore genealógica até 4º grau",
  "metadata": {
    "empresas_iniciais": 196,
    "socios_encontrados": 847,
    "empresas_expandidas": 2345,
    "relacionamentos_parentes": 234,
    "grau_maximo": 4,
    "tempo_execucao_min": 125
  }
}
```

---

## 🤝 Contribuindo

Este sistema é a base para prospecção inteligente. Melhorias futuras:

1. **Machine Learning**: Prever likelihood de conversão baseado em relacionamentos
2. **Email Finder**: Buscar emails dos sócios automaticamente
3. **LinkedIn Integration**: Conectar com perfis sociais
4. **WhatsApp Business**: Envio automático de mensagens
5. **CRM Scoring**: Priorizar leads por proximidade na rede

---

## 📞 Suporte

- Documentação completa: `PLANO_PRODUCAO.md` - Seção 5
- Issues: GitHub Issues
- Email: contato@amplabusiness.com.br
