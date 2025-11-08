# 🚀 ROADMAP COMPLETO DE IMPLANTAÇÃO - Contta CRM
## Guia Passo a Passo Integrado para Contadores

> **Integrado com:** BACKEND_DOCUMENTATION.md + Roadmap Original
> **Arquitetura:** Frontend React → API Routes (Vercel) → Supabase (PostgreSQL)

---

## 📐 ARQUITETURA DO SISTEMA

```
┌─────────────────┐
│  Usuário        │
│  (Navegador)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend React │
│  (Vercel)       │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  API Routes     │  │  Supabase Auth  │
│  (Vercel)       │  │  (Login/Logout) │
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │
│  PostgreSQL     │
│  (Banco Dados)  │
└─────────────────┘
```

**Tecnologias:**
- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Vercel Serverless Functions (Node.js)
- **Banco:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth
- **APIs CNPJ:** BrasilAPI / ReceitaWS / CNPJA

---

## 📋 FASE 1: PREPARAÇÃO E CONFIGURAÇÃO INICIAL

### ✅ Tarefa 1.1: Criar Conta no Supabase
**Tempo estimado:** 5 minutos | **Dificuldade:** ⭐ Fácil

1. Acesse: https://supabase.com
2. Clique em "Sign Up" (criar conta)
3. Use seu email ou conta GitHub
4. Clique em "New Project"
5. Preencha:
   - **Nome do projeto:** contta-crm
   - **Senha do banco:** (anote esta senha em local seguro!)
   - **Região:** South America (São Paulo) - melhor performance no Brasil
6. Aguarde a criação (2-3 minutos)

**✅ Checklist:**
- [ ] Conta criada no Supabase
- [ ] Projeto criado
- [ ] URL do projeto anotada
- [ ] Senha do banco anotada

---

### ✅ Tarefa 1.2: Obter Credenciais do Supabase
**Tempo estimado:** 2 minutos | **Dificuldade:** ⭐ Fácil

1. No painel do Supabase, vá em **Settings** (⚙️) > **API**
2. Copie as seguintes informações:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (chave longa começando com `eyJ...`) - para frontend
   - **service_role** key (role para baixo, chave secreta) - para API Routes

3. Abra o arquivo `.env.local` no projeto
4. Cole as credenciais:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**⚠️ IMPORTANTE:**
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são usadas no frontend (públicas)
- `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` são usadas nas API Routes (secretas)
- **NUNCA** exponha a `service_role` key no frontend!

**✅ Checklist:**
- [ ] Credenciais copiadas
- [ ] `.env.local` preenchido corretamente
- [ ] Verificado que service_role não está no frontend

---

### ✅ Tarefa 1.3: Criar Banco de Dados (AUTOMATIZADO)
**Tempo estimado:** 2 minutos | **Dificuldade:** ⭐ Fácil

**OPÇÃO A - Script Automatizado (Recomendado):**
1. Execute no terminal:
   ```bash
   npm run setup-db
   ```
2. O script mostrará o SQL completo na tela
3. Copie TODO o conteúdo mostrado
4. No Supabase, vá em **SQL Editor**
5. Cole o SQL e clique em **Run**
6. Aguarde a execução (pode levar alguns segundos)

**OPÇÃO B - Manual:**
1. No Supabase, vá em **SQL Editor**
2. Abra o arquivo `supabase-schema.sql` do projeto
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **Run** (ou Ctrl+Enter)
6. Aguarde a execução

**Verificação:**
1. Vá em **Table Editor** no Supabase
2. Verifique se as seguintes tabelas foram criadas:
   - ✅ profiles
   - ✅ empresas
   - ✅ socios
   - ✅ empresa_socios
   - ✅ deals
   - ✅ tasks
   - ✅ indicacoes

**✅ Checklist:**
- [ ] Script executado ou SQL copiado
- [ ] SQL executado no Supabase sem erros
- [ ] Todas as tabelas criadas (verificado em Table Editor)
- [ ] Row Level Security (RLS) ativado (já incluído no script)

