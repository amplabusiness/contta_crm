# 🗺️ ROADMAP COMPLETO - Contta CRM
## Guia Passo a Passo para Contadores (Não Programadores)

---

## 📋 FASE 1: PREPARAÇÃO E CONFIGURAÇÃO INICIAL

### ✅ Tarefa 1.1: Criar Conta no Supabase
**Tempo estimado:** 5 minutos
**Dificuldade:** ⭐ Fácil

1. Acesse: https://supabase.com
2. Clique em "Sign Up" (criar conta)
3. Use seu email ou conta GitHub
4. Clique em "New Project"
5. Preencha:
   - **Nome do projeto:** contta-crm
   - **Senha do banco:** (anote esta senha!)
   - **Região:** South America (São Paulo)
6. Aguarde a criação (2-3 minutos)

**✅ Checklist:**
- [ ] Conta criada
- [ ] Projeto criado
- [ ] URL do projeto anotada

---

### ✅ Tarefa 1.2: Obter Credenciais do Supabase
**Tempo estimado:** 2 minutos
**Dificuldade:** ⭐ Fácil

1. No painel do Supabase, vá em **Settings** (⚙️) > **API**
2. Copie as seguintes informações:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (chave longa começando com `eyJ...`)
   - **service_role** key (role para baixo, chave secreta)

3. Abra o arquivo `.env.local` no projeto
4. Cole as credenciais:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**✅ Checklist:**
- [ ] Credenciais copiadas
- [ ] `.env.local` preenchido

---

### ✅ Tarefa 1.3: Criar Banco de Dados (AUTOMATIZADO)
**Tempo estimado:** 1 minuto
**Dificuldade:** ⭐ Fácil

**OPÇÃO A - Script Automatizado (Recomendado):**
1. Execute no terminal:
   ```bash
   npm run setup-db
   ```
2. Siga as instruções na tela
3. O script fará tudo automaticamente!

**OPÇÃO B - Manual:**
1. No Supabase, vá em **SQL Editor**
2. Abra o arquivo `supabase-schema.sql`
3. Copie TODO o conteúdo
4. Cole no SQL Editor
5. Clique em **Run** (ou Ctrl+Enter)
6. Aguarde a execução

**✅ Checklist:**
- [ ] Script executado ou SQL copiado
- [ ] Tabelas criadas (verificar em Table Editor)

---

## 📋 FASE 2: CONFIGURAR API DE CNPJ (CNPJA)

### ✅ Tarefa 2.1: Obter Chave da API CNPJA
**Tempo estimado:** 10 minutos
**Dificuldade:** ⭐⭐ Médio

**Opções de APIs de CNPJ:**

#### Opção A - CNPJA (Recomendado)
1. Acesse: https://www.cnpja.com/api
2. Crie uma conta
3. Obtenha sua chave de API
4. Adicione no `.env.local`:
   ```env
   CNPJA_API_KEY=sua-chave-aqui
   ```

#### Opção B - ReceitaWS (Gratuito, limitado)
1. Acesse: https://www.receitaws.com.br/
2. Use sem chave (limitado a 3 consultas/minuto)
3. Não precisa adicionar no `.env.local`

#### Opção C - BrasilAPI (Gratuito)
1. Acesse: https://brasilapi.com.br/
2. Use sem chave (gratuito)
3. Não precisa adicionar no `.env.local`

**✅ Checklist:**
- [ ] API escolhida
- [ ] Chave obtida (se necessário)
- [ ] Adicionada no `.env.local`

---

### ✅ Tarefa 2.2: Testar Busca de CNPJ
**Tempo estimado:** 2 minutos
**Dificuldade:** ⭐ Fácil

1. Execute:
   ```bash
   npm run test-cnpj 12345678000190
   ```
2. Verifique se retorna dados da empresa

**✅ Checklist:**
- [ ] Teste executado
- [ ] Dados retornados corretamente

---

## 📋 FASE 3: CARGA INICIAL DE DADOS

### ✅ Tarefa 3.1: Preparar Lista de CNPJs
**Tempo estimado:** Variável
**Dificuldade:** ⭐ Fácil

1. Crie um arquivo `cnpjs.txt` na raiz do projeto
2. Coloque um CNPJ por linha:
   ```
   12345678000190
   98765432000111
   11122233000144
   ```
3. Ou use um arquivo Excel/CSV e converta para TXT

