const {execFileSync}=require('node:child_process');
const path=require('node:path');
if(process.platform==='win32'){
 const framework=path.join(process.env.WINDIR,'Microsoft.NET','Framework64','v4.0.30319');
 execFileSync(path.join(framework,'csc.exe'),['/nologo','/target:exe','/optimize+','/r:Microsoft.CSharp.dll','/r:System.Web.Extensions.dll',...['UIAutomationClient.dll','UIAutomationTypes.dll','WindowsBase.dll'].map(n=>'/r:'+path.join(framework,'WPF',n)),'/out:'+path.resolve('native/DesktopScene.exe'),path.resolve('native/DesktopScene.cs')],{stdio:'inherit'});
 execFileSync(path.join(process.env.WINDIR,'Microsoft.NET','Framework64','v4.0.30319','csc.exe'),['/nologo','/target:exe','/optimize+','/r:System.Windows.Forms.dll','/out:'+path.resolve('native/KeyCounter.exe'),path.resolve('native/KeyCounter.cs')],{stdio:'inherit'});
}else if(process.platform==='darwin'){
 const fs=require('node:fs');fs.mkdirSync('native/.build',{recursive:true});
 for(const arch of ['arm64','x86_64'])execFileSync('xcrun',['clang','-arch',arch,'-mmacosx-version-min=13.0','-O2','-Wall','-Wextra','-Werror','native/KeyCounter-mac.c','-framework','ApplicationServices','-framework','CoreFoundation','-o',`native/.build/KeyCounter-${arch}`],{stdio:'inherit'});
 execFileSync('xcrun',['lipo','-create','native/.build/KeyCounter-arm64','native/.build/KeyCounter-x86_64','-output','native/KeyCounter-mac'],{stdio:'inherit'});
 fs.chmodSync('native/KeyCounter-mac',0o755);
 execFileSync('codesign',['--force','--sign','-','--identifier','local.keyboardcat.pet.input','native/KeyCounter-mac'],{stdio:'inherit'});
 for(const arch of ['arm64','x86_64'])execFileSync('xcrun',['clang','-arch',arch,'-mmacosx-version-min=13.0','-O2','-Wall','-Wextra','-Werror','-fobjc-arc','native/DesktopScene-mac.m','-framework','AppKit','-framework','ApplicationServices','-o',`native/.build/DesktopScene-${arch}`],{stdio:'inherit'});
 execFileSync('xcrun',['lipo','-create','native/.build/DesktopScene-arm64','native/.build/DesktopScene-x86_64','-output','native/DesktopScene-mac'],{stdio:'inherit'});
 fs.chmodSync('native/DesktopScene-mac',0o755);execFileSync('codesign',['--force','--sign','-','--identifier','local.keyboardcat.pet.scene','native/DesktopScene-mac'],{stdio:'inherit'});
}else throw Error('Only Windows and macOS builds are supported');
// Compiler build IDs/signature blobs may change without changing the helper's
// protocol. Use its source revision for payload compatibility, and keep a
// separate hash to verify the particular installed helper has not changed.
const fs=require('node:fs'),crypto=require('node:crypto');
const nativeSource=process.platform==='darwin'?'native/KeyCounter-mac.c':'native/KeyCounter.cs';
const nativeBinary=process.platform==='darwin'?'native/KeyCounter-mac':'native/KeyCounter.exe';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const nativeRevision=crypto.createHash('sha256').update(fs.readFileSync(nativeSource,'utf8').replace(/\r\n/g,'\n')+('\n'+fs.readFileSync(process.platform==='win32'?'native/DesktopScene.cs':'native/DesktopScene-mac.m','utf8').replace(/\r\n/g,'\n'))).digest('hex');
fs.writeFileSync('build/core-host.json',JSON.stringify({format:1,nativeRevision,helperBinarySha256:hash(nativeBinary),...(process.platform==='win32'?{sceneBinarySha256:hash('native/DesktopScene.exe')}:{})}));
