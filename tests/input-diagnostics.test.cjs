const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {findMacCopies,macLaunchLocation,runningMacCopies,macLeftovers}=require('../dist-electron/input-diagnostics.js');
test('copy discovery finds only named apps in explicit roots, without deleting settings or searching subfolders',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cat-copies-')),home=path.join(root,'home'),apps=path.join(root,'Applications'),volumes=path.join(root,'Volumes');
 const make=p=>{fs.mkdirSync(path.join(p,'Contents'),{recursive:true});fs.writeFileSync(path.join(p,'Contents','Info.plist'),'fixture');return fs.realpathSync(p);};
 try{
  const expected=[make(path.join(apps,'Keyboard Cat.app')),make(path.join(home,'Downloads','Keyboard Cat 1.3.4.app')),make(path.join(volumes,'Cat DMG','Keyboard Cat.app'))].sort();
  make(path.join(apps,'Unrelated.app'));make(path.join(home,'Downloads','nested','Keyboard Cat.app'));
  fs.mkdirSync(path.join(home,'Desktop','Keyboard Cat.app'),{recursive:true});
  const settings=path.join(home,'settings.json');fs.writeFileSync(settings,'KEEP');
  assert.deepEqual(findMacCopies(home,apps,volumes),expected);assert.equal(fs.readFileSync(settings,'utf8'),'KEEP');
  assert.deepEqual(findMacCopies(path.join(root,'missing'),path.join(root,'missing'),path.join(root,'missing')),[]);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('process diagnostics retain only this app and helper executable names, without command arguments',()=>{
 assert.deepEqual(runningMacCopies(()=>` 12 /Applications/Keyboard Cat.app/Contents/MacOS/Keyboard Cat\n 13 /Volumes/Old/Keyboard Cat.app/Contents/Resources/KeyCounter-mac\n 14 /Applications/Unrelated.app/Contents/MacOS/Other\n 15 /bin/sh private text\n`),['12 /Applications/Keyboard Cat.app/Contents/MacOS/Keyboard Cat','13 /Volumes/Old/Keyboard Cat.app/Contents/Resources/KeyCounter-mac']);
 assert.deepEqual(runningMacCopies(()=>{throw Error('denied');}),['프로세스 목록 확인 불가']);
});
test('leftover checks report existing app-specific folders and preserve all contents',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cat-leftovers-')),userData=path.join(root,'Library','Application Support','Keyboard Cat');
 try{fs.mkdirSync(userData,{recursive:true});const settings=path.join(userData,'settings.json');fs.writeFileSync(settings,'KEEP');assert.deepEqual(macLeftovers(root,userData),[userData]);assert.equal(fs.readFileSync(settings,'utf8'),'KEEP');}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('launch classification distinguishes mounted apps, translocation and installed copies',()=>{
 assert.equal(macLaunchLocation('/Volumes/Cat/Keyboard Cat.app/Contents/MacOS/Keyboard Cat'),'마운트된 디스크/DMG');
 assert.equal(macLaunchLocation('/private/var/folders/x/AppTranslocation/y/d/Keyboard Cat.app/Contents/MacOS/Keyboard Cat'),'앱 임시 격리 위치(AppTranslocation)');
 assert.equal(macLaunchLocation('/Applications/Keyboard Cat.app/Contents/MacOS/Keyboard Cat'),'응용 프로그램');
 assert.match(macLaunchLocation('/Users/test/Downloads/Keyboard Cat.app/Contents/MacOS/Keyboard Cat'),/기타/);
});
