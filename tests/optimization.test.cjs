const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');const {digest,readCache,cacheEntry,cacheMatches}=require('../scripts/asset-cache.cjs');
test('asset cache detects changed bytes, missing files and a changed generation key',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-cache-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'frame.png');fs.writeFileSync(file,'first');const entry=cacheEntry('source-v1',[file]);assert.equal(cacheMatches(entry,'source-v1',[file]),true);assert.equal(cacheMatches(entry,'source-v2',[file]),false);fs.writeFileSync(file,'other');assert.equal(cacheMatches(entry,'source-v1',[file]),false);fs.unlinkSync(file);assert.equal(cacheMatches(entry,'source-v1',[file]),false);assert.equal(cacheMatches({key:'source-v1'},'source-v1',[file]),false);
});
test('corrupt and oversized build caches safely rebuild',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-cache-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'cache.json');for(const value of ['{','null','[]','x'.repeat(65537)]){fs.writeFileSync(file,value);assert.deepEqual(readCache(file),{});}fs.writeFileSync(file,'{"cockatoo":{"key":"ok"}}');assert.equal(readCache(file).cockatoo.key,'ok');assert.equal(digest(Buffer.from('same')),digest(Buffer.from('same')));
});
test('optimization preserves parrot PNGs outside the four reviewed sleep corrections',()=>{
 const entries=Object.entries(require('./fixtures/parrot-sprites-1.3.18.json'));assert.equal(entries.length,245);for(const [file,expected]of entries){if(require('./fixtures/parrot-sleep-v2.json')[file])continue;const bytes=fs.readFileSync(file),hash=require('node:crypto').createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');assert.equal(hash,expected,file);}
});
