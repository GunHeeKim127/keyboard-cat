const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {runtimeSprites,prune}=require('../scripts/prune-runtime-sprites.cjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-sprites-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));for(const name of runtimeSprites())fs.writeFileSync(path.join(root,name),'required');return root;}
test('runtime inventory keeps original cat atlases, tray, carry and all selectable pet frames',()=>{
 const required=runtimeSprites();assert.equal(required.size,731);for(const name of ['IDLE-0.png','IDLE-atlas.png','CLIMB-atlas.png','carry.png','monkey-loris-WALK-frame-15.png','dog-husky-CARRY-frame-1.png','cat-siamese-WALK-frame-7.png','parrot-macaw-FLY-frame-3.png'])assert.ok(required.has(name),name);
 for(const name of required)assert.ok(fs.statSync(path.join('public/sprites',name)).isFile(),name);
});
test('pruning removes only unused build copies and preserves unknown images and every required byte',t=>{
 const root=fixture(t);for(const name of ['source.png','carry-source.png','WALK-2.png','dog-husky-WALK-atlas.png','monkey-loris-WALK-atlas.png'])fs.writeFileSync(path.join(root,name),'unused');fs.writeFileSync(path.join(root,'future-prop.png'),'keep');const r=prune(root);assert.equal(r.removed.length,5);assert.equal(r.bytes,30);assert.equal(fs.readFileSync(path.join(root,'future-prop.png'),'utf8'),'keep');for(const name of runtimeSprites())assert.equal(fs.readFileSync(path.join(root,name),'utf8'),'required');
});
test('an incomplete runtime inventory aborts pruning before any file is deleted',t=>{
 const root=fixture(t);fs.unlinkSync(path.join(root,'carry.png'));fs.writeFileSync(path.join(root,'source.png'),'keep');assert.throws(()=>prune(root));assert.equal(fs.readFileSync(path.join(root,'source.png'),'utf8'),'keep');
});