**✅ Checklist:**
- [ ] Arquivo `cnpjs.txt` criado
- [ ] CNPJs listados (um por linha)

---

### ✅ Tarefa 3.2: Executar Carga de Dados (AUTOMATIZADO)
**Tempo estimado:** 5-10 minutos (depende da quantidade)
**Dificuldade:** ⭐ Fácil

1. Execute:
   ```bash
   npm run load-cnpjs
   ```
2. O script irá:
   - Ler o arquivo `cnpjs.txt`
   - Buscar cada CNPJ na API
   - Salvar no banco de dados
   - Mostrar progresso em tempo real
3. Aguarde a conclusão

**✅ Checklist:**
- [ ] Script executado
- [ ] Dados carregados no banco
- [ ] Verificado no Supabase (Table Editor > empresas)

---

## 📋 FASE 4: EXECUTAR APLICAÇÃO

### ✅ Tarefa 4.1: Instalar Dependências
**Tempo estimado:** 2 minutos
**Dificuldade:** ⭐ Fácil

1. Abra o terminal na pasta do projeto
2. Execute:
   ```bash
   npm install
   ```
3. Aguarde a instalação

**✅ Checklist:**
- [ ] Dependências instaladas
- [ ] Sem erros no terminal

---

### ✅ Tarefa 4.2: Executar Aplicação Local
**Tempo estimado:** 1 minuto
**Dificuldade:** ⭐ Fácil

**OPÇÃO A - Apenas Frontend (Mais Simples):**
```bash
npm run dev
```

**OPÇÃO B - Frontend + Backend (Recomendado):**
```bash
# Primeiro instale o Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Configure variáveis (siga as instruções)
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY

# Execute
vercel dev
```

3. Abra o navegador em: http://localhost:3000

**✅ Checklist:**
- [ ] Aplicação rodando
- [ ] Acessível no navegador
- [ ] Sem erros no console

---

## 📋 FASE 5: VALIDAÇÃO E TESTES

### ✅ Tarefa 5.1: Verificar Dados no Banco
**Tempo estimado:** 2 minutos
**Dificuldade:** ⭐ Fácil

1. No Supabase, vá em **Table Editor**
2. Clique em **empresas**
3. Verifique se há dados
4. Clique em **deals** e **tasks** também

**✅ Checklist:**
- [ ] Dados visíveis nas tabelas
- [ ] Estrutura correta

---

### ✅ Tarefa 5.2: Testar Funcionalidades
**Tempo estimado:** 5 minutos
**Dificuldade:** ⭐ Fácil

1. **Dashboard:** Deve mostrar estatísticas
2. **Prospecção:** Buscar empresas por CNPJ
3. **Negócios:** Criar um negócio de teste
4. **Tarefas:** Criar uma tarefa de teste

**✅ Checklist:**
- [ ] Dashboard funcionando
- [ ] Busca de CNPJ funcionando
- [ ] Criação de negócios funcionando
- [ ] Criação de tarefas funcionando

---

## 📊 RESUMO DO ROADMAP

```
FASE 1: Preparação          [████████████] 100% - 10 min
FASE 2: API CNPJ            [████████████] 100% - 15 min
FASE 3: Carga de Dados      [████████████] 100% - 15 min
FASE 4: Executar App        [████████████] 100% - 5 min
FASE 5: Validação           [████████████] 100% - 10 min
─────────────────────────────────────────────────────
TOTAL ESTIMADO:             55 minutos
```

---

## 🆘 SUPORTE E AJUDA

### Problemas Comuns:

1. **Erro ao executar script SQL**
   - Verifique se copiou TODO o conteúdo
   - Execute linha por linha se necessário

2. **Erro "Failed to fetch"**
   - Verifique o `.env.local`
   - Reinicie o servidor

3. **CNPJs não carregam**
   - Verifique a chave da API
   - Teste com um CNPJ manualmente primeiro

### Contatos:
- Documentação: Veja arquivos `SETUP.md` e `GUIA_ENV.md`
- Scripts: Veja pasta `scripts/`

---

## ✅ CHECKLIST FINAL

- [ ] Supabase configurado
- [ ] Banco de dados criado
- [ ] API de CNPJ configurada
- [ ] Dados carregados
- [ ] Aplicação rodando
- [ ] Testes realizados

**🎉 Parabéns! Seu CRM está pronto para uso!**

