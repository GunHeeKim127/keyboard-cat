const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {CoreStore,coreSigningData,signedCore,fileHash}=require('../dist-electron/core-store');
const {InstallerGate}=require('../dist-electron/installer-gate');
function fixture(t){
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-installer-')));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const keys=crypto.generateKeyPairSync('ed25519'),pub=keys.publicKey.export({type:'spki',format:'pem'}),runtime={electron:'42.0.0',platform:'win32',arch:'x64',engineSha256:'a'.repeat(64),nativeSha256:'b'.repeat(64)};
 const store=new CoreStore(dir,'2.1.1',runtime,pub),file=path.join(dir,'Keyboard-Cat-2.1.2-setup.exe');fs.writeFileSync(file,'verified installer');
 const m={format:1,version:'2.1.2',runtime:{...runtime,electron:'43.0.0'},sha256:'c'.repeat(64),size:10,installer:{name:path.basename(file),size:fs.statSync(file).size,sha256:fileHash(file)}};
 const sign=()=>{m.signature=crypto.sign(null,coreSigningData(m),keys.privateKey).toString('base64');};sign();
 const target={version:m.version,manifest:{size:1000},archive:{size:m.size,sha256:m.sha256}};
 const gate=new InstallerGate(store,async(_,to)=>fs.writeFileSync(to,JSON.stringify(m)));
 return {gate,m,target,file,sign,pub};
}
test('full runtime installer requires independent signature despite runtime changes',async t=>{
 const f=fixture(t);assert.throws(()=>f.gate.verify([f.file],f.m.version));assert.equal(await f.gate.authorize(f.target),true);f.gate.verify([f.file],f.m.version);
 fs.writeFileSync(f.file,'tampered installer');assert.throws(()=>f.gate.verify([f.file],f.m.version));
});
test('signature binds installer name, size and digest',t=>{const f=fixture(t);for(const change of [{name:'other.exe'},{size:1},{sha256:'d'.repeat(64)}])assert.equal(signedCore({...f.m,installer:{...f.m.installer,...change}},f.pub),false);});
test('wrong release, platform, architecture and missing signatures never authorize',async t=>{
 for(const mode of ['version','platform','arch','signature','installer','archive']){
  const f=fixture(t);if(mode==='version')f.target.version='2.1.3';if(mode==='platform')f.m.runtime.platform='darwin';if(mode==='arch')f.m.runtime.arch='arm64';if(mode==='installer')delete f.m.installer;if(mode==='archive')f.target.archive.sha256='d'.repeat(64);f.sign();if(mode==='signature')f.m.signature='A'.repeat(86)+'==';assert.equal(await f.gate.authorize(f.target),false,mode);assert.throws(()=>f.gate.verify([f.file],f.m.version));
 }
});
test('authorization cannot be reused after a failed check or for other files',async t=>{
 const f=fixture(t);assert.equal(await f.gate.authorize(f.target),true);assert.throws(()=>f.gate.verify([f.file,f.file],f.m.version));assert.throws(()=>f.gate.verify([f.file],'2.1.3'));assert.equal(await f.gate.authorize(undefined),false);assert.throws(()=>f.gate.verify([f.file],f.m.version));
});
