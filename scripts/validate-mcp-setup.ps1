<#
.SYNOPSIS
    Valida configuracao completa do sistema MCP
.DESCRIPTION
    Executa uma serie de testes para garantir que todos os componentes
    do sistema MCP estao configurados corretamente
.EXAMPLE
    .\scripts\validate-mcp-setup.ps1
.NOTES
    Autor: Equipe Contta CRM
#>

Write-Host "`n" ("=" * 80) -ForegroundColor Cyan
Write-Host "  VALIDACAO DE SETUP MCP - CONTTA CRM" -ForegroundColor White
Write-Host ("=" * 80) -ForegroundColor Cyan

$allPassed = $true

# 1. Verificar variaveis de ambiente
Write-Host "`n[1] Verificando Variaveis de Ambiente..." -ForegroundColor Yellow

$requiredEnvVars = @{
    'MCP_ACTOR' = 'Identificacao do usuario executando alteracoes'
    'SUPABASE_URL' = 'URL do projeto Supabase'
    'SUPABASE_SERVICE_KEY' = 'Service key do Supabase (admin)'
}

$missingVars = @()

foreach ($var in $requiredEnvVars.Keys) {
    if (Test-Path env:$var) {
        $value = (Get-Item env:$var).Value
        $masked = if ($value.Length -gt 20) { $value.Substring(0, 20) + "..." } else { $value }
        Write-Host "   OK $var = $masked" -ForegroundColor Green
    } else {
        Write-Host "   ERRO $var nao configurada - $($requiredEnvVars[$var])" -ForegroundColor Red
        $missingVars += $var
        $allPassed = $false
    }
}

# 2. Verificar estrutura de diretorios
Write-Host "`n[2] Verificando Estrutura de Diretorios..." -ForegroundColor Yellow

$requiredDirs = @('logs', 'scripts', 'reports')

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "   OK Diretorio $dir/ existe" -ForegroundColor Green
    } else {
        Write-Host "   AVISO Diretorio $dir/ nao encontrado - criando..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   OK Diretorio $dir/ criado" -ForegroundColor Green
    }
}

# 3. Verificar arquivos de log
Write-Host "`n[3] Verificando Arquivos de Log..." -ForegroundColor Yellow

$logFile = "logs\audit-log.ndjson"
if (Test-Path $logFile) {
    $logCount = (Get-Content $logFile -ErrorAction SilentlyContinue | Measure-Object).Count
    $fileSize = (Get-Item $logFile).Length
    Write-Host "   OK $logFile existe" -ForegroundColor Green
    Write-Host "      Entradas: $logCount" -ForegroundColor Gray
    Write-Host "      Tamanho: $([math]::Round($fileSize/1024, 2)) KB" -ForegroundColor Gray
    
    # Validar ultima entrada
    try {
        $lastEntry = Get-Content $logFile | Select-Object -Last 1 | ConvertFrom-Json
        Write-Host "      Ultima entrada: $($lastEntry.timestamp) ($($lastEntry.scope))" -ForegroundColor Gray
    } catch {
        Write-Host "   AVISO Ultima entrada com formato invalido" -ForegroundColor Yellow
    }
} else {
    Write-Host "   AVISO $logFile nao existe - criando..." -ForegroundColor Yellow
    New-Item -ItemType File -Path $logFile -Force | Out-Null
    Write-Host "   OK $logFile criado" -ForegroundColor Green
}

# 4. Verificar scripts
Write-Host "`n[4] Verificando Scripts MCP..." -ForegroundColor Yellow

$requiredScripts = @{
    'mcp-audit.ps1' = 'Registro de auditoria'
    'mcp-report.ps1' = 'Geracao de relatorios'
    'validate-mcp-setup.ps1' = 'Validacao de setup'
}

foreach ($script in $requiredScripts.Keys) {
    $scriptPath = "scripts\$script"
    if (Test-Path $scriptPath) {
        $lineCount = (Get-Content $scriptPath | Measure-Object).Count
        Write-Host "   OK $script ($lineCount linhas)" -ForegroundColor Green
    } else {
        Write-Host "   ERRO $script nao encontrado - $($requiredScripts[$script])" -ForegroundColor Red
        $allPassed = $false
    }
}

# 5. Teste de escrita
Write-Host "`n[5] Testando Escrita de Auditoria..." -ForegroundColor Yellow

