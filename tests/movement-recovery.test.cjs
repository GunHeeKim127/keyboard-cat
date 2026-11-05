const {test}=require('node:test'),assert=require('node:assert/strict');
const {MovementRecovery,commitMovement}=require('../dist-electron/movement-recovery');
test('invalid destinations cancel the plan without calling the native setter or changing the actual location',()=>{
 const recovery=new MovementRecovery();let actual={x:-120,y:450},calls=0,cancelled=0;
 const move=(x,y)=>{calls++;actual={x,y};return true;};
 for(const point of [{x:NaN,y:2},{x:3,y:Infinity},{x:2**31,y:0}])assert.equal(commitMovement(point,move,()=>cancelled++,recovery,1000),false);
 assert.equal(calls,0);assert.equal(cancelled,3);assert.deepEqual(actual,{x:-120,y:450});assert(recovery.message);assert(!recovery.ready(1001));
 assert(commitMovement({x:actual.x+2,y:actual.y},move,()=>cancelled++,recovery,3000));assert.deepEqual(actual,{x:-118,y:450});assert.equal(recovery.message,'');assert(recovery.ready(3000));
});
test('native refusal cancels movement and retries use a capped delay',()=>{
 const r=new MovementRecovery();let cancelled=0;assert(!commitMovement({x:10,y:20},()=>false,()=>cancelled++,r,1000));assert.equal(cancelled,1);assert(!r.ready(1249));assert(r.ready(1250));
 for(let i=0;i<100;i++)r.fail(2000);assert(!r.ready(6999));assert(r.ready(7000));
});
test('movement commits normalize negative zero before reaching the native boundary',()=>{
 let calls=0;assert(commitMovement({x:-.2,y:-0},(x,y)=>{calls++;assert(!Object.is(x,-0));assert(!Object.is(y,-0));return true;},()=>assert.fail(),new MovementRecovery(),1000));assert.equal(calls,1);
});