---

### ✅ Tarefa 1.4: Verificar Segurança (RLS)
**Tempo estimado:** 1 minuto | **Dificuldade:** ⭐ Fácil

O script SQL já configura as políticas de segurança (RLS), mas vamos verificar:

1. No Supabase, vá em **Authentication** > **Policies**
2. Verifique se as políticas foram criadas para:
   - ✅ profiles
   - ✅ empresas
   - ✅ deals
   - ✅ tasks

**O que o RLS faz:**
- Garante que usuários só vejam seus próprios dados
- Admins podem ver tudo
- Protege contra acesso não autorizado

**✅ Checklist:**
- [ ] Políticas RLS verificadas
- [ ] Todas as tabelas protegidas

---

## 📋 FASE 2: CONFIGURAR API DE CNPJ

### ✅ Tarefa 2.1: Escolher e Configurar API de CNPJ
**Tempo estimado:** 10 minutos | **Dificuldade:** ⭐⭐ Médio

O sistema suporta múltiplas APIs e tentará automaticamente na ordem:

#### Opção A - BrasilAPI (Recomendado - Gratuito)
1. Acesse: https://brasilapi.com.br/
2. **Não precisa de chave** - funciona direto!
3. Limite: ~1000 requisições/dia
4. Não precisa adicionar nada no `.env.local`

#### Opção B - ReceitaWS (Gratuito, limitado)
1. Acesse: https://www.receitaws.com.br/
2. **Não precisa de chave**
3. Limite: 3 consultas/minuto
4. Não precisa adicionar no `.env.local`

#### Opção C - CNPJA (Pago, ilimitado)
1. Acesse: https://www.cnpja.com/api
2. Crie uma conta
3. Obtenha sua chave de API
4. Adicione no `.env.local`:
   ```env
   CNPJA_API_KEY=sua-chave-aqui
   ```

**✅ Checklist:**
- [ ] API escolhida
- [ ] Chave obtida (se necessário)
- [ ] Adicionada no `.env.local` (se necessário)

---

### ✅ Tarefa 2.2: Testar Busca de CNPJ
**Tempo estimado:** 2 minutos | **Dificuldade:** ⭐ Fácil

1. Execute:
   ```bash
   npm run test-cnpj 27865757000102
   ```
   (Este é o CNPJ da Google Brasil - usado como teste)

2. Verifique se retorna dados da empresa:
   - Razão Social
   - Nome Fantasia
   - Situação Cadastral

**Se funcionar:** ✅ API configurada corretamente!
**Se não funcionar:** Verifique sua conexão com internet

**✅ Checklist:**
- [ ] Teste executado
- [ ] Dados retornados corretamente
- [ ] Sem erros no terminal

---

## 📋 FASE 3: CARGA INICIAL DE DADOS

### ✅ Tarefa 3.1: Preparar Lista de CNPJs
**Tempo estimado:** Variável | **Dificuldade:** ⭐ Fácil

1. Crie um arquivo `cnpjs.txt` na raiz do projeto
2. Coloque um CNPJ por linha (com ou sem formatação):
   ```
   27865757000102
   12345678000190
   98765432000111
   ```
3. O script aceita CNPJs com ou sem formatação (pontos, barras, traços)

**Dicas:**
- Você pode copiar de uma planilha Excel
- Salve como TXT (um CNPJ por linha)
- Pode ter comentários começando com `#`

**✅ Checklist:**
- [ ] Arquivo `cnpjs.txt` criado
- [ ] CNPJs listados (um por linha)
- [ ] Arquivo salvo na raiz do projeto

---

### ✅ Tarefa 3.2: Executar Carga de Dados (AUTOMATIZADO)
**Tempo estimado:** 5-10 minutos (depende da quantidade) | **Dificuldade:** ⭐ Fácil

1. Execute:
   ```bash
   npm run load-cnpjs
   ```

