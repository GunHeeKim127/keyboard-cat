const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {UpdateRecovery,isBundlePath}=require('../dist-electron/update-recovery');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-recovery-test-')),source=path.join(root,'installed'),data=path.join(root,'data');
 for(const dir of [source,data,path.join(source,'resources'),path.join(source,'locales'),path.join(source,'personal')])fs.mkdirSync(dir,{recursive:true});
 for(const [name,body]of [['Keyboard Cat.exe','old executable'],['resources/app.asar','old resources'],['resources/app-update.yml','fixed feed'],['locales/en-US.pak','locale'],['Uninstall Keyboard Cat.exe','uninstaller'],['personal/notes.txt','personal'],['notes.txt','user file']])fs.writeFileSync(path.join(source,name),body);
 fs.writeFileSync(path.join(data,'settings.json'),'keep settings');
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const recovery=new UpdateRecovery(data),ids=()=>fs.readdirSync(recovery.root).filter(n=>!n.startsWith('.'));
 return {root,source,data,recovery,ids};
}
test('application backup preserves current files and waits for the matching newer installed app',async t=>{
 const {source,data,recovery,ids}=fixture(t);await recovery.prepare(source,'1.3.17','1.3.18');
 const id=ids()[0],backup=path.join(recovery.root,id,'app');
 assert.equal(fs.readFileSync(path.join(backup,'Keyboard Cat.exe'),'utf8'),'old executable');
 for(const name of ['notes.txt','personal','Uninstall Keyboard Cat.exe'])assert.equal(fs.existsSync(path.join(backup,name)),false);
 assert.deepEqual(await recovery.confirm('1.3.17',source),{removed:0,retained:1});
 assert.deepEqual(await recovery.confirm('1.3.18',data),{removed:0,retained:1});
 assert.equal(fs.existsSync(backup),true);
 assert.deepEqual(await recovery.confirm('1.3.18',source),{removed:1,retained:0});
 assert.equal(fs.existsSync(path.join(recovery.root,id)),false);
 assert.equal(fs.readFileSync(path.join(source,'Keyboard Cat.exe'),'utf8'),'old executable');
 assert.equal(fs.readFileSync(path.join(data,'settings.json'),'utf8'),'keep settings');
});
test('retry reuses the verified snapshot; damaged or untracked backup content is retained',async t=>{
 const {source,recovery,ids}=fixture(t);await recovery.prepare(source,'1.3.17','1.3.18');
 const id=ids()[0];await recovery.prepare(source,'1.3.17','1.3.19');assert.deepEqual(ids(),[id]);
 assert.deepEqual(await recovery.confirm('1.3.18',source),{removed:0,retained:1});
 fs.writeFileSync(path.join(recovery.root,id,'app','notes.txt'),'do not delete');
 assert.deepEqual(await recovery.confirm('1.3.19',source),{removed:0,retained:1});
 assert.equal(fs.existsSync(path.join(recovery.root,id,'app','Keyboard Cat.exe')),true);
 await assert.rejects(recovery.prepare(source,'1.3.17','1.3.20'));
});
test('corrupt snapshots and traversal records cannot delete files',async t=>{
 const {source,data,recovery,ids}=fixture(t);await recovery.prepare(source,'1.3.17','1.3.18');
 const id=ids()[0],app=path.join(recovery.root,id,'app');fs.writeFileSync(path.join(app,'Keyboard Cat.exe'),'changed');
 assert.deepEqual(await recovery.confirm('1.3.18',source),{removed:0,retained:1});
 const record=path.join(recovery.root,id,'record.json'),r=JSON.parse(fs.readFileSync(record));r.files[0].name='../../settings.json';fs.writeFileSync(record,JSON.stringify(r));
 assert.deepEqual(await recovery.confirm('1.3.18',source),{removed:0,retained:1});assert.equal(fs.readFileSync(path.join(data,'settings.json'),'utf8'),'keep settings');
 for(const name of ['../Keyboard Cat.exe','/Keyboard Cat.exe','C:/Keyboard Cat.exe','resources/../../settings.json','resources\\app.asar','locales/../x.pak'])assert.equal(isBundlePath(name),false,name);
});
test('linked recovery roots and linked application resources fail without touching the outside directory',async t=>{
 const {root,source,data}=fixture(t),outside=path.join(root,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'keep.txt'),'outside');
 fs.symlinkSync(outside,path.join(data,'update-recovery'),process.platform==='win32'?'junction':'dir');
 await assert.rejects(new UpdateRecovery(data).prepare(source,'1.3.17','1.3.18'));
 fs.renameSync(path.join(source,'resources'),path.join(source,'saved-resources'));fs.symlinkSync(outside,path.join(source,'resources'),process.platform==='win32'?'junction':'dir');
 const another=path.join(root,'other-data');fs.mkdirSync(another);await assert.rejects(new UpdateRecovery(another).prepare(source,'1.3.17','1.3.18'));
 assert.equal(fs.readFileSync(path.join(outside,'keep.txt'),'utf8'),'outside');
});
test('cleanup can finish after interruption without reading or deleting user settings',async t=>{
 const {source,recovery,ids}=fixture(t);await recovery.prepare(source,'1.3.17','1.3.18');const id=ids()[0];
 fs.rmSync(path.join(recovery.root,id,'app'),{recursive:true});
 assert.deepEqual(await recovery.confirm('1.3.18',source),{removed:1,retained:0});
});
