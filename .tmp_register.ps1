$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$payload = @{ name = 'dino'; email = 'dino@gmail.com'; password = '1234512345' } | ConvertTo-Json
try {
  $res = Invoke-RestMethod -Uri 'http://localhost:5001/api/auth/register' -Method Post -Body $payload -ContentType 'application/json' -WebSession $session -ErrorAction Stop
  $res | ConvertTo-Json -Depth 5 | Write-Host
} catch {
  Write-Host 'ERROR:' $_.Exception.Message
  if ($_.Exception.Response) {
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $txt = $reader.ReadToEnd()
      Write-Host 'RESPONSE_BODY:'
      Write-Host $txt
    } catch {
      Write-Host 'Failed to read response body'
    }
  }
}
