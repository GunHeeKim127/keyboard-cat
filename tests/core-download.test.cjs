const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),https=require('node:https'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream'),{createHash}=require('node:crypto');
const {downloadCore}=require('../dist-electron/core-download');
const url='https://github.com/GunHeeKim127/keyboard-cat/releases/download/v2.1.2/Keyboard-Cat-2.1.2-core-win32-x64.asar';
test('bounded download verifies bytes and hash; redirects, truncation and collisions fail safely',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-stream-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const original=https.get;t.after(()=>https.get=original);
 const bytes=Buffer.from('verified core bytes'),asset={url,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};let mode='ok',requests=0;
 https.get=(location,_,callback)=>{requests++;const request=new EventEmitter();request.destroy=()=>{};queueMicrotask(()=>{const r=new PassThrough();r.statusCode=200;r.headers={};if(mode==='foreign'){r.statusCode=302;r.headers.location='https://evil.example/core.asar';}if(mode==='loop'){r.statusCode=302;r.headers.location=url;}callback(r);if(r.statusCode===200)r.end(mode==='truncated'?bytes.subarray(0,4):mode==='oversized'?Buffer.concat([bytes,bytes]):bytes);else r.end();});return request;};
 const good=path.join(root,'good');await downloadCore(asset,good);assert.deepEqual(fs.readFileSync(good),bytes);
 for(mode of ['foreign','loop','truncated','oversized']){const file=path.join(root,mode);await assert.rejects(downloadCore(asset,file));assert(!fs.existsSync(file));}
 mode='ok';const bad=path.join(root,'bad');await assert.rejects(downloadCore({...asset,sha256:'a'.repeat(64)},bad));assert(!fs.existsSync(bad));
 const before=requests;await assert.rejects(downloadCore({...asset,url:'file:///tmp/core'},path.join(root,'forbidden')));assert.equal(requests,before);
 const existing=path.join(root,'existing');fs.writeFileSync(existing,'keep');await assert.rejects(downloadCore(asset,existing));assert.equal(fs.readFileSync(existing,'utf8'),'keep');
});
