# IPTV TIZEN - empacota e instala na TV pela rede (Wi-Fi)
# Uso: botao direito > Executar com PowerShell
#      ou: powershell -ExecutionPolicy Bypass -File instalar-na-tv.ps1 -TV 192.168.0.50
# O IP da TV fica salvo em tv.txt (nao vai para o GitHub).
param([string]$TV = "", [string]$Perfil = "IPTVTIZEN")
$ErrorActionPreference = "Stop"
$src = $PSScriptRoot
$ipFile = Join-Path $src "tv.txt"
if (-not $TV -and (Test-Path $ipFile)) { $TV = (Get-Content $ipFile -Raw).Trim() }
if (-not $TV) { $TV = Read-Host "IP da TV (Configuracoes > Geral > Rede > Status da rede)" }
Set-Content -Path $ipFile -Value $TV

$sdb = "C:\tizen-studio\tools\sdb.exe"
$tz  = "C:\tizen-studio\tools\ide\bin\tizen.bat"
if (-not (Test-Path $tz)) { Write-Host "Tizen Studio nao encontrado em C:\tizen-studio" -ForegroundColor Red; pause; exit 1 }

# 1) copia limpa so com os arquivos do app
$bld = Join-Path $env:TEMP "iptv-tizen-build"
if (Test-Path $bld) { Remove-Item -Recurse -Force $bld }
New-Item -ItemType Directory $bld | Out-Null
Copy-Item "$src\config.xml","$src\index.html","$src\icon.png" $bld
Copy-Item "$src\css","$src\js" $bld -Recurse
Remove-Item "$bld\js\config.local.example.js" -ErrorAction SilentlyContinue

# 2) conecta na TV
& $sdb connect $TV
$dev = (& $sdb devices | Select-String ([regex]::Escape($TV)) | ForEach-Object { ($_.Line -split "\s+")[2] }) | Select-Object -First 1
if (-not $dev) { Write-Host "TV nao conectada. Confira Developer Mode ON, IP do PC na TV e reinicie a TV pela tomada." -ForegroundColor Red; pause; exit 1 }

# 3) empacota (assina com o certificado Samsung) - o nome do .wgt NAO pode ter espaco
& $tz package -t wgt -s $Perfil -- $bld
Rename-Item (Get-ChildItem $bld -Filter *.wgt | Select-Object -First 1).FullName "IPTVTIZEN.wgt" -Force

# 4) instala e abre
& $tz install -n "IPTVTIZEN.wgt" -t $dev -- $bld
& $tz run -p IptvTizen1.IPTVTizen -t $dev
Write-Host "Pronto! App instalado na TV $dev ($TV)." -ForegroundColor Green
pause
