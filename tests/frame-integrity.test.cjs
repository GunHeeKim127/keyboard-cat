const test=require('node:test'),assert=require('node:assert/strict'),verify=require('../scripts/verify-frame-manifest.cjs');
test('release frame integrity rejects changed, missing, extra and stale images',()=>{
 const revision='a'.repeat(64),hash='b'.repeat(64),files=['frame-0.png','frame-1.png'];
 const valid={format:1,sourceRevision:revision,frames:Object.fromEntries(files.map(f=>[f,hash]))};
 assert.doesNotThrow(()=>verify(valid,revision,files,()=>hash));
 assert.throws(()=>verify(valid,revision,files,()=> 'c'.repeat(64)),/Unapproved/);
 assert.throws(()=>verify(valid,'d'.repeat(64),files,()=>hash),/sources changed/);
 for(const frames of [{},{'frame-0.png':hash},{...valid.frames,'extra.png':hash},{'frame-0.png':hash,'other.png':hash}])assert.throws(()=>verify({...valid,frames},revision,files,()=>hash));
});
