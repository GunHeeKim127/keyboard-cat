import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileHash,CoreRuntime} from './core-store';
export function coreRuntime(executable:string,resources:string,platform:string,arch:string,electron:string):CoreRuntime{
 const helper=platform==='darwin'?path.join(resources,'..','MacOS','KeyCounter-mac'):path.join(resources,'KeyCounter.exe');
 const file=path.join(resources,'core-host.json');if(fs.statSync(file).size>4096)throw Error('Invalid runtime description');
 const host=JSON.parse(fs.readFileSync(file,'utf8'));if(host.format!==1||!/^[a-f0-9]{64}$/.test(host.nativeRevision)||!/^[a-f0-9]{64}$/.test(host.helperBinarySha256))throw Error('Invalid runtime description');
 // macOS re-signs Mach-O files during packaging; its bundle signature and input
 // startup check protect the helper. Windows packaging leaves this binary intact.
 if(platform==='win32'&&fileHash(helper)!==host.helperBinarySha256)throw Error('Installed helper changed');
 const engine= createHash('sha256').update(JSON.stringify(['keyboard-cat-core',1,electron,platform,arch])).digest('hex');
 return {electron,platform,arch,engineSha256:engine,nativeSha256:host.nativeRevision};
}