2. O script irá:
   - ✅ Ler o arquivo `cnpjs.txt`
   - ✅ Buscar cada CNPJ na API (tentando múltiplas APIs)
   - ✅ Salvar empresa no banco de dados
   - ✅ Salvar sócios relacionados
   - ✅ Mostrar progresso em tempo real
   - ✅ Mostrar resumo final (sucessos/erros)

3. Aguarde a conclusão (há um delay de 1 segundo entre cada CNPJ para evitar rate limit)

**Verificação:**
1. No Supabase, vá em **Table Editor** > **empresas**
2. Verifique se os dados foram salvos
3. Verifique também **socios** e **empresa_socios**

**✅ Checklist:**
- [ ] Script executado
- [ ] Dados carregados no banco
- [ ] Verificado no Supabase (Table Editor)
- [ ] Empresas e sócios salvos corretamente

---

## 📋 FASE 4: CONFIGURAR VERCEL (BACKEND)

### ✅ Tarefa 4.1: Instalar Vercel CLI
**Tempo estimado:** 2 minutos | **Dificuldade:** ⭐ Fácil

1. Execute:
   ```bash
   npm i -g vercel
   ```

2. Faça login:
   ```bash
   vercel login
   ```
   - Siga as instruções na tela
   - Abra o navegador quando solicitado
   - Autorize o acesso

**✅ Checklist:**
- [ ] Vercel CLI instalado
- [ ] Login realizado

---

### ✅ Tarefa 4.2: Configurar Variáveis de Ambiente na Vercel
**Tempo estimado:** 3 minutos | **Dificuldade:** ⭐ Fácil

As variáveis de ambiente são necessárias para as API Routes funcionarem:

1. Execute:
   ```bash
   vercel env add SUPABASE_URL
   ```
   - Cole a URL do Supabase quando solicitado

2. Execute:
   ```bash
   vercel env add SUPABASE_SERVICE_KEY
   ```
   - Cole a service_role key quando solicitado

3. Execute (opcional):
   ```bash
   vercel env add GEMINI_API_KEY
   ```
   - Cole a chave do Gemini (ou pressione Enter para pular)

4. Execute (opcional, se tiver):
   ```bash
   vercel env add CNPJA_API_KEY
   ```
   - Cole a chave do CNPJA (ou pressione Enter para pular)

**✅ Checklist:**
- [ ] SUPABASE_URL configurada
- [ ] SUPABASE_SERVICE_KEY configurada
- [ ] Variáveis opcionais configuradas (se necessário)

---

## 📋 FASE 5: EXECUTAR APLICAÇÃO LOCALMENTE

### ✅ Tarefa 5.1: Instalar Dependências
**Tempo estimado:** 2 minutos | **Dificuldade:** ⭐ Fácil

1. Abra o terminal na pasta do projeto
2. Execute:
   ```bash
   npm install
   ```
3. Aguarde a instalação completa

**✅ Checklist:**
- [ ] Dependências instaladas
- [ ] Sem erros no terminal

---

### ✅ Tarefa 5.2: Executar Aplicação Local
**Tempo estimado:** 1 minuto | **Dificuldade:** ⭐ Fácil

**OPÇÃO A - Apenas Frontend (Mais Simples, dados mockados):**
```bash
npm run dev
```
- ✅ Funciona mesmo sem backend configurado
- ✅ Usa dados mockados
- ⚠️ APIs não funcionarão completamente

**OPÇÃO B - Frontend + Backend (Recomendado):**
```bash
vercel dev
```
- ✅ Frontend + APIs serverless funcionando
- ✅ Conexão real com banco de dados
- ✅ Todas as funcionalidades disponíveis

3. Abra o navegador em: **http://localhost:3000**

**✅ Checklist:**
- [ ] Aplicação rodando
- [ ] Acessível no navegador
- [ ] Sem erros no console do navegador (F12)

---

## 📋 FASE 6: VALIDAÇÃO E TESTES

### ✅ Tarefa 6.1: Verificar Dados no Banco
**Tempo estimado:** 2 minutos | **Dificuldade:** ⭐ Fácil

