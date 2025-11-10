# 🚀 Contta CRM - O Melhor CRM Contábil do Mundo

CRM inteligente com **agentes de IA autônomos** trabalhando 24/7 para gerar insights, prever churn, identificar oportunidades de upsell e automatizar relatórios executivos.

## ✨ Features Principais

### 🤖 Agentes IA Autônomos (Gemini 2.5 Flash)
- **Predição de Churn**: Analisa engajamento e prevê risco de perda de clientes
- **Oportunidades Upsell**: Identifica cross-sell baseado em porte, CNAE e histórico
- **Relatórios Automatizados**: Gera insights executivos em HTML com análise de tendências

### 📊 Integrações Reais
- **API CNPJá**: Busca dados de empresas, sócios, CNAEs (cache Supabase 30 dias)
- **Supabase**: Autenticação, banco de dados PostgreSQL, RLS ativo
- **Rede Genealógica**: Mapeia sócios até 4º grau para descobrir conexões ocultas

### 📈 Analytics Avançados
- Dashboards em tempo real com Recharts
- Métricas de conversão, pipeline, receita
- Heatmaps de atividade e performance por região

---

## 🛠️ Setup Local

### Pré-requisitos
- Node.js 18+ 
- Conta Supabase (grátis)
- API Key do Google Gemini (grátis até 1500 req/dia)

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/amplabusiness/contta_crm.git
cd contta_crm/contta-crm
```

2. **Instale dependências**
```bash
npm install
```

3. **Configure variáveis de ambiente**
```bash
cp .env.example .env.local
```

Edite `.env.local`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
GEMINI_API_KEY=sua-gemini-key
VITE_CNPJA_API_KEY=sua-cnpja-key (opcional)
```

4. **Execute o servidor de desenvolvimento**
```bash
npm run dev
```

Acesse: `http://localhost:5173`

---

## 🚀 Deploy Vercel (Produção)

### Via CLI (Recomendado)

1. **Instale Vercel CLI**
```bash
npm install -g vercel
```

2. **Login**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

4. **Configure Environment Variables no Dashboard Vercel**
   - `GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CNPJA_API_KEY` (opcional)

### Via GitHub (CI/CD Automático)

1. Conecte repositório no [Vercel Dashboard](https://vercel.com)
2. Configure Environment Variables
3. Deploy automático a cada push na `main`

---

## 🧪 Testes

### Testar Agentes IA (Services)
```bash
npm run test:ai
```

### Validar Compilação TypeScript
```bash
npx tsc --noEmit
```

### Build de Produção
```bash
npm run build
```

---

## 📚 Documentação Técnica

- [PLANO_PRODUCAO.md](./PLANO_PRODUCAO.md) - Roadmap completo
- [BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md) - APIs e serviços
- [docs/agentes-ia-ativados.md](./docs/agentes-ia-ativados.md) - Guia dos agentes IA

---

## 🏗️ Arquitetura

```
contta-crm/
├── api/                    # Vercel Serverless Functions
│   ├── analytics-churn.ts  # Predição de churn
│   ├── analytics-upsell.ts # Oportunidades upsell
│   └── analytics-report.ts # Relatórios automatizados
├── services/
│   ├── geminiService.ts    # 3 agentes IA
│   ├── cnpjaService.ts     # API CNPJá + cache
│   └── supabaseClient.ts   # Auth & DB
├── components/             # React UI
└── types.ts               # TypeScript schemas
```

---

## 📊 Status do Projeto

- ✅ **Fase 1**: Auditoria & Limpeza (100%)
- ✅ **Fase 2.1**: API CNPJá Real (100%)
- ✅ **Fase 2.2**: Agentes IA Gemini (100% - VALIDADO)
- 🔄 **Fase 2.3**: Transparência Pública (In Progress)
- ⏳ **Fase 3**: Gamificação
- ⏳ **Fase 4**: Testes E2E

**Mocks Eliminados**: 11/18 (61%)

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'feat: Adiciona nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra Pull Request

---

## 📝 Licença

Proprietary - Ampla Business © 2025

---

## 🆘 Suporte

Dúvidas? Abra uma [Issue](https://github.com/amplabusiness/contta_crm/issues)
