const {test}=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const {footPhase,limbPose}=require('../scripts/walk-rig.cjs');
const gait=require('../electron/walk-gait.json');
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
test('sixteen-frame walks keep face size stable with small weight shifts and distinct consecutive feet',async()=>{
 for(const [kind,breeds]of [['dog',['chihuahua','jindo','retriever','shiba','husky']],['cat',['ragdoll','russian-blue','norwegian-forest','siamese','persian']]])for(const breed of breeds){
  const frames=[];
  for(let i=0;i<16;i++)frames.push(await sharp(`public/sprites/${kind}-${breed}-WALK-frame-${i}.png`).ensureAlpha().raw().toBuffer());
  const moments=frames.map(frame=>{let mass=0,x=0,y=0,left=100,right=-1,top=110;for(let at=0;at<70*100;at++){const a=frame[at*4+3];mass+=a;x+=at%100*a;y+=Math.floor(at/100)*a;if(a>32){left=Math.min(left,at%100);right=Math.max(right,at%100);top=Math.min(top,Math.floor(at/100));}}return {width:right-left+1,top,x:x/mass,y:y/mass};});
  assert.ok(Math.max(...moments.map(m=>m.width))-Math.min(...moments.map(m=>m.width))<=1,breed+' body grew wider');
  assert.ok(Math.max(...moments.map(m=>m.top))-Math.min(...moments.map(m=>m.top))<=1,breed+' body grew taller');
  assert.ok(Math.max(...moments.map(m=>m.x))-Math.min(...moments.map(m=>m.x))<.5,breed+' body slid sideways');
  assert.ok(Math.max(...moments.map(m=>m.y))-Math.min(...moments.map(m=>m.y))<1,breed+' body bounced');
  for(let i=0;i<16;i++){
   assert.ok(!frames[i].equals(frames[(i+1)%16]),`${breed} frozen adjacent feet`);
  }
 }
});

test('lateral walk contacts a hind paw before the fore paw on the same side, not the reversed sequence',()=>{
 const touchdown=Object.entries(gait.phases).map(([name,offset])=>({name,time:(1-offset)%1})).sort((a,b)=>a.time-b.time).map(p=>p.name);
 assert.deepEqual(touchdown,['near-front','far-hind','far-front','near-hind']);
 for(const side of ['near','far'])assert.equal((gait.phases[side+'-hind']-gait.phases[side+'-front']+1)%1,.25);
});
test('four-legged joints articulate without changing bone lengths or tilting a planted paw',()=>{
 for(const length of [18,24,30])for(const hind of [false,true])for(const far of [false,true])for(let i=0;i<160;i++){
  const p=limbPose(i/160,length,hind,far,.35*Math.sin(i/160*4*Math.PI));
  assert.ok(Math.abs(Math.hypot(p.joint.x-p.root.x,p.joint.y-p.root.y)-p.upper)<1e-8);
  assert.ok(Math.abs(Math.hypot(p.ankle.x-p.joint.x,p.ankle.y-p.joint.y)-p.lower)<1e-8);
  const cross=(p.ankle.x-p.root.x)*(p.joint.y-p.root.y)-(p.ankle.y-p.root.y)*(p.joint.x-p.root.x);
  assert.equal(Math.sign(cross),hind?-1:1);
  assert.equal(p.ankle.x,p.sole.x);
  if(p.planted)assert.equal(p.sole.y,length-(far?2:0));
 }
});
test('desktop movement matches the planted paw stroke at every size and breed pace',()=>{
 const {walkingSpeed,spriteDuration}=require('../dist-electron/pets');
 for(const size of [.75,1,1.3])for(const breed of ['ragdoll','russian-blue','norwegian-forest','siamese','persian']){
  const stroke=walkingSpeed('cat',breed,size)*spriteDuration('cat','WALK',16,5,breed)*gait.stance;
  assert.ok(Math.abs(stroke-gait.stridePixels*112*size/110)<1e-9);
 }
 assert.equal(walkingSpeed('cat','original',1),30);
});
