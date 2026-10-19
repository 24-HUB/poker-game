#Requires -Version 7.0
$ErrorActionPreference='Stop'
function Read-PrivateText([string]$Prompt) {
  $value=Read-Host $Prompt -AsSecureString
  $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
  try {return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)}
  finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);$value.Dispose()}
}
Write-Host 'Requires a separately approved backup/restore window and a prebuilt reviewed candidate image.'
Write-Host 'All copied services run inside a network-none namespace. Source is never restored.'
$confirmation=Read-Host 'Type RESTORE ARCHIVE INTO ISOLATED LOCAL RUNNER'
if($confirmation -cne 'RESTORE ARCHIVE INTO ISOLATED LOCAL RUNNER'){throw 'Not confirmed; no archive read.'}
$candidate=Read-Host 'Reviewed image candidate (full 40-character Git SHA)'
$archive=Read-Host 'Encrypted .age archive path'
$sha256=Read-Host 'Expected encrypted archive SHA256'
$manifestArchive=Read-Host 'Encrypted full pre-application manifest .age path'
$key=Read-Host 'Existing local age identity-file path (never pasted key material)'
$accounts=@()
foreach($alias in @('A','B')) {
  $email=Read-PrivateText "Backed-up login for $alias (masked)"
  $password=Read-PrivateText "Backed-up password for $alias (masked)"
  $requestId=Read-PrivateText "Original backed-up purchase request ID for $alias (masked)"
  $accounts+=@{alias=$alias;email=$email;password=$password;requestIds=@($requestId)}
}
$start=[Diagnostics.ProcessStartInfo]::new()
$start.FileName=(Get-Command node -CommandType Application | Select-Object -First 1).Source
$start.ArgumentList.Add((Join-Path $PSScriptRoot 'restore-host.mjs'))
$start.UseShellExecute=$false;$start.CreateNoWindow=$true
$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
$process=[Diagnostics.Process]::new();$process.StartInfo=$start
try {
  if(-not $process.Start()){throw 'ISOLATION_FAILED'}
  $json=@{confirmation=$confirmation;candidate=$candidate;archive=$archive;sha256=$sha256;manifestArchive=$manifestArchive;key=$key;accounts=$accounts}|ConvertTo-Json -Depth 6 -Compress
  $process.StandardInput.Write($json);$process.StandardInput.Close()
  $accounts=$null;$json=$null;$email=$null;$password=$null;$requestId=$null
  $output=$process.StandardOutput.ReadToEndAsync();$errors=$process.StandardError.ReadToEndAsync()
  $process.WaitForExit()
  $safeOutput=$output.GetAwaiter().GetResult();$null=$errors.GetAwaiter().GetResult()
  if($process.ExitCode -ne 0){throw 'ISOLATION_FAILED: restore not certified; retain last known-good backup.'}
  Write-Host $safeOutput
} finally {$accounts=$null;$json=$null;$email=$null;$password=$null;$requestId=$null;$process.Dispose()}