if (Test-Path "scripts\mcp-audit.ps1") {
    try {
        & .\scripts\mcp-audit.ps1 `
            -Scope "test.validation" `
            -Action "validate" `
            -Description "Teste automatizado de validacao do sistema MCP" `
            -Metadata @{
                automated = $true
                version = "1.0.0"
            } 2>&1 | Out-Null
        
        Write-Host "   OK Escrita de auditoria funcionando" -ForegroundColor Green
        
        # Verificar se entrada foi criada
        $lastEntry = Get-Content $logFile | Select-Object -Last 1 | ConvertFrom-Json
        if ($lastEntry.scope -eq "test.validation") {
            Write-Host "   OK Entrada verificada no log" -ForegroundColor Green
        } else {
            Write-Host "   AVISO Entrada nao encontrada no log" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ERRO Falha no teste de escrita: $_" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "   PULAR Script mcp-audit.ps1 nao encontrado - pulando teste" -ForegroundColor Gray
}

# 6. Teste de leitura/relatorio
Write-Host "`n[6] Testando Geracao de Relatorio..." -ForegroundColor Yellow

if (Test-Path "scripts\mcp-report.ps1") {
    try {
        $reportOutput = & .\scripts\mcp-report.ps1 -Days 1 2>&1 | Out-String
        if ($reportOutput -match "RELATORIO DE AUDITORIA") {
            Write-Host "   OK Geracao de relatorio funcionando" -ForegroundColor Green
        } else {
            Write-Host "   AVISO Relatorio gerado mas formato inesperado" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ERRO Falha no teste de relatorio: $_" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "   PULAR Script mcp-report.ps1 nao encontrado - pulando teste" -ForegroundColor Gray
}

# 7. Verificar integração com Git
Write-Host "`n[7] Verificando Integracao com Git..." -ForegroundColor Yellow

try {
    $gitRoot = git rev-parse --show-toplevel 2>$null
    if ($gitRoot) {
        Write-Host "   OK Repositorio Git detectado" -ForegroundColor Green
        
        $currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
        $currentCommit = git rev-parse --short HEAD 2>$null
        
        Write-Host "      Branch: $currentBranch" -ForegroundColor Gray
        Write-Host "      Commit: $currentCommit" -ForegroundColor Gray
        
        # Verificar se ha mudancas nao commitadas
        $gitStatus = git status --porcelain 2>$null
        if ($gitStatus) {
            $changedFiles = ($gitStatus | Measure-Object).Count
            Write-Host "      AVISO $changedFiles arquivo(s) com alteracoes nao commitadas" -ForegroundColor Yellow
        } else {
            Write-Host "      OK Working tree limpo" -ForegroundColor Green
        }
    } else {
        Write-Host "   AVISO Nao e um repositorio Git" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   AVISO Git nao disponivel" -ForegroundColor Yellow
}

# 8. Resumo e recomendacoes
Write-Host "`n" ("=" * 80) -ForegroundColor Cyan
Write-Host "  RESUMO DA VALIDACAO" -ForegroundColor White
Write-Host ("=" * 80) -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "`nOK Todos os testes passaram com sucesso!" -ForegroundColor Green
    Write-Host "`nO sistema MCP esta configurado e pronto para uso." -ForegroundColor White
    
    Write-Host "`n[!] Proximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Configure MCP_ACTOR com seu e-mail" -ForegroundColor Gray
    Write-Host "   2. Use .\scripts\mcp-audit.ps1 para registrar alteracoes" -ForegroundColor Gray
    Write-Host "   3. Gere relatorios com .\scripts\mcp-report.ps1" -ForegroundColor Gray
    Write-Host "   4. Consulte MCP_AUDITORIA.md para detalhes" -ForegroundColor Gray
} else {
    Write-Host "`nAVISO Alguns testes falharam" -ForegroundColor Yellow
    
    if ($missingVars.Count -gt 0) {
        Write-Host "`nERRO Configure as seguintes variaveis de ambiente:" -ForegroundColor Red
        foreach ($var in $missingVars) {
            Write-Host "   `$env:$var = '...' # $($requiredEnvVars[$var])" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`nPara mais informacoes, consulte:" -ForegroundColor White
    Write-Host "   - MCP_AUDITORIA.md" -ForegroundColor Gray
    Write-Host "   - PLANO_PRODUCAO.md (Secao 3: Setup de MCPs)" -ForegroundColor Gray
}

Write-Host "`n" ("=" * 80) -ForegroundColor Cyan

# Retornar exit code apropriado
if ($allPassed) {
    exit 0
} else {
    exit 1
}
