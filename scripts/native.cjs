const {execFileSync}=require('node:child_process');
const path=require('node:path');
if(process.platform!=='win32') throw Error('Windows build required');
execFileSync(path.join(process.env.WINDIR,'Microsoft.NET','Framework64','v4.0.30319','csc.exe'),['/nologo','/target:exe','/optimize+','/r:System.Windows.Forms.dll','/out:'+path.resolve('native/KeyCounter.exe'),path.resolve('native/KeyCounter.cs')],{stdio:'inherit'});
