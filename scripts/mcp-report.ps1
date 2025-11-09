<#
.SYNOPSIS
    Gera relatorio de auditoria do sistema MCP
.DESCRIPTION
    Analisa o arquivo audit-log.ndjson e gera relatorios detalhados
    por periodo, escopo, acao e ator
.PARAMETER Days
    Numero de dias para incluir no relatorio (padrao: 30)
.PARAMETER Scope
    Filtrar por escopo especifico
.PARAMETER Actor
    Filtrar por ator especifico
.PARAMETER OutputFormat
    Formato de saida: Console, HTML, JSON (padrao: Console)
.PARAMETER OutputPath
    Caminho para salvar relatorio (apenas para HTML/JSON)
.EXAMPLE
    .\scripts\mcp-report.ps1 -Days 7
.EXAMPLE
    .\scripts\mcp-report.ps1 -Scope "supabase.rls" -OutputFormat HTML -OutputPath reports\rls-audit.html
.NOTES
    Autor: Equipe Contta CRM
#>

param(
    [Parameter(Mandatory=$false)]
    [int]$Days = 30,
    
    [Parameter(Mandatory=$false)]
    [string]$Scope = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Actor = "",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Console", "HTML", "JSON")]
    [string]$OutputFormat = "Console",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = ""
)

$logFile = "logs\audit-log.ndjson"

# Verificar se arquivo existe
if (-not (Test-Path $logFile)) {
    Write-Host "ERRO Arquivo de auditoria nao encontrado: $logFile" -ForegroundColor Red
    exit 1
}

# Calcular data de corte
$cutoffDate = (Get-Date).AddDays(-$Days)

Write-Host "Carregando entradas de auditoria..." -ForegroundColor Cyan

# Carregar e parsear entradas
$entries = Get-Content $logFile | ForEach-Object {
    try {
        $_ | ConvertFrom-Json
    } catch {
        Write-Host "AVISO Linha invalida ignorada" -ForegroundColor Yellow
    }
} | Where-Object {
    $entry = $_
    $matchDate = [DateTime]$entry.timestamp -gt $cutoffDate
    $matchScope = ($Scope -eq "") -or ($entry.scope -eq $Scope)
    $matchActor = ($Actor -eq "") -or ($entry.actor -eq $Actor)
    
    $matchDate -and $matchScope -and $matchActor
}

if ($entries.Count -eq 0) {
    Write-Host "INFO Nenhuma entrada encontrada com os filtros especificados" -ForegroundColor Yellow
    exit 0
}

# Gerar estatísticas
$totalEntries = $entries.Count
$byScope = $entries | Group-Object -Property scope
$byAction = $entries | Group-Object -Property action
$byActor = $entries | Group-Object -Property actor
$firstEntry = ($entries | Sort-Object timestamp | Select-Object -First 1).timestamp
$lastEntry = ($entries | Sort-Object timestamp | Select-Object -Last 1).timestamp

