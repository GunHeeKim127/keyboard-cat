const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {InstalledUpdater,validInstallerInfo,isUpdaterResource}=require('../dist-electron/installed-updater');
const asset='Keyboard Cat Setup 1.3.17.exe';
const metadata=()=>({version:'1.3.17',files:[{url:asset,sha512:Buffer.alloc(64,1).toString('base64'),size:123456}]});
class Client extends EventEmitter {
 checks=0;downloads=0;installs=0;
 setFeedURL(feed){this.feed=feed;}
 async checkForUpdates(){this.checks++;return {updateInfo:this.info??metadata()};}
 async downloadUpdate(){this.downloads++;this.emit('download-progress',{percent:55});return ['verified-cache/setup.exe'];}
 quitAndInstall(silent,restart){this.installs++;this.args=[silent,restart];}
}
test('updater network stays on the fixed repository and GitHub release CDN',()=>{
 for(const url of ['https://github.com/GunHeeKim127/keyboard-cat/releases.atom','https://github.com/GunHeeKim127/keyboard-cat/releases/download/v1.3.17/latest.yml','https://api.github.com/repos/GunHeeKim127/keyboard-cat/releases/latest','https://release-assets.githubusercontent.com/a?token=temporary'])assert.equal(isUpdaterResource(url),true,url);
 for(const url of ['http://github.com/GunHeeKim127/keyboard-cat/releases.atom','https://evil.example/setup.exe','https://github.com/other/repo/releases.atom','file:///C:/setup.exe','https://github.com.evil.example/setup.exe','https://user:pass@github.com/GunHeeKim127/keyboard-cat/releases.atom','https://github.com/GunHeeKim127/keyboard-cat/releases/download/v1.3.17/a%2fb.exe'])assert.equal(isUpdaterResource(url),false,url);
});
test('installer rejects changed versions, foreign paths, missing checksums and oversized metadata',()=>{
 assert.equal(validInstallerInfo(metadata(),'1.3.17',asset),true);
 for(const info of [{...metadata(),version:'1.3.18'},{...metadata(),files:[]},{...metadata(),files:[...metadata().files,...metadata().files]},...['https://evil.example/setup.exe','../'+asset,'file:///setup.exe','https://github.com/other/setup.exe','%zz'].map(url=>({...metadata(),files:[{...metadata().files[0],url}]})),...['bad',null,''].map(sha512=>({...metadata(),files:[{...metadata().files[0],sha512}]})),{...metadata(),files:[{...metadata().files[0],size:1024**3}]}])assert.equal(validInstallerInfo(info,'1.3.17',asset),false);
});
test('installed updates are manual, coalesced, validated and require explicit install after download',async()=>{
 const client=new Client(),updater=new InstalledUpdater(client,'1.3.16');let armed=0;
 assert.deepEqual(client.feed,{provider:'github',owner:'GunHeeKim127',repo:'keyboard-cat',releaseType:'release'});
 for(const key of ['autoDownload','autoInstallOnAppQuit','allowPrerelease','allowDowngrade'])assert.equal(client[key],false);
 assert.equal(client.disableWebInstaller,true);assert.equal(client.disableDifferentialDownload,true);
 assert.equal(await updater.install(()=>armed++),false);assert.equal(client.checks,0);
 assert.equal(await updater.download('1.3.16',asset),false);
 assert.deepEqual(await Promise.all([updater.download('1.3.17',asset),updater.download('1.3.17',asset)]),[true,true]);
 assert.equal(client.checks,1);assert.equal(client.downloads,1);assert.equal(client.installs,0);assert.equal(updater.state.phase,'ready');
 assert.equal(await updater.download('1.3.18',asset),false);
 assert.equal(await updater.install(()=>armed++),true);assert.equal(armed,1);assert.deepEqual(client.args,[true,true]);assert.equal(await updater.install(()=>armed++),false);
});
test('metadata mismatch, download failure and install failure never mark a failed update ready',async()=>{
 for(const mode of ['metadata','download','install']){
  const client=new Client();let recoveries=0;const updater=new InstalledUpdater(client,'1.3.16',()=>recoveries++);
  if(mode==='metadata')client.info={...metadata(),version:'9.0.0'};
  if(mode==='download')client.downloadUpdate=async()=>{throw Error('checksum failed');};
  const ready=await updater.download('1.3.17',asset);
  if(mode==='install'){assert.equal(ready,true);client.quitAndInstall=()=>client.emit('error',Error('cannot launch'));assert.equal(await updater.install(()=>{}),false);}
  else assert.equal(ready,false);
  assert.equal(updater.state.phase,'error');assert.ok(recoveries>0);if(mode==='metadata')assert.equal(client.downloads,0);
 }
});
test('a changed or withdrawn release cannot keep an older prepared install enabled',async()=>{
 const client=new Client(),updater=new InstalledUpdater(client,'1.3.16');
 await updater.download('1.3.17',asset);updater.invalidate('1.3.17',asset);assert.equal(updater.state.phase,'ready');
 updater.invalidate('1.3.18','Keyboard Cat Setup 1.3.18.exe');assert.equal(updater.state.phase,'idle');assert.equal(await updater.install(()=>{}),false);
 await updater.download('1.3.17',asset);updater.invalidate();assert.equal(await updater.install(()=>{}),false);
});
test('backup completes before exit and install, and backup failure leaves the running app untouched',async()=>{
 const client=new Client(),order=[];let finish;
 client.quitAndInstall=()=>order.push('install');
 const updater=new InstalledUpdater(client,'1.3.16',()=>{},async target=>{assert.equal(target,'1.3.17');order.push('backup');await new Promise(r=>finish=r);});
 await updater.download('1.3.17',asset);const install=updater.install(()=>order.push('quit'));
 assert.deepEqual(order,['backup']);assert.equal(await updater.install(()=>order.push('duplicate')),false);
 finish();assert.equal(await install,true);assert.deepEqual(order,['backup','quit','install']);
 const failClient=new Client(),failed=new InstalledUpdater(failClient,'1.3.16',()=>{},async()=>{throw Error('disk full');});
 await failed.download('1.3.17',asset);assert.equal(await failed.install(()=>order.push('unexpected quit')),false);
 assert.equal(failClient.installs,0);assert.equal(failed.state.phase,'error');assert.equal(order.includes('unexpected quit'),false);
});
test('one update request downloads, backs up, quits and starts installation in order',async()=>{
 const client=new Client(),order=[];
 client.downloadUpdate=async()=>{order.push('download verified');return ['verified.exe'];};client.quitAndInstall=()=>order.push('installer');
 const updater=new InstalledUpdater(client,'1.3.16',()=>{},async()=>{order.push('backup verified');});
 assert.equal(await updater.update('1.3.17',asset,(v,a)=>{assert.equal(v,'1.3.17');assert.equal(a,asset);order.push('quit');}),true);
 assert.deepEqual(order,['download verified','backup verified','quit','installer']);
 const bad=new Client();bad.info={...metadata(),version:'9.0.0'};let prepared=false;
 const denied=new InstalledUpdater(bad,'1.3.16',()=>{},async()=>{prepared=true;});assert.equal(await denied.update('1.3.17',asset,()=>{throw Error('should not quit');}),false);assert.equal(prepared,false);assert.equal(bad.installs,0);
});

test('verified downloaded files are recorded before installation, and record failure blocks quit',async()=>{
 const client=new Client(),events=[];const updater=new InstalledUpdater(client,'1.3.16',()=>{},async()=>events.push('prepare'),async(files,version)=>{assert.deepEqual(files,['verified-cache/setup.exe']);assert.equal(version,'1.3.17');events.push('record');});await updater.update('1.3.17',asset,()=>events.push('quit'));assert.deepEqual(events,['record','prepare','quit']);
 const failed=new Client(),blocked=new InstalledUpdater(failed,'1.3.16',()=>{},async()=>{throw Error('must not prepare');},async()=>{throw Error('record cannot be saved');});assert.equal(await blocked.update('1.3.17',asset,()=>{throw Error('must not quit');}),false);assert.equal(failed.installs,0);assert.equal(blocked.state.phase,'error');
});