1. No Supabase, vá em **Table Editor**
2. Verifique cada tabela:
   - **empresas:** Deve ter empresas carregadas
   - **socios:** Deve ter sócios relacionados
   - **empresa_socios:** Deve ter relações empresa-sócio
   - **deals:** Pode estar vazio (você criará depois)
   - **tasks:** Pode estar vazio (você criará depois)
   - **profiles:** Pode estar vazio (usuários serão criados via autenticação)

**✅ Checklist:**
- [ ] Dados visíveis nas tabelas
- [ ] Estrutura correta
- [ ] Relações funcionando (empresa-sócio)

---

### ✅ Tarefa 6.2: Testar Funcionalidades da Aplicação
**Tempo estimado:** 10 minutos | **Dificuldade:** ⭐ Fácil

Teste cada funcionalidade:

1. **Dashboard:**
   - Deve mostrar estatísticas
   - Gráficos devem aparecer
   - ✅ Funcionando

2. **Prospecção:**
   - Buscar empresa por CNPJ
   - Ver detalhes da empresa
   - ✅ Funcionando

3. **Negócios:**
   - Criar um negócio de teste
   - Mover entre estágios (Kanban)
   - ✅ Funcionando

4. **Tarefas:**
   - Criar uma tarefa de teste
   - Atualizar status
   - ✅ Funcionando

5. **Equipe:**
   - Ver membros da equipe
   - ✅ Funcionando

**✅ Checklist:**
- [ ] Dashboard funcionando
- [ ] Busca de CNPJ funcionando
- [ ] Criação de negócios funcionando
- [ ] Criação de tarefas funcionando
- [ ] Todas as funcionalidades testadas

---

## 📋 FASE 7: DEPLOY EM PRODUÇÃO (OPCIONAL)

### ✅ Tarefa 7.1: Fazer Deploy na Vercel
**Tempo estimado:** 5 minutos | **Dificuldade:** ⭐⭐ Médio

1. No terminal, execute:
   ```bash
   vercel
   ```

2. Siga as instruções:
   - Escolha o projeto (ou crie novo)
   - Confirme as configurações
   - Aguarde o deploy

3. A Vercel fornecerá uma URL (ex: `https://contta-crm.vercel.app`)

**✅ Checklist:**
- [ ] Deploy realizado
- [ ] URL de produção obtida
- [ ] Aplicação acessível na URL

---

### ✅ Tarefa 7.2: Configurar Domínio Personalizado (Opcional)
**Tempo estimado:** 10 minutos | **Dificuldade:** ⭐⭐⭐ Avançado

1. Na Vercel, vá em **Settings** > **Domains**
2. Adicione seu domínio
3. Configure os DNS conforme instruções
4. Aguarde a propagação (pode levar até 24h)

**✅ Checklist:**
- [ ] Domínio configurado
- [ ] DNS configurado
- [ ] SSL ativado automaticamente

---

## 📊 RESUMO DO ROADMAP INTEGRADO

```
FASE 1: Preparação          [████████████] 100% - 15 min
  ├─ Criar Supabase
  ├─ Obter Credenciais
  ├─ Criar Banco de Dados
  └─ Verificar Segurança (RLS)

FASE 2: API CNPJ            [████████████] 100% - 15 min
  ├─ Escolher API
  └─ Testar Busca

FASE 3: Carga de Dados      [████████████] 100% - 15 min
  ├─ Preparar Lista CNPJs
  └─ Executar Carga

FASE 4: Configurar Vercel   [████████████] 100% - 5 min
  ├─ Instalar CLI
  └─ Configurar Variáveis

FASE 5: Executar Local      [████████████] 100% - 5 min
  ├─ Instalar Dependências
  └─ Executar Aplicação

FASE 6: Validação           [████████████] 100% - 15 min
  ├─ Verificar Banco
  └─ Testar Funcionalidades

FASE 7: Deploy (Opcional)   [████████████] 100% - 15 min
  ├─ Deploy Vercel
  └─ Configurar Domínio

─────────────────────────────────────────────────────
TOTAL ESTIMADO:             85 minutos (1h25min)
```

