param([Parameter(Mandatory=$true)][string]$ToolDirectory)
$ErrorActionPreference = 'Stop'
# ToolDirectory contains a local @gltf-transform/cli 4.5.1 installation.
# No flatten/prune/simplify: retain the rotor/folding hierarchy and silhouette.
$cli = Join-Path $ToolDirectory 'node_modules\.bin\gltf-transform.cmd'
$raw = Join-Path $PSScriptRoot 'xag-p150-max-v03-web-uncompressed.glb'
$welded = Join-Path $PSScriptRoot 'xag-p150-max-v03-web-welded.glb'
$compressed = Join-Path $PSScriptRoot 'xag-p150-max-v03-web.glb'
& $cli weld $raw $welded
if ($LASTEXITCODE -ne 0) { throw 'Vertex welding failed.' }
& $cli meshopt $welded $compressed --level medium
if ($LASTEXITCODE -ne 0) { throw 'Meshopt compression failed.' }
$reportPath = Join-Path $PSScriptRoot 'validation-v03.json'
$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
$report.PSObject.Properties.Remove('web_glb_bytes')
$report | Add-Member -NotePropertyName web_uncompressed_glb_bytes -NotePropertyValue (Get-Item -LiteralPath $raw).Length -Force
$report | Add-Member -NotePropertyName web_compressed_glb_bytes -NotePropertyValue (Get-Item -LiteralPath $compressed).Length -Force
$report | Add-Member -NotePropertyName compression -NotePropertyValue 'EXT_meshopt_compression; no geometric simplification' -Force
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $reportPath -Encoding utf8
$manifestPath = Join-Path $PSScriptRoot 'web-model-manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$manifest | Add-Member -NotePropertyName decoder -NotePropertyValue 'MeshoptDecoder required by the future browser loader' -Force
$manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestPath -Encoding utf8