# Renderizar conforme formato
switch ($OutputFormat) {
    "Console" {
        Write-Host "`n" ("=" * 80) -ForegroundColor Cyan
        Write-Host "  RELATORIO DE AUDITORIA MCP - CONTTA CRM" -ForegroundColor White
        Write-Host ("=" * 80) -ForegroundColor Cyan
        
        Write-Host "`nPeriodo:" -ForegroundColor Yellow
        Write-Host "   Primeira entrada: $firstEntry" -ForegroundColor Gray
        Write-Host "   Ultima entrada:   $lastEntry" -ForegroundColor Gray
        Write-Host "   Total de dias:    $Days" -ForegroundColor Gray
        
        Write-Host "`nResumo:" -ForegroundColor Yellow
        Write-Host "   Total de entradas: $totalEntries" -ForegroundColor White
        
        Write-Host "`nPor Escopo:" -ForegroundColor Yellow
        foreach ($group in ($byScope | Sort-Object Count -Descending)) {
            $percentage = [math]::Round(($group.Count / $totalEntries) * 100, 1)
            Write-Host "   $($group.Name.PadRight(30)) $($group.Count.ToString().PadLeft(5))  ($percentage%)" -ForegroundColor Gray
        }
        
        Write-Host "`nPor Acao:" -ForegroundColor Yellow
        foreach ($group in ($byAction | Sort-Object Count -Descending)) {
            $percentage = [math]::Round(($group.Count / $totalEntries) * 100, 1)
            Write-Host "   $($group.Name.PadRight(30)) $($group.Count.ToString().PadLeft(5))  ($percentage%)" -ForegroundColor Gray
        }
        
        Write-Host "`nPor Ator:" -ForegroundColor Yellow
        foreach ($group in ($byActor | Sort-Object Count -Descending)) {
            $percentage = [math]::Round(($group.Count / $totalEntries) * 100, 1)
            Write-Host "   $($group.Name.PadRight(30)) $($group.Count.ToString().PadLeft(5))  ($percentage%)" -ForegroundColor Gray
        }
        
        Write-Host "`nUltimas 10 Entradas:" -ForegroundColor Yellow
        $entries | Sort-Object timestamp -Descending | Select-Object -First 10 | ForEach-Object {
            $ts = ([DateTime]$_.timestamp).ToString("yyyy-MM-dd HH:mm:ss")
            Write-Host "   [$ts] " -NoNewline -ForegroundColor Gray
            Write-Host "$($_.scope) " -NoNewline -ForegroundColor Cyan
            Write-Host "($($_.action)) " -NoNewline -ForegroundColor Yellow
            Write-Host "- $($_.description)" -ForegroundColor White
        }
        
        Write-Host "`n" ("=" * 80) -ForegroundColor Cyan
    }
    
    "HTML" {
        $htmlContent = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatorio de Auditoria MCP - Contta CRM</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; }
        h1 { color: #333; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
        h2 { color: #6366f1; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #6366f1; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Relatorio de Auditoria MCP - Contta CRM</h1>
        <p><strong>Periodo:</strong> $firstEntry ate $lastEntry ($Days dias)</p>
        <p><strong>Total de Entradas:</strong> $totalEntries</p>
        <p><strong>Escopos Distintos:</strong> $($byScope.Count)</p>
        <p><strong>Atores:</strong> $($byActor.Count)</p>
        
        <h2>Distribuicao por Escopo</h2>
        <table>
            <tr><th>Escopo</th><th>Quantidade</th><th>Percentual</th></tr>
"@
        foreach ($group in ($byScope | Sort-Object Count -Descending)) {
            $percentage = [math]::Round(($group.Count / $totalEntries) * 100, 1)
            $htmlContent += "            <tr><td>$($group.Name)</td><td>$($group.Count)</td><td>$percentage%</td></tr>`n"
        }
        
        $htmlContent += @"
        </table>
        
        <h2>Distribuicao por Acao</h2>
        <table>
            <tr><th>Acao</th><th>Quantidade</th><th>Percentual</th></tr>
"@
        foreach ($group in ($byAction | Sort-Object Count -Descending)) {
            $percentage = [math]::Round(($group.Count / $totalEntries) * 100, 1)
            $htmlContent += "            <tr><td>$($group.Name)</td><td>$($group.Count)</td><td>$percentage%</td></tr>`n"
        }
        
        $htmlContent += @"
        </table>
        
        <h2>Ultimas Entradas</h2>
        <table>
            <tr><th>Timestamp</th><th>Escopo</th><th>Acao</th><th>Descricao</th><th>Ator</th></tr>
"@
        $entries | Sort-Object timestamp -Descending | Select-Object -First 20 | ForEach-Object {
            $ts = ([DateTime]$_.timestamp).ToString("yyyy-MM-dd HH:mm:ss")
            $htmlContent += "            <tr><td>$ts</td><td>$($_.scope)</td><td>$($_.action)</td><td>$($_.description)</td><td>$($_.actor)</td></tr>`n"
        }
        
        $htmlContent += @"
        </table>
    </div>
</body>
</html>
"@
        
        if ($OutputPath) {
            $htmlContent | Out-File -FilePath $OutputPath -Encoding UTF8
            Write-Host "OK Relatorio HTML gerado: $OutputPath" -ForegroundColor Green
        } else {
            Write-Host $htmlContent
        }
    }
    
    "JSON" {
        $report = @{
            generated = (Get-Date -Format o)
            period = @{
                days = $Days
                start = $firstEntry
                end = $lastEntry
            }
            summary = @{
                total_entries = $totalEntries
                distinct_scopes = $byScope.Count
                distinct_actors = $byActor.Count
            }
            by_scope = $byScope | ForEach-Object { @{ name = $_.Name; count = $_.Count } }
            by_action = $byAction | ForEach-Object { @{ name = $_.Name; count = $_.Count } }
            by_actor = $byActor | ForEach-Object { @{ name = $_.Name; count = $_.Count } }
            recent_entries = $entries | Sort-Object timestamp -Descending | Select-Object -First 20
        }
        
        $json = $report | ConvertTo-Json -Depth 10
        
        if ($OutputPath) {
            $json | Out-File -FilePath $OutputPath -Encoding UTF8
            Write-Host "OK Relatorio JSON gerado: $OutputPath" -ForegroundColor Green
        } else {
            Write-Host $json
        }
    }
}
