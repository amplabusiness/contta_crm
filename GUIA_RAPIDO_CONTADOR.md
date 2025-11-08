# 🚀 GUIA RÁPIDO PARA CONTADORES
## Passo a Passo Simplificado - Contta CRM

---

## ⚡ INÍCIO RÁPIDO (3 Comandos)

### 1️⃣ Verificar Configuração
```bash
npm run check-env
```
**O que faz:** Verifica se todas as credenciais estão configuradas

---

### 2️⃣ Configurar Banco de Dados
```bash
npm run setup-db
```
**O que faz:** Mostra o SQL para copiar e colar no Supabase

**Passos manuais:**
1. O script mostrará o SQL na tela
2. Copie TODO o texto
3. Abra: https://supabase.com/dashboard
4. Vá em **SQL Editor**
5. Cole o SQL
6. Clique em **Run**

---

### 3️⃣ Carregar CNPJs
```bash
npm run load-cnpjs
```
**O que faz:** Busca e salva CNPJs no banco de dados

**Antes de executar:**
1. Crie arquivo `cnpjs.txt` na raiz do projeto
2. Coloque um CNPJ por linha:
   ```
   12345678000190
   98765432000111
   ```

---

## 📋 CHECKLIST COMPLETO

### ✅ Fase 1: Preparação (10 min)
- [ ] Criar conta no Supabase: https://supabase.com
- [ ] Criar projeto no Supabase
- [ ] Copiar credenciais (Settings > API)
- [ ] Preencher `.env.local` com credenciais
- [ ] Executar: `npm run check-env`

### ✅ Fase 2: Banco de Dados (5 min)
- [ ] Executar: `npm run setup-db`
- [ ] Copiar SQL mostrado
- [ ] Colar no SQL Editor do Supabase
- [ ] Verificar tabelas criadas

### ✅ Fase 3: Testar CNPJ (2 min)
- [ ] Executar: `npm run test-cnpj 27865757000102`
- [ ] Verificar se retorna dados

### ✅ Fase 4: Carregar Dados (10 min)
- [ ] Criar arquivo `cnpjs.txt`
- [ ] Adicionar CNPJs (um por linha)
- [ ] Executar: `npm run load-cnpjs`
- [ ] Aguardar conclusão

### ✅ Fase 5: Executar Aplicação (2 min)
- [ ] Executar: `npm run dev`
- [ ] Abrir: http://localhost:3000
- [ ] Testar funcionalidades

---

## 🎯 COMANDOS PRINCIPAIS

| Comando | O que faz |
|---------|-----------|
| `npm run check-env` | Verifica configuração |
| `npm run setup-db` | Configura banco de dados |
| `npm run test-cnpj [CNPJ]` | Testa busca de CNPJ |
| `npm run load-cnpjs` | Carrega CNPJs no banco |
| `npm run dev` | Executa aplicação |

---

## 📁 ARQUIVOS IMPORTANTES

- **`.env.local`** - Suas credenciais (NÃO commitar!)
- **`cnpjs.txt`** - Lista de CNPJs para carregar
- **`ROADMAP_COMPLETO.md`** - Guia detalhado completo
- **`supabase-schema.sql`** - Script do banco de dados

---

## 🆘 PROBLEMAS COMUNS

### ❌ "Variáveis não encontradas"
**Solução:** Verifique o arquivo `.env.local` e certifique-se de que está preenchido

### ❌ "Arquivo cnpjs.txt não encontrado"
**Solução:** Crie o arquivo `cnpjs.txt` na raiz do projeto com CNPJs

### ❌ "CNPJ não encontrado"
**Solução:** Verifique se o CNPJ está correto e se há internet

### ❌ "Failed to fetch"
**Solução:** Verifique se o Supabase está configurado corretamente

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Siga o checklist acima
2. ✅ Execute os comandos na ordem
3. ✅ Consulte `ROADMAP_COMPLETO.md` para detalhes
4. ✅ Em caso de dúvidas, veja a seção de problemas

---

## ✨ DICAS

- 💡 Execute um comando por vez
- 💡 Leia as mensagens na tela
- 💡 Anote senhas e chaves importantes
- 💡 Faça backup do `.env.local`

---

**🎉 Boa sorte! Você consegue!**

