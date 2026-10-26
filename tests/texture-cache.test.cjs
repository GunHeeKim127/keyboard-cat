const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function cache(){let decodes=0;class Image{isConnected=false;src='';decode(){decodes++;return this.src.includes('bad')?Promise.reject(Error('bad image')):Promise.resolve();}}const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/sprite-textures.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Image});return {...exports,decodes:()=>decodes};}
test('decoded texture LRU bounds old breeds while keeping visible frames and recent cycles',async()=>{
 const c=cache(),url=i=>`./sprites/test-${i}.png`,visible=await c.loadFrame(url(0));visible.isConnected=true;
 for(let i=1;i<400;i++)await c.loadFrame(url(i));const before=c.decodes();assert.equal(await c.loadFrame(url(0)),visible);await c.loadFrame(url(399));assert.equal(c.decodes(),before);
 await c.loadFrame(url(1));assert.equal(c.decodes(),before+1);
 for(let i=0;i<32;i++)await c.loadFrame(url(380+i%20));assert.equal(c.decodes(),before+1);
});
test('texture requests deduplicate pending work, retry failures and reject external paths',async()=>{
 const c=cache(),a=c.loadFrame('./sprites/IDLE-atlas.png');assert.equal(a,c.loadFrame('./sprites/IDLE-atlas.png'));await a;assert.equal(c.decodes(),1);
 for(let i=0;i<2;i++)await assert.rejects(c.loadFrame('./sprites/bad.png'));assert.equal(c.decodes(),3);
 for(const url of ['https://evil.test/image.png','file:///secret','./sprites/../../secret.png','./sprites/x.svg'])await assert.rejects(c.loadFrame(url));assert.equal(c.decodes(),3);
});
