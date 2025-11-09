<#
.SYNOPSIS
    Registra uma entrada de auditoria no sistema MCP do Contta CRM
.DESCRIPTION
    Este script cria uma entrada estruturada no arquivo de log de auditoria (NDJSON)
    seguindo os padrões definidos em MCP_AUDITORIA.md
.PARAMETER Scope
    Escopo da alteração (ex: supabase.rls, backend.api, frontend.component)
.PARAMETER Action
    Tipo de ação (create, update, delete, test, deploy)
.PARAMETER Description
    Descrição detalhada da alteração
.PARAMETER Metadata
    Hashtable com metadados adicionais (file, commit, ticket, etc)
.EXAMPLE
    .\scripts\mcp-audit.ps1 `
        -Scope "supabase.rls" `
        -Action "update" `
        -Description "Política de SELECT em deals atualizada para incluir role Admin" `
        -Metadata @{file="supabase-schema.sql"; ticket="RLS-123"; line=45}
.NOTES
    Autor: Equipe Contta CRM
    Requer: $env:MCP_ACTOR configurado
#>

param(
    [Parameter(Mandatory=$true, HelpMessage="Escopo da alteração")]
    [ValidateSet(
        "project.init", "project.deploy",
        "supabase.schema", "supabase.rls", "supabase.migration", "supabase.seeds",
        "backend.api", "backend.test", "backend.auth",
        "frontend.component", "frontend.service", "frontend.test",
        "dependencies", "config", "docs",
        "test.validation", "test.e2e", "test.integration"
    )]
    [string]$Scope,
    
    [Parameter(Mandatory=$true, HelpMessage="Tipo de ação")]
    [ValidateSet("create", "update", "delete", "test", "deploy", "rollback", "validate")]
    [string]$Action,
    
    [Parameter(Mandatory=$true, HelpMessage="Descrição da alteração")]
    [string]$Description,
    
    [Parameter(Mandatory=$false)]
    [hashtable]$Metadata = @{}
)

# Validar variável MCP_ACTOR
if (-not $env:MCP_ACTOR) {
    Write-Host "❌ Erro: Variável MCP_ACTOR não configurada" -ForegroundColor Red
    Write-Host "   Execute: `$env:MCP_ACTOR = 'seu-email@amplabusiness.com.br'" -ForegroundColor Yellow
    exit 1
}

# Garantir que diretório logs existe
$logsDir = "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Preparar arquivo de log
$logFile = Join-Path $logsDir "audit-log.ndjson"
if (-not (Test-Path $logFile)) {
    New-Item -ItemType File -Path $logFile -Force | Out-Null
}

# Criar entrada de log
$logEntry = @{
    timestamp = (Get-Date -Format o)
    actor = $env:MCP_ACTOR
    scope = $Scope
    action = $Action
    description = $Description
    metadata = $Metadata
}

# Adicionar informações automáticas se disponíveis
try {
    $gitCommit = git rev-parse --short HEAD 2>$null
    if ($gitCommit) {
        $logEntry.metadata["git_commit"] = $gitCommit
    }
    
    $gitBranch = git rev-parse --abbrev-ref HEAD 2>$null
    if ($gitBranch) {
        $logEntry.metadata["git_branch"] = $gitBranch
    }
} catch {
    # Git não disponível ou não é um repositório
}

# Converter para JSON compacto e adicionar ao arquivo
$jsonLine = $logEntry | ConvertTo-Json -Compress -Depth 10
Add-Content -Path $logFile -Value $jsonLine -Encoding UTF8

# Exibir confirmação
Write-Host "✅ Auditoria registrada" -ForegroundColor Green
Write-Host "   Escopo: $Scope" -ForegroundColor Gray
Write-Host "   Ação: $Action" -ForegroundColor Gray
Write-Host "   Descrição: $Description" -ForegroundColor Gray
if ($Metadata.Count -gt 0) {
    Write-Host "   Metadados: $($Metadata.Keys -join ', ')" -ForegroundColor Gray
}
Write-Host "   Arquivo: $logFile" -ForegroundColor Gray
