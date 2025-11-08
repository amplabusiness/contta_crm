# Guia de Configuração - Contta CRM

Este guia irá ajudá-lo a configurar e executar o Contta CRM localmente.

## Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (gratuita): https://supabase.com
- Conta na Vercel (opcional, para deploy): https://vercel.com
- Chave da API Gemini (opcional, para funcionalidades de IA): https://ai.google.dev/

## Passo 1: Configurar o Supabase

1. Acesse https://supabase.com e crie uma conta (se ainda não tiver)
2. Crie um novo projeto
3. No painel do projeto, vá em **Settings** > **API**
4. Copie as seguintes informações:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (mantenha secreta!)

## Passo 2: Criar o Banco de Dados

1. No painel do Supabase, vá em **SQL Editor**
2. Abra o arquivo `supabase-schema.sql` deste projeto
3. Copie todo o conteúdo do arquivo
4. Cole no SQL Editor do Supabase
5. Clique em **Run** para executar o script
6. Verifique se todas as tabelas foram criadas em **Table Editor**

## Passo 3: Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.local.example` para `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edite o arquivo `.env.local` e preencha com suas credenciais:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
   GEMINI_API_KEY=sua-chave-gemini-api
   ```

## Passo 4: Instalar Dependências

```bash
npm install
```

## Passo 5: Executar Localmente

### Opção 1: Usando Vite (apenas frontend, APIs mockadas)

```bash
npm run dev
```

A aplicação estará disponível em: http://localhost:3000

### Opção 2: Usando Vercel CLI (frontend + APIs serverless)

1. Instale o Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Faça login:
   ```bash
   vercel login
   ```

3. Configure as variáveis de ambiente:
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_KEY
   vercel env add GEMINI_API_KEY
   ```

4. Execute localmente:
   ```bash
   vercel dev
   ```

A aplicação estará disponível em: http://localhost:3000

## Passo 6: Testar a Aplicação

1. Abra o navegador em http://localhost:3000
2. Navegue pelas diferentes seções:
   - Dashboard
   - Prospecção
   - Negócios
   - Tarefas
   - Equipe

## Estrutura do Projeto

```
contta-crm/
├── api/                    # Funções serverless (Vercel)
│   ├── deals.ts
│   ├── tasks.ts
│   ├── dashboard-data.ts
│   ├── prospects.ts
│   ├── team.ts
│   └── analytics-data.ts
├── components/             # Componentes React
├── services/               # Serviços e lógica de negócio
│   ├── apiService.ts       # Cliente da API
│   └── supabaseClient.ts   # Cliente Supabase
├── data/                   # Dados mockados
├── supabase-schema.sql     # Script SQL do banco
├── .env.local              # Variáveis de ambiente (não commitado)
└── vercel.json             # Configuração Vercel
```

## Troubleshooting

### Erro: "Supabase URL ou Anon Key não configurados"
- Verifique se o arquivo `.env.local` existe e está configurado corretamente
- Certifique-se de que as variáveis começam com `VITE_` para serem expostas ao frontend

### Erro: "Failed to fetch" nas chamadas de API
- Se estiver usando apenas `npm run dev`, as APIs não estarão disponíveis
- Use `vercel dev` para executar as funções serverless localmente
- Ou configure um proxy no `vite.config.ts`

### Erro ao executar o SQL no Supabase
- Verifique se você está executando no projeto correto
- Certifique-se de que não há tabelas com os mesmos nomes já existentes
- Execute os comandos um por vez se houver erro

## Próximos Passos

- Configure autenticação no Supabase
- Adicione mais endpoints conforme necessário
- Faça deploy na Vercel para produção
- Configure domínio personalizado

## Suporte

Para mais informações, consulte:
- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação da Vercel](https://vercel.com/docs)
- [BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md)

