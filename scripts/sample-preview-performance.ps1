param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$prefix=[IO.Path]::GetFullPath($Root).TrimEnd('\')+'\'
Start-Sleep -Seconds 4
$previous=@{};$cpu=0.0;$peak=0L;$samples=0
$clock=[Diagnostics.Stopwatch]::StartNew()
for($n=0;$n -lt 10;$n++){
 $memory=0L
 foreach($p in Get-Process -ErrorAction SilentlyContinue){
  try{if(-not $p.Path -or -not $p.Path.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){continue};$total=$p.TotalProcessorTime.TotalSeconds;$key=[string]$p.Id;if($previous.ContainsKey($key)){$cpu+=[Math]::Max(0,$total-$previous[$key])};$previous[$key]=$total;$memory+=$p.WorkingSet64}catch{}
 }
 $peak=[Math]::Max($peak,$memory);$samples++;Start-Sleep -Seconds 1
}
[pscustomobject]@{samples=$samples;seconds=[Math]::Round($clock.Elapsed.TotalSeconds,1);cpuPercentOfMachine=[Math]::Round(100*$cpu/$clock.Elapsed.TotalSeconds/[Environment]::ProcessorCount,2);peakWorkingSetMB=[Math]::Round($peak/1MB,1)}|ConvertTo-Json -Compress
