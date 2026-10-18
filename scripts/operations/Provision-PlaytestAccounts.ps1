#Requires -Version 7.0
param([switch]$Apply)
$ErrorActionPreference='Stop'
function Read-PrivateText([string]$Prompt) {
  $secureValue=Read-Host $Prompt -AsSecureString
  $securePointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try {return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($securePointer)}
  finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($securePointer);$secureValue.Dispose()}
}
$expectedHost='cluster0.lxb4kqs.mongodb.net'
Write-Host "Approved target: poker_g / Cluster0 / poker_playtest on $expectedHost"
$sourceUri=Read-PrivateText 'Existing write-capable Atlas URI for poker_playtest (masked; do not paste into chat)'
$accountInputs=@()
foreach($alias in @('A','B')) {
  $email=(Read-Host "New login email/alias for Playtest $alias").Trim().ToLowerInvariant()
  $password=Read-PrivateText "New password for Playtest $alias (16-128 characters)"
  $passwordAgain=Read-PrivateText "Confirm new password for Playtest $alias"
  if($password -cne $passwordAgain){throw 'Passwords differ; nothing submitted.'}
  $accountInputs+=@{alias=$alias;email=$email;password=$password}
  $password=$null;$passwordAgain=$null
}
$confirmation=''
if($Apply) {
  Write-Host 'Target: poker_g / Cluster0 / poker_playtest. Inserts two users and two credential records in one transaction.'
  Write-Host 'These two users are preverified without mailbox ownership checks. No email, ticket grants, cosmetics, existing-account updates or deployment.'
  $confirmation=Read-Host 'Type CREATE TWO PREVERIFIED PLAYTEST ACCOUNTS to authorize the write'
  if($confirmation -cne 'CREATE TWO PREVERIFIED PLAYTEST ACCOUNTS'){throw 'Not confirmed; nothing submitted.'}
} else {Write-Host 'DRY RUN: validate target and absence of both emails; no records will be written.'}
$startInfo=[Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName=(Get-Command node -CommandType Application).Source
$startInfo.ArgumentList.Add((Join-Path $PSScriptRoot 'run.mjs'))
$startInfo.WorkingDirectory=$PSScriptRoot
$startInfo.UseShellExecute=$false
$startInfo.CreateNoWindow=$true
$startInfo.RedirectStandardInput=$true
$startInfo.RedirectStandardOutput=$true
$startInfo.RedirectStandardError=$true
$process=[Diagnostics.Process]::new();$process.StartInfo=$startInfo
try {
  if(-not $process.Start()){throw 'Could not start provisioning helper.'}
  $inputJson=@{uri=$sourceUri;expectedHost=$expectedHost;database='poker_playtest';accounts=$accountInputs;apply=[bool]$Apply;confirm=$confirmation}|ConvertTo-Json -Depth 4 -Compress
  $process.StandardInput.Write($inputJson);$process.StandardInput.Close()
  $sourceUri=$null;$accountInputs=$null;$inputJson=$null
  $outputTask=$process.StandardOutput.ReadToEndAsync();$errorTask=$process.StandardError.ReadToEndAsync()
  $process.WaitForExit()
  Write-Host $outputTask.GetAwaiter().GetResult()
  $safeErrors=$errorTask.GetAwaiter().GetResult();if($safeErrors){Write-Host $safeErrors}
  if($process.ExitCode -ne 0){throw 'Provisioning did not report success. Stop and inspect target/aliases; do not blindly retry or widen access.'}
} finally {$sourceUri=$null;$accountInputs=$null;$inputJson=$null;$process.Dispose()}
