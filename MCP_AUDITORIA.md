# Procedimentos de Auditoria via MCP

> Objetivo: registrar toda alteração relevante em políticas RLS ou dados críticos do Supabase utilizando o fluxo do Model Context Protocol (MCP).

## Pré-requisitos
- Variáveis de ambiente exportadas no terminal atual:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `VITE_SUPABASE_ANON_KEY`
  - `MCP_ACTOR` (e-mail ou identificação de quem está executando a alteração)
- `npx` disponível (Node.js >= 18).
- Arquivo de log: `logs/audit-log.ndjson` (será criado automaticamente na primeira execução).

## Estrutura do registro
Cada entrada é gravada no formato [NDJSON](http://ndjson.org/) com os campos mínimos:

```json
{
  "timestamp": "2025-11-08T12:34:56.789Z",
  "actor": "sergio@amplabusiness.com.br",
  "scope": "supabase.rls",
  "action": "update",
  "description": "Ajuste nas políticas de tasks para permitir admins",
  "metadata": {
    "file": "supabase-schema.sql",
    "reference": "commit/abc123",
    "ticket": "RLS-45"
  }
}
```

## Fluxo recomendado
1. **Abrir sessão MCP** apontando para o workspace:
   ```powershell
   npx mcp shell
   ```
2. **Executar a alteração** (ex.: atualizar `supabase-schema.sql`, aplicar migrations, etc.).
3. **Registrar o evento** usando o provedor `filesystem.appendFile`:
   ```powershell
   $payload = @{
     timestamp  = (Get-Date -Format o)
     actor      = $env:MCP_ACTOR
     scope      = 'supabase.rls'
     action     = 'update'
     description= 'Atualização das políticas de tasks para exigir role Admin'
     metadata   = @{
       file      = 'supabase-schema.sql'
       ticket    = 'RLS-45'
     }
   } | ConvertTo-Json -Compress

   npx mcp call filesystem.appendFile --path logs/audit-log.ndjson --data $payload
   ```

   > Caso ocorra erro de encoding, valide se o shell está operando em UTF-8 (`chcp 65001`).

4. **Adicionar anexo opcional** (ex.: snapshot do arquivo modificado):
   ```powershell
   npx mcp call filesystem.appendFile --path logs/audit-attachments.ndjson --data (Get-Content supabase-schema.sql | Out-String)
   ```
5. **Encerrar a sessão MCP** com `exit` após validar que a resposta foi `{"status":"ok"}`.

## Boas práticas
- Use `scope` para classificar eventos (`supabase.rls`, `supabase.seeds`, `prod.datafix`).
- Sempre referencie commit/ticket no campo `metadata`.
- Gere relatórios periódicos com:
  ```powershell
  npx mcp call filesystem.readFile --path logs/audit-log.ndjson
  ```
- Não armazene senhas ou chaves secretas nos logs.

## Automação sugerida
Inclua uma verificação em pipelines CI que falha se `logs/audit-log.ndjson` não recebe uma entrada quando `supabase-schema.sql` é alterado. Exemplo (pseudo-code):

```yaml
- name: Ensure audit entry
  run: |
    git diff --name-only origin/main | findstr /C:"supabase-schema.sql"
    if %errorlevel%==0 (
      npx mcp call filesystem.readFile --path logs/audit-log.ndjson | findstr /C:"supabase.rls"
    )
```

Seguindo este procedimento, qualquer alteração crítica fica rastreável e auditável dentro do fluxo MCP, alinhando o projeto às exigências de compliance do Contta CRM.
