const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),sharp=require('sharp'),crypto=require('node:crypto');
const corrections=require('./fixtures/parrot-sleep-v2.json');
test('only four approved sleep poses and their three atlases changed; all other 681 PNGs stay intact',()=>{
 const allowed=['parrot-lovebird-SLEEP-atlas.png','parrot-lovebird-SLEEP-frame-3.png','parrot-macaw-SLEEP-atlas.png','parrot-macaw-SLEEP-frame-2.png','parrot-macaw-SLEEP-frame-3.png','parrot-parrotlet-SLEEP-atlas.png','parrot-parrotlet-SLEEP-frame-2.png'].map(f=>'public/sprites/'+f).sort();assert.deepEqual(Object.keys(corrections).sort(),allowed);
 const baseline={...require('./fixtures/legacy-sprites-1.3.17.json'),...require('./fixtures/parrot-sprites-1.3.18.json')};assert.equal(Object.keys(baseline).length,688);let unchanged=0;
 for(const [file,old]of Object.entries(baseline)){const b=fs.readFileSync(file),actual=crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');assert.equal(actual,corrections[file]??old,file);if(!corrections[file])unchanged++;else assert.notEqual(actual,old,file);}assert.equal(unchanged,681);
});
test('corrected sleep poses retain the reference height and foot baseline',async()=>{
 async function bounds(file){const {data}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let top=110,bottom=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++)if(data[(y*100+x)*4+3]>64){top=Math.min(top,y);bottom=Math.max(bottom,y);}return {height:bottom-top+1,bottom};}
 for(const [breed,frames]of [['macaw',[2,3]],['parrotlet',[2]],['lovebird',[3]]]){const reference=await bounds(`public/sprites/parrot-${breed}-SLEEP-frame-0.png`);for(const i of frames){const corrected=await bounds(`public/sprites/parrot-${breed}-SLEEP-frame-${i}.png`);assert.ok(Math.abs(corrected.height-reference.height)<=2,breed+' size');assert.equal(corrected.bottom,reference.bottom,breed+' baseline');}}
});
