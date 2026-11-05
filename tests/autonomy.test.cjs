const {test}=require('node:test'),assert=require('node:assert/strict');
const {AutonomousTiming,randomDuration}=require('../dist-electron/autonomy');
test('idle thresholds are sampled once per input burst, never on each movement tick',()=>{
 let calls=0;const t=new AutonomousTiming(()=>{calls++;return .25;});assert.equal(t.walkAfter,4000);assert.equal(t.sleepAfter,30000);t.activity(1000);const sampled=calls;for(let n=1001;n<1500;n++){t.activity(n);assert.equal(t.idleFor(5000),5000);}assert.equal(calls,sampled);t.activity(4000);assert.equal(calls,sampled+2);
 assert.equal(randomDuration(100,200,()=>NaN),150);assert.equal(randomDuration(100,200,()=>-1),100);assert.equal(randomDuration(100,200,()=>2),200);
});
test('first keyboard input overrides environmental motion before a milestone combo',()=>{
 const {motionVisual}=require('../dist-electron/view-state');const input={action:'ATTACK',animate:true,effect:0};for(const action of ['FALL_GROUND','EDGE_CLIMB','ICON_HOP'])assert.equal(motionVisual(input,false,false,true,action,true,true),input);
});
test('surface motion uses all four approved branch-free monkey and flying parrot poses',()=>{
 const {surfaceFrame,surfacePose}=require('../dist-electron/surface-visual');assert.deepEqual([.18,.34,.5,.66].map(surfaceFrame),[0,1,2,3]);for(let frame=0;frame<4;frame++){assert.deepEqual(surfacePose('monkey',false,frame),{interaction:'FALL_GROUND',frame});assert.deepEqual(surfacePose('parrot',true,frame),{action:'FLY',frame});}assert.equal(surfacePose('parrot',false,1),undefined);assert.equal(surfacePose('cat',true,1),undefined);
});
