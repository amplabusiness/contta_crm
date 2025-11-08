# 🚀 Guia Rápido de Execução - Contta CRM

## ⚡ Execução Rápida (5 minutos)

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase (obtenha em https://supabase.com/dashboard)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica

# Gemini API (opcional, para funcionalidades de IA)
GEMINI_API_KEY=sua-chave-gemini-api

# API Base URL (padrão: /api)
VITE_API_BASE_URL=/api
```

### 3. Configurar Banco de Dados Supabase

1. Acesse https://supabase.com e crie um projeto
2. Vá em **SQL Editor**
3. Copie e execute o conteúdo do arquivo `supabase-schema.sql`
4. Copie a **URL** e **anon key** do projeto (Settings > API)

### 4. Executar Localmente

#### Opção A: Apenas Frontend (dados mockados)
```bash
npm run dev
```

#### Opção B: Frontend + Backend (recomendado)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Configurar variáveis de ambiente
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add GEMINI_API_KEY

# Executar
vercel dev
```

A aplicação estará disponível em: **http://localhost:3000**

## 📋 Checklist de Configuração

- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env.local` criado e configurado
- [ ] Projeto Supabase criado
- [ ] Script SQL executado no Supabase
- [ ] Variáveis de ambiente configuradas

## 🗂️ Estrutura Criada

```
contta-crm/
├── api/                      # ✅ Funções serverless (Vercel)
│   ├── deals.ts
│   ├── tasks.ts
│   ├── dashboard-data.ts
│   ├── prospects.ts
│   ├── team.ts
│   └── analytics-data.ts
├── services/
│   ├── supabaseClient.ts    # ✅ Cliente Supabase
│   └── apiService.ts         # ✅ Atualizado para usar APIs reais
├── supabase-schema.sql       # ✅ Script SQL do banco
├── vercel.json               # ✅ Configuração Vercel
└── SETUP.md                  # ✅ Guia detalhado
```

## 🔧 Troubleshooting

### Erro: "Supabase URL não configurado"
- Verifique se o arquivo `.env.local` existe
- Certifique-se de que as variáveis começam com `VITE_`

### Erro: "Failed to fetch" nas APIs
- Use `vercel dev` em vez de `npm run dev` para executar as APIs
- Ou configure um proxy no `vite.config.ts`

### Erro ao executar SQL no Supabase
- Execute os comandos um por vez
- Verifique se não há tabelas duplicadas

## 📚 Documentação Completa

Para mais detalhes, consulte:
- [SETUP.md](./SETUP.md) - Guia completo de configuração
- [BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md) - Documentação técnica do backend

## 🎯 Próximos Passos

1. ✅ Backend criado e configurado
2. ✅ Banco de dados estruturado
3. ✅ APIs integradas ao frontend
4. ⏭️ Configurar autenticação
5. ⏭️ Fazer deploy na Vercel
6. ⏭️ Adicionar mais endpoints conforme necessário

