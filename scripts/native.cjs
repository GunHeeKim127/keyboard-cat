const {execFileSync}=require('node:child_process');
const path=require('node:path');
if(process.platform==='win32'){
 execFileSync(path.join(process.env.WINDIR,'Microsoft.NET','Framework64','v4.0.30319','csc.exe'),['/nologo','/target:exe','/optimize+','/r:System.Windows.Forms.dll','/out:'+path.resolve('native/KeyCounter.exe'),path.resolve('native/KeyCounter.cs')],{stdio:'inherit'});
}else if(process.platform==='darwin'){
 const fs=require('node:fs');fs.mkdirSync('native/.build',{recursive:true});
 for(const arch of ['arm64','x86_64'])execFileSync('xcrun',['clang','-arch',arch,'-mmacosx-version-min=13.0','-O2','-Wall','-Wextra','-Werror','native/KeyCounter-mac.c','-framework','ApplicationServices','-framework','CoreFoundation','-o',`native/.build/KeyCounter-${arch}`],{stdio:'inherit'});
 execFileSync('xcrun',['lipo','-create','native/.build/KeyCounter-arm64','native/.build/KeyCounter-x86_64','-output','native/KeyCounter-mac'],{stdio:'inherit'});
 fs.chmodSync('native/KeyCounter-mac',0o755);
 execFileSync('codesign',['--force','--sign','-','--identifier','local.keyboardcat.pet.input','native/KeyCounter-mac'],{stdio:'inherit'});
}else throw Error('Only Windows and macOS builds are supported');
// Compiler build IDs/signature blobs may change without changing the helper's
// protocol. Use its source revision for payload compatibility, and keep a
// separate hash to verify the particular installed helper has not changed.
const fs=require('node:fs'),crypto=require('node:crypto');
const nativeSource=process.platform==='darwin'?'native/KeyCounter-mac.c':'native/KeyCounter.cs';
const nativeBinary=process.platform==='darwin'?'native/KeyCounter-mac':'native/KeyCounter.exe';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync('build/core-host.json',JSON.stringify({format:1,nativeRevision:hash(nativeSource),helperBinarySha256:hash(nativeBinary)}));
