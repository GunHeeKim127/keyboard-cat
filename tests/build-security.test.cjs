const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
test('security-patched minimatch retains legacy glob, ASAR unpack and directory filter behavior',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'keyboard-cat-build-security-'));
 try{
  const a=path.join(root,'a'),b=path.join(root,'b');await fs.mkdir(a);await fs.mkdir(b);
  for(const dir of [a,b]){await fs.writeFile(path.join(dir,'keep.txt'),'same');await fs.writeFile(path.join(dir,'skip.bin'),dir);}
  const glob=require('glob');assert.deepEqual(glob.sync('*.txt',{cwd:a}),['keep.txt']);
  const compare=require('dir-compare');assert.equal(compare.compareSync(a,b,{compareContent:true,includeFilter:'*.txt'}).same,true);
  assert.equal(compare.compareSync(a,b,{compareContent:true,excludeFilter:'*.bin'}).same,true);
  assert.equal(compare.compareSync(a,b,{compareContent:true}).same,false);
  const asar=require('@electron/asar'),archive=path.join(root,'test.asar');
  await asar.createPackageWithOptions(a,archive,{unpack:'*.txt'});
  assert.equal((await fs.readFile(archive+'.unpacked/keep.txt','utf8')),'same');
  assert.equal(asar.extractFile(archive,'skip.bin').toString(),a);
  const mm=require('minimatch');assert.equal(require('minimatch/package.json').version,'11.0.1');
  assert(mm.minimatch('src/a.ts','**/*.ts'));assert(!mm.minimatch('src/a.png','**/*.ts'));
  await fs.writeFile(path.join(a,'only.remove'),'temporary');
  await new Promise((resolve,reject)=>require('rimraf')(path.join(a,'*.remove').replace(/\\/g,'/'),e=>e?reject(e):resolve()));
  await assert.rejects(fs.stat(path.join(a,'only.remove')),{code:'ENOENT'});
  assert.equal(await fs.readFile(path.join(a,'keep.txt'),'utf8'),'same');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('cancelled build file search stops issuing directory reads after rejection',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'keyboard-cat-glob-cancel-'));
 try{
  for(let i=0;i<6;i++){await fs.mkdir(path.join(root,String(i),'child'),{recursive:true});await fs.writeFile(path.join(root,String(i),'child','file.txt'),'test');}
  const nativeFs=require('node:fs'),controller=new AbortController();let reads=0;
  const probeFs={...nativeFs,readdir(...args){reads++;if(reads===1)controller.abort(new Error('test cancellation'));return nativeFs.readdir(...args);}};
  await assert.rejects(require('glob').glob('**/*',{cwd:root,signal:controller.signal,fs:probeFs}),/test cancellation/);
  assert(reads>0);const atRejection=reads;await new Promise(r=>setTimeout(r,60));assert.equal(reads,atRejection);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
