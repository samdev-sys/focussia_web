# Apareja las aperturas ya insertadas de <FitGeneral> con sus cierres,
# manejando rutas de una y varias líneas. Idempotente.
$ruta = Join-Path (Split-Path $PSScriptRoot -Parent) 'src\App.tsx'
$lineas = Get-Content $ruta
$out = New-Object System.Collections.Generic.List[string]
$esperandoCierre = $false
foreach ($l in $lineas) {
  $n = $l
  if (-not $esperandoCierre) {
    if ($n.Contains('<MobileOrientationPrompt>') -and $n.Contains('<Route path="/app/"') -and -not $n.Contains('<FitGeneral>')) {
      $n = $n.Replace('<MobileOrientationPrompt><', '<MobileOrientationPrompt><FitGeneral><')
      $esperandoCierre = $true
    } elseif ($n.Contains('<MobileOrientationPrompt><FitGeneral><') -and $n.Contains('</MobileOrientationPrompt>')) {
      # ya envuelta en una línea: asegurar cierre
      if (-not $n.Contains('</FitGeneral>')) {
        $idx = $n.LastIndexOf('</MobileOrientationPrompt>')
        $n = $n.Substring(0, $idx) + '</FitGeneral>' + $n.Substring($idx)
      }
    } elseif ($n.Contains('<MobileOrientationPrompt><FitGeneral><') -and -not $n.Contains('</MobileOrientationPrompt>')) {
      $esperandoCierre = $true
    }
  } else {
    if ($n.Contains('</MobileOrientationPrompt>')) {
      $idx = $n.LastIndexOf('</MobileOrientationPrompt>')
      if ($idx -ge 0 -and -not $n.Contains('</FitGeneral>')) {
        $n = $n.Substring(0, $idx) + '</FitGeneral>' + $n.Substring($idx)
      }
      $esperandoCierre = $false
    }
  }
  $out.Add($n)
}
Set-Content $ruta -Value $out
$ap = (Select-String -Path $ruta -Pattern '<FitGeneral><').Count
$ci = (Select-String -Path $ruta -Pattern '</FitGeneral>').Count
"aperturas=$ap cierres=$ci"
