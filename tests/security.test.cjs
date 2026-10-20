const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {isAppDocument,isAppResource,isTrustedFrame,readSettings}=require('../dist-electron/security.js');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'cat security '));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));for(const dir of ['assets','sprites'])fs.mkdirSync(path.join(root,dir));for(const file of ['index.html','assets/app.js','assets/app.css','sprites/cat.png','secret.json','assets/evil.html'])fs.writeFileSync(path.join(root,file),'fixture');return root;}
test('only the bundled document and controller query are IPC documents',t=>{
 const root=fixture(t),file=path.join(root,'index.html'),url=pathToFileURL(file).href;
 assert.ok(isAppDocument(url,file));assert.ok(isAppDocument(url+'?panel=1',file));
 for(const value of ['https://example.com/index.html','data:text/html,hello','about:blank',url+'?panel=evil',url+'#other',pathToFileURL(path.join(root,'assets/evil.html')).href])assert.equal(isAppDocument(value,file),false);
});
test('IPC rejects subframes, missing frames and a navigated main frame',t=>{
 const root=fixture(t),file=path.join(root,'index.html'),main={url:pathToFileURL(file).href},sender={mainFrame:main};
 assert.ok(isTrustedFrame(sender,main,file));assert.equal(isTrustedFrame(sender,{...main},file),false);assert.equal(isTrustedFrame(sender,null,file),false);
 main.url='https://example.com';assert.equal(isTrustedFrame(sender,main,file),false);
});
test('resource requests allow app assets and reject external/local unrelated files',t=>{
 const root=fixture(t);for(const file of ['index.html','assets/app.js','assets/app.css','sprites/cat.png'])assert.ok(isAppResource(pathToFileURL(path.join(root,file)).href,root));
 for(const url of ['https://example.com/a.js','data:image/png;base64,AAAA','file://server/share/a.js',pathToFileURL(path.join(root,'secret.json')).href,pathToFileURL(path.join(root,'assets/evil.html')).href,pathToFileURL(path.join(root,'../secret.json')).href])assert.equal(isAppResource(url,root),false);
});
test('oversized, malformed and non-object settings safely fall back',t=>{
 const root=fixture(t),file=path.join(root,'settings.json');assert.deepEqual(readSettings(file),{});
 for(const data of ['null','[]','42','"x"','{',' '.repeat(65537)]){fs.writeFileSync(file,data);assert.deepEqual(readSettings(file),{});}
 fs.writeFileSync(file,JSON.stringify({x:20,y:30,options:{avatarName:'나비'}}));assert.deepEqual(readSettings(file),{x:20,y:30,options:{avatarName:'나비'}});
});
test('option payloads reject inherited keys and excessive names without prototype pollution',()=>{
 const {presets,updateOptions}=require('../dist-electron/options.js');
 assert.equal(updateOptions(presets.low,Object.create({effects:true})),presets.low);
 assert.equal(updateOptions(presets.low,[]),presets.low);
 const result=updateOptions(presets.low,JSON.parse('{"__proto__":{"polluted":true},"avatarName":"<img src=x onerror=alert(1)>","size":1e100}'));
 assert.equal({}.polluted,undefined);assert.equal(result.size,.75);
 assert.equal(updateOptions(presets.low,{avatarName:'x'.repeat(257)}).avatarName,presets.low.avatarName);
});