---

## 🔒 SEGURANÇA E BOAS PRÁTICAS

### Row Level Security (RLS)
- ✅ Já configurado no script SQL
- ✅ Usuários só veem seus próprios dados
- ✅ Admins têm acesso completo
- ✅ Protege contra acesso não autorizado

### Variáveis de Ambiente
- ✅ `.env.local` não é commitado (protegido no `.gitignore`)
- ✅ Service role key nunca exposta no frontend
- ✅ Chaves secretas apenas nas API Routes

### Autenticação
- ✅ Supabase Auth configurado
- ✅ Suporta múltiplos métodos (email, OAuth)
- ✅ Sessões gerenciadas automaticamente

---

## 🆘 TROUBLESHOOTING COMPLETO

### Erro: "Variáveis não encontradas"
**Solução:**
1. Verifique o arquivo `.env.local`
2. Certifique-se de que está na raiz do projeto
3. Reinicie o servidor após alterar

### Erro: "Failed to fetch" nas APIs
**Solução:**
1. Use `vercel dev` em vez de `npm run dev`
2. Verifique se as variáveis estão configuradas na Vercel
3. Verifique o console do navegador (F12) para mais detalhes

### Erro: "CNPJ não encontrado"
**Solução:**
1. Verifique se o CNPJ está correto
2. Teste com um CNPJ conhecido primeiro: `27865757000102`
3. Verifique sua conexão com internet

### Erro: "Relation does not exist"
**Solução:**
1. O script SQL não foi executado completamente
2. Execute novamente o `supabase-schema.sql`
3. Verifique se todas as tabelas foram criadas

### Erro ao executar SQL no Supabase
**Solução:**
1. Execute os comandos um por vez
2. Verifique se não há erros de sintaxe
3. Certifique-se de que está no projeto correto

---

## 📚 DOCUMENTAÇÃO DE REFERÊNCIA

- **BACKEND_DOCUMENTATION.md** - Documentação técnica completa
- **GUIA_ENV.md** - Como obter credenciais
- **SETUP.md** - Guia de configuração detalhado
- **GUIA_RAPIDO_CONTADOR.md** - Guia rápido simplificado

---

## ✅ CHECKLIST FINAL DE IMPLANTAÇÃO

### Configuração Inicial
- [ ] Supabase configurado
- [ ] Credenciais obtidas e configuradas
- [ ] Banco de dados criado
- [ ] Segurança (RLS) verificada

### APIs e Dados
- [ ] API de CNPJ configurada
- [ ] Teste de CNPJ funcionando
- [ ] Dados carregados no banco

### Backend
- [ ] Vercel CLI instalado
- [ ] Variáveis de ambiente configuradas
- [ ] API Routes funcionando

### Aplicação
- [ ] Dependências instaladas
- [ ] Aplicação rodando localmente
- [ ] Todas as funcionalidades testadas

### Produção (Opcional)
- [ ] Deploy realizado na Vercel
- [ ] URL de produção funcionando
- [ ] Domínio configurado (se aplicável)

---

## 🎯 PRÓXIMOS PASSOS APÓS IMPLANTAÇÃO

1. **Configurar Autenticação:**
   - Criar tela de login
   - Configurar métodos de autenticação no Supabase
   - Implementar proteção de rotas

2. **Adicionar Mais Funcionalidades:**
   - Relatórios automatizados
   - Integração com Google Calendar
   - Notificações por email

3. **Otimizações:**
   - Cache de consultas CNPJ
   - Índices no banco de dados
   - Otimização de performance

---

**🎉 Parabéns! Seu CRM está pronto para uso em produção!**

**Tempo total estimado:** 85 minutos (1h25min)
**Dificuldade média:** ⭐⭐ Médio (com scripts automatizados)

