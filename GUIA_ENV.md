# 📝 Guia de Preenchimento do .env.local

## ✅ Arquivo Criado

O arquivo `.env.local` foi criado na raiz do projeto. Agora você precisa preenchê-lo com suas credenciais.

## 🔑 Onde Obter as Credenciais

### 1. Credenciais do Supabase

#### Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Faça login ou crie uma conta gratuita

2. **Crie um Novo Projeto** (se ainda não tiver)
   - Clique em "New Project"
   - Escolha um nome (ex: "contta-crm")
   - Escolha uma senha para o banco de dados
   - Selecione uma região (recomendado: South America)
   - Aguarde a criação (pode levar alguns minutos)

3. **Obtenha as Credenciais**
   - No menu lateral, vá em **Settings** > **API**
   - Você verá:
     - **Project URL** (ex: `https://abcdefghijklmnop.supabase.co`)
     - **anon public** key (uma chave longa começando com `eyJ...`)
     - **service_role** key (uma chave longa, mantida em segredo)

4. **Preencha o .env.local**
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 2. Chave da API Gemini (Opcional)

#### Passo a Passo:

1. **Acesse o Google AI Studio**
   - URL: https://ai.google.dev/
   - Faça login com sua conta Google

2. **Obtenha a API Key**
   - Clique em "Get API Key"
   - Selecione ou crie um projeto Google Cloud
   - Copie a chave gerada (começa com `AIza...`)

3. **Preencha no .env.local**
   ```env
   GEMINI_API_KEY=AIzaSyExemplo123456789
   ```

## 📋 Template Completo do .env.local

```env
# ============================================
# SUPABASE - CONFIGURAÇÃO DO BANCO DE DADOS
# ============================================

# URL do projeto Supabase
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co

# Chave pública anon (do Settings > API > anon public)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# URL do projeto para API Routes (geralmente a mesma)
SUPABASE_URL=https://SEU-PROJETO.supabase.co

# Chave service_role (do Settings > API > service_role - SECRETA!)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# GEMINI API - INTELIGÊNCIA ARTIFICIAL (Opcional)
# ============================================

GEMINI_API_KEY=AIzaSyExemplo123456789

# ============================================
# CONFIGURAÇÃO DA API
# ============================================

VITE_API_BASE_URL=/api
```

## ⚠️ Importante

1. **NUNCA faça commit do `.env.local` no Git!**
   - Este arquivo contém informações sensíveis
   - Já está no `.gitignore` por padrão

2. **A service_role key é SECRETA**
   - Nunca exponha no frontend
   - Use apenas nas API Routes (serverless functions)

3. **Mantenha as chaves seguras**
   - Não compartilhe em repositórios públicos
   - Não envie por email ou mensagens

## ✅ Verificação

Após preencher o `.env.local`, verifique se está correto:

1. **Formato das URLs**
   - Devem começar com `https://`
   - Devem terminar com `.supabase.co`

2. **Formato das chaves**
   - `anon key` e `service_role` são tokens JWT longos
   - Geralmente começam com `eyJ...`
   - Têm mais de 100 caracteres

3. **Chave Gemini** (se preenchida)
   - Começa com `AIza...`
   - Tem cerca de 39 caracteres

## 🚀 Próximo Passo

Após preencher o `.env.local`:

1. Execute o script SQL no Supabase (arquivo `supabase-schema.sql`)
2. Execute `npm install` (se ainda não executou)
3. Execute `vercel dev` para testar localmente

## 🆘 Precisa de Ajuda?

- **Supabase**: https://supabase.com/docs
- **Google AI**: https://ai.google.dev/docs
- **Documentação do projeto**: Veja `SETUP.md`

