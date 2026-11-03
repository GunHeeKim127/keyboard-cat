$ErrorActionPreference = 'Stop'
$assembly = [Reflection.Assembly]::LoadFile((Join-Path (Get-Location) 'native\DesktopScene.exe'))
$sceneType = $assembly.GetType('DesktopScene')
$check = $sceneType.GetMethod('CanEnterFolder')
$open = $sceneType.GetMethod('CreateFile', [Reflection.BindingFlags]'NonPublic,Static')
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('keyboard-cat-folder-access-' + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($testRoot) | Out-Null
$exclusive = $null
try {
 if (-not $sceneType::CanEnterFolder([string]$testRoot)) { throw 'Readable test directory rejected' }
 if ($sceneType::CanEnterFolder([string](Join-Path $testRoot 'missing'))) { throw 'Missing directory accepted' }
 $exclusive = $open.Invoke($null, @([string]$testRoot, [uint32]1, [uint32]0, [IntPtr]::Zero, [uint32]3, [uint32]0x02200000, [IntPtr]::Zero))
 if ($exclusive.IsInvalid) { throw 'Could not acquire isolated test lock' }
 if ($sceneType::CanEnterFolder([string]$testRoot)) { throw 'Locked directory accepted' }
 $exclusive.Dispose()
 $exclusive = $null
 if (-not $sceneType::CanEnterFolder([string]$testRoot)) { throw 'Released directory remains rejected' }
 Write-Output 'FOLDER_ACCESS_OK readable/missing/locked/released'
} finally {
 if ($null -ne $exclusive) { $exclusive.Dispose() }
 [IO.Directory]::Delete($testRoot)
}
