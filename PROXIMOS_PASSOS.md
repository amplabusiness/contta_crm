# 🚀 Próximos Passos - Executar a Aplicação

## ✅ Status Atual

- ✅ Backend criado (API Routes)
- ✅ Banco de dados estruturado (SQL script)
- ✅ Frontend integrado com APIs
- ✅ Cliente Supabase configurado
- ✅ Variáveis de ambiente preparadas

## 📋 Checklist de Execução

### 1. Verificar Configuração do .env.local

Execute o comando para verificar:
```bash
npm run check-env
```

Se alguma variável estiver faltando, edite o arquivo `.env.local` e preencha.

### 2. Configurar Banco de Dados no Supabase

**IMPORTANTE:** Este passo é obrigatório para o backend funcionar!

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto (ou crie um novo)
3. Vá em **SQL Editor** (no menu lateral)
4. Abra o arquivo `supabase-schema.sql` deste projeto
5. Copie TODO o conteúdo do arquivo
6. Cole no SQL Editor do Supabase
7. Clique em **Run** (ou pressione Ctrl+Enter)
8. Aguarde a execução (pode levar alguns segundos)
9. Verifique se as tabelas foram criadas em **Table Editor**

**Tabelas que devem ser criadas:**
- ✅ profiles
- ✅ empresas
- ✅ socios
- ✅ empresa_socios
- ✅ deals
- ✅ tasks
- ✅ indicacoes

### 3. Executar a Aplicação

#### Opção A: Apenas Frontend (dados mockados)
```bash
npm run dev
```
- ✅ Funciona mesmo sem Supabase configurado
- ✅ Usa dados mockados
- ⚠️ APIs não funcionarão (mas não quebra a aplicação)

#### Opção B: Frontend + Backend (recomendado)

**Primeiro, instale o Vercel CLI:**
```bash
npm i -g vercel
```

**Faça login:**
```bash
vercel login
```

**Configure as variáveis de ambiente na Vercel:**
```bash
vercel env add SUPABASE_URL
# Cole a URL do Supabase quando solicitado

vercel env add SUPABASE_SERVICE_KEY
# Cole a service_role key quando solicitado

vercel env add GEMINI_API_KEY
# Cole a chave do Gemini (ou pressione Enter para pular)
```

**Execute a aplicação:**
```bash
vercel dev
```

A aplicação estará disponível em: **http://localhost:3000**

### 4. Testar Funcionalidades

Após iniciar a aplicação, teste:

1. **Dashboard** - Deve carregar dados (mockados ou do banco)
2. **Prospecção** - Buscar empresas
3. **Negócios** - Visualizar e criar deals
4. **Tarefas** - Criar e atualizar tarefas
5. **Equipe** - Ver membros da equipe

## 🔧 Troubleshooting

### Erro: "Supabase URL não configurado"
- Verifique o arquivo `.env.local`
- Certifique-se de que as variáveis começam com `VITE_`
- Reinicie o servidor após alterar o `.env.local`

### Erro: "Failed to fetch" nas APIs
- Use `vercel dev` em vez de `npm run dev`
- Verifique se as variáveis de ambiente estão configuradas na Vercel
- Verifique o console do navegador para mais detalhes

### Erro ao executar SQL no Supabase
- Execute os comandos um por vez
- Verifique se não há erros de sintaxe
- Certifique-se de que está no projeto correto

### Erro: "relation does not exist"
- O script SQL não foi executado completamente
- Execute novamente o `supabase-schema.sql`
- Verifique se todas as tabelas foram criadas

## 📊 Verificar Conexão com Supabase

Para testar se o Supabase está conectado:

1. Abra o console do navegador (F12)
2. Vá para a aba "Console"
3. Procure por avisos sobre Supabase
4. Se aparecer "Supabase URL ou Anon Key não configurados", verifique o `.env.local`

## 🎯 Estrutura Final

```
contta-crm/
├── api/                    # ✅ Backend (Serverless Functions)
│   ├── deals.ts
│   ├── tasks.ts
│   ├── dashboard-data.ts
│   ├── prospects.ts
│   ├── team.ts
│   └── analytics-data.ts
├── services/
│   ├── supabaseClient.ts   # ✅ Cliente Supabase
│   └── apiService.ts        # ✅ Integração com APIs
├── supabase-schema.sql     # ✅ Script do banco
├── .env.local              # ✅ Suas credenciais (não commitado)
└── vercel.json             # ✅ Configuração Vercel
```

## 📚 Documentação

- **GUIA_ENV.md** - Como obter e configurar credenciais
- **SETUP.md** - Guia completo de configuração
- **BACKEND_DOCUMENTATION.md** - Documentação técnica

## ✨ Pronto!

Agora você pode executar a aplicação localmente. Se encontrar algum problema, consulte a seção de Troubleshooting acima.

