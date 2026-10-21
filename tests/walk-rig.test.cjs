const {test}=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const {footPhase}=require('../scripts/walk-rig.cjs');
test('walking feet plant steadily, return above ground, and join continuously across the loop',()=>{
 for(let i=0;i<1000;i++){
  const p=i/1000,a=footPhase(p),b=footPhase(p+.001);
  assert.ok(Math.abs(b.x-a.x)<.012,'paw teleported');
  assert.ok(Math.abs(b.lift-a.lift)<.012,'paw jumped vertically');
  assert.ok(a.lift>=0&&a.lift<=1);
  if(p<.625)assert.equal(a.lift,0);
  assert.ok([0,.5,.25,.75].filter(offset=>footPhase(p+offset).lift===0).length>=2,'no stable supporting feet');
 }
 assert.deepEqual(footPhase(0),footPhase(1));
});
test('sixteen-frame walks keep faces and body pixels fixed while every consecutive leg pose changes',async()=>{
 for(const [kind,breeds]of [['dog',['chihuahua','jindo','retriever','shiba','husky']],['cat',['ragdoll','russian-blue','norwegian-forest','siamese','persian']]])for(const breed of breeds){
  const frames=[];
  for(let i=0;i<16;i++)frames.push(await sharp(`public/sprites/${kind}-${breed}-WALK-frame-${i}.png`).ensureAlpha().raw().toBuffer());
  for(let i=0;i<16;i++){
   assert.ok(frames[0].subarray(0,70*100*4).equals(frames[i].subarray(0,70*100*4)),`${breed} face changed`);
   assert.ok(!frames[i].equals(frames[(i+1)%16]),`${breed} frozen adjacent feet`);
  }
 }
});
