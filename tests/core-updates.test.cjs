const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{EventEmitter}=require('node:events');
const {CoreStore,coreSigningData,signedCore,fileHash}=require('../dist-electron/core-store');
const {CoreUpdater}=require('../dist-electron/core-updater');
const {CoreSupervisor}=require('../dist-electron/core-supervisor');
const {parseRelease}=require('../dist-electron/updates');
function fixture(t,platform='win32'){
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-core-')));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const keys=crypto.generateKeyPairSync('ed25519'),pub=keys.publicKey.export({type:'spki',format:'pem'}),runtime={electron:'42.0.0',platform,arch:'x64',engineSha256:'a'.repeat(64),nativeSha256:'b'.repeat(64)},store=new CoreStore(dir,'2.1.1',runtime,pub);store.prepare();
 const make=(version='2.1.2',bytes=Buffer.from('archive '+version),override={})=>{const m={format:1,version,runtime:{...runtime},size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),...override};m.signature=crypto.sign(null,coreSigningData(m),keys.privateKey).toString('base64');return {m,bytes};};
 const put=f=>{fs.writeFileSync(store.file(f.m),f.bytes);return f.m;};return {dir,store,runtime,make,put,pub};
}
for(const platform of ['win32','darwin'])test(platform+' signed immutable update only becomes active after confirmation',t=>{
 const f=fixture(t,platform),a=f.put(f.make());assert.equal(f.store.active(),undefined);f.store.stage(a);assert.equal(f.store.active(),undefined);assert.deepEqual(f.store.candidate(),a);assert.deepEqual(f.store.workerCandidate(a.sha256),a);f.store.confirm(a);assert.equal(f.store.active().version,'2.1.2');
 const b=f.put(f.make('2.1.3'));f.store.stage(b);f.store.candidate();assert(fs.existsSync(f.store.file(a)));f.store.confirm(b);assert(!fs.existsSync(f.store.file(a)));assert.equal(f.store.active().version,'2.1.3');
});
test('interrupted attempts roll back once and preserve confirmed core and unrelated files',t=>{
 const f=fixture(t),a=f.put(f.make());f.store.stage(a);f.store.candidate();f.store.confirm(a);const b=f.put(f.make('2.1.3'));fs.writeFileSync(path.join(f.store.root,'unrelated.txt'),'keep');f.store.stage(b);f.store.candidate();assert.equal(f.store.candidate(),undefined);assert.equal(f.store.active().version,'2.1.2');assert(fs.existsSync(f.store.file(b)));assert.equal(f.store.failure().code,'interrupted');f.store.cancel();assert(!fs.existsSync(f.store.file(b)));assert.equal(f.store.failure().cancelled,true);assert(fs.existsSync(path.join(f.store.root,'unrelated.txt')));
});
test('tampered signature, bytes, runtime, downgrade and traversal are rejected',t=>{
 const f=fixture(t),a=f.put(f.make());for(const m of [{...a,signature:'A'.repeat(86)+'=='},{...a,version:'9.9.9'},{...a,version:'../../evil'},{...a,runtime:{...a.runtime,arch:'arm64'}}])assert.throws(()=>f.store.stage(m));
 fs.appendFileSync(f.store.file(a),'changed');assert.throws(()=>f.store.stage(a));const old=f.put(f.make('2.1.0'));assert.throws(()=>f.store.stage(old));assert.equal(signedCore(a),false);assert.equal(signedCore(a,f.pub),true);
});
test('unknown signature and linked state cannot select executable code',t=>{
 const f=fixture(t),a=f.put(f.make());fs.writeFileSync(f.store.record,JSON.stringify({active:{...a,version:'9.9.9'}}));assert.throws(()=>f.store.active());fs.unlinkSync(f.store.record);
 fs.mkdirSync(path.join(f.dir,'elsewhere'));try{fs.symlinkSync(path.join(f.dir,'elsewhere'),f.store.record,process.platform==='win32'?'junction':'file');}catch(e){if(e.code==='EPERM'){t.skip('symlink privilege unavailable');return;}throw e;}assert.throws(()=>f.store.active());
});
test('concurrent clicks coalesce; downloaded manifest and archive are verified before switching',async t=>{
 const f=fixture(t),a=f.make(),manifest=Buffer.from(JSON.stringify(a.m));let count=0,switched=0,saved=0;
 const target={version:a.m.version,manifest:{url:'manifest',size:manifest.length,sha256:crypto.createHash('sha256').update(manifest).digest('hex')},archive:{url:'archive',size:a.m.size,sha256:a.m.sha256}};
 const updater=new CoreUpdater(f.store,()=>switched++,async(asset,file,progress)=>{count++;await new Promise(r=>setTimeout(r,5));fs.writeFileSync(file,asset.url==='manifest'?manifest:a.bytes);progress?.(100);});
 const results=await Promise.all([updater.update(target,()=>saved++),updater.update(target,()=>saved++)]);assert.deepEqual(results,['applied','applied']);assert.equal(count,2);assert.equal(switched,1);assert.equal(saved,1);assert.equal(updater.state.phase,'installing');assert.equal(f.store.active(),undefined);assert(f.store.candidate());
});
test('invalid metadata/downloads never switch; a failed save cancels the staged update',async t=>{
 for(const mode of ['signature','hash','network','save']){const f=fixture(t),a=f.make();if(mode==='signature')a.m.signature='A'.repeat(86)+'==';const manifest=Buffer.from(JSON.stringify(a.m));let switched=0;
  const target={version:a.m.version,manifest:{url:'manifest',size:manifest.length,sha256:'c'.repeat(64)},archive:{url:'archive',size:a.m.size,sha256:mode==='hash'?'d'.repeat(64):a.m.sha256}};
  const updater=new CoreUpdater(f.store,()=>switched++,async(asset,file)=>{if(mode==='network')throw Error('offline');fs.writeFileSync(file,asset.url==='manifest'?manifest:a.bytes);});
  assert.equal(await updater.update(target,()=>{if(mode==='save')throw Error('disk full');}),'error');assert.equal(switched,0);assert.equal(f.store.candidate(),undefined);
 }
});
test('authenticated incompatible runtime falls back without fetching payload',async t=>{
 const f=fixture(t),a=f.make('2.1.2',undefined,{runtime:{...f.runtime,electron:'43.0.0'}});let downloads=0;const manifest=Buffer.from(JSON.stringify(a.m)),updater=new CoreUpdater(f.store,()=>assert.fail('switch'),async(_,file)=>{downloads++;fs.writeFileSync(file,manifest);});assert.equal(await updater.update({version:a.m.version,manifest:{size:manifest.length},archive:{sha256:a.m.sha256,size:a.m.size}},()=>assert.fail('save')),'fallback');assert.equal(downloads,1);
});
class Child extends EventEmitter{connected=true;killed=0;sent=[];send(m,cb){this.sent.push(m);cb?.();}kill(){this.killed++;setImmediate(()=>this.emit('exit',1));}}
test('supervisor requires screen and input readiness; failed child rolls back without loops',async t=>{
 const f=fixture(t),a=f.put(f.make());f.store.stage(a);const children=[];let stopped=0;const supervisor=new CoreSupervisor(f.store,(m,rollback)=>{const child=new Child();children.push({child,m,rollback});return child;},()=>stopped++,()=>assert.fail('error'),25);supervisor.start();
 children[0].child.emit('message',{type:'core-ready',screen:true,input:false});assert.equal(f.store.active(),undefined);await new Promise(r=>setTimeout(r,60));assert.equal(children.length,2);assert.equal(children[1].rollback,true);assert.equal(children[1].m,undefined);assert.equal(f.store.candidate(),undefined);supervisor.stop();assert.equal(children[1].child.sent[0].type,'core-quit');children[1].child.emit('exit',0);assert.equal(stopped,1);
});
test('supervisor promotes healthy child, routes activation, and leaves installer worker alone',t=>{
 const f=fixture(t),a=f.put(f.make());f.store.stage(a);const child=new Child();let done=0;const supervisor=new CoreSupervisor(f.store,()=>child,()=>done++,()=>assert.fail('error'),1000);supervisor.start();child.emit('message',{type:'core-ready',screen:true,input:true});assert.equal(f.store.active().version,'2.1.2');supervisor.activate();assert.equal(child.sent[0].type,'core-activate');child.emit('message',{type:'core-installer'});supervisor.stop();assert.equal(child.sent.length,1);assert.equal(child.killed,0);assert.equal(done,1);
});
test('release selects only exact platform assets with GitHub hashes and rejects duplicates',()=>{
 const version='2.1.2',name=`Keyboard-Cat-${version}-core-darwin-arm64`,asset=n=>({name:n,state:'uploaded',size:123,digest:'sha256:'+'a'.repeat(64),browser_download_url:`https://github.com/GunHeeKim127/keyboard-cat/releases/download/v${version}/${n}`}),r={tag_name:'v'+version,draft:false,prerelease:false,assets:[asset(name+'.json'),asset(name+'.asar')]};
 assert.equal(parseRelease(r,'darwin','arm64',false).core.version,version);assert.equal(parseRelease(r,'darwin','x64',false).core,undefined);assert.equal(parseRelease({...r,assets:[...r.assets,r.assets[0]]},'darwin','arm64',false).core,undefined);assert.equal(parseRelease({...r,assets:r.assets.map(a=>({...a,digest:undefined}))},'darwin','arm64',false).core,undefined);
});
test('failure guidance persists across reopen; retry is explicit and cancel preserves the old active version',t=>{
 const f=fixture(t),a=f.put(f.make());f.store.stage(a);f.store.candidate();f.store.reject('permission');
 const reopened=new CoreStore(f.dir,'2.1.1',f.runtime,f.pub);assert.equal(reopened.failure().code,'permission');assert.equal(reopened.active(),undefined);assert.equal(reopened.retryManifest().version,'2.1.2');
 let applied=0;const retry=new CoreUpdater(reopened,()=>applied++);assert.equal(retry.retry(()=>{}),true);assert.equal(applied,1);assert.equal(reopened.active(),undefined);reopened.candidate();reopened.reject('permission');reopened.cancel();assert.equal(reopened.failure().cancelled,true);assert.equal(reopened.active(),undefined);assert(!fs.existsSync(reopened.file(a)));
 const {coreFailureInfo}=require('../dist-electron/core-failure');const info=coreFailureInfo(reopened.failure(),'darwin');assert(info.guidance.includes('입력 모니터링'));assert(!JSON.stringify(info).includes('sha256'));
});
test('a newer full installation never starts an older pending core',t=>{
 const f=fixture(t),a=f.put(f.make());f.store.stage(a);const newer=new CoreStore(f.dir,'3.0.0',f.runtime,f.pub);assert.equal(newer.candidate(),undefined);assert.equal(newer.active(),undefined);
});
test('damaged active core and corrupt journal fall back to built-in without deleting unknown bytes',t=>{
 const f=fixture(t),a=f.put(f.make());f.store.stage(a);f.store.candidate();f.store.confirm(a);fs.appendFileSync(f.store.file(a),'tampered');f.store.recoverActive();assert.equal(f.store.active(),undefined);assert.equal(f.store.failure().code,'verification');assert(fs.existsSync(f.store.file(a)));fs.writeFileSync(f.store.record,'{broken');f.store.recoverActive();assert.equal(f.store.active(),undefined);assert(fs.readdirSync(f.store.root).some(n=>n.startsWith('state.json.invalid-')));
});
test('confirmed successful new version clears persisted failure and cancellation state',t=>{
 const f=fixture(t),a=f.put(f.make());f.store.stage(a);f.store.candidate();f.store.reject('permission');f.store.cancel();assert.equal(f.store.failure().cancelled,true);
 const b=f.put(f.make('2.1.3'));f.store.stage(b);f.store.candidate();assert.equal(f.store.failure().cancelled,true);f.store.confirm(b);assert.equal(f.store.failure(),undefined);const reopened=new CoreStore(f.dir,'2.1.1',f.runtime,f.pub);assert.equal(reopened.failure(),undefined);assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(reopened.record,'utf8'))),['active']);
});
