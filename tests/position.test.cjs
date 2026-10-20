const {test}=require('node:test'),assert=require('node:assert/strict');const {carryPosition,dropPosition,petRect,facingForDelta}=require('../dist-electron/position.js');
for(const size of [.75,1,1.3])test(`release preserves visible position at size ${size}`,()=>{const p={x:800,y:450},a={x:0,y:0,width:1920,height:1080},c=carryPosition(p,size),d=dropPosition(p,size,a),r=petRect(size);assert.ok(Math.abs(c.y+80-(d.y+r.y))<=1);assert.equal(c.x,d.x);});
test('edge constraint uses cat rectangle, including negative-coordinate monitor',()=>{const a={x:-1920,y:-200,width:1920,height:1080},r=petRect(1),d=dropPosition({x:-1910,y:-190},1,a);assert.ok(d.x+r.x>=a.x-1);assert.ok(d.y+r.y>=a.y-1);assert.ok(d.x<a.x);});
test('facing changes with movement and ignores jitter',()=>{assert.equal(facingForDelta(1,-5),-1);assert.equal(facingForDelta(-1,6),1);assert.equal(facingForDelta(-1,1),-1);});
test('native coordinates round fractions and reject invalid values without coercion',()=>{
 const {nativePosition}=require('../dist-electron/position.js');
 assert.deepEqual(nativePosition(-1910.4,353.2),{x:-1910,y:353});
 for(const value of [NaN,Infinity,-Infinity,undefined,null,'450',{},2147483648,-2147483649]){
  assert.equal(nativePosition(640,value),undefined);assert.equal(nativePosition(value,450),undefined);
 }
 assert.deepEqual(nativePosition(-2147483648,2147483647),{x:-2147483648,y:2147483647});
});
test('carry and drop coordinates stay native integers for all sizes and monitor edges',()=>{
 for(const size of [.75,1,1.3])for(const p of [{x:800,y:450},{x:-1910,y:-190},{x:1919,y:1079}]){
  for(const pos of [carryPosition(p,size),dropPosition(p,size,{x:-1920,y:-200,width:1920,height:1080})]){
   assert.ok(Number.isInteger(pos.x));assert.ok(Number.isInteger(pos.y));
  }
 }
});
test('single-monitor bounds contain the visible cat while resting and carried',()=>{
 const {limitToArea}=require('../dist-electron/position.js');
 for(const area of [{x:0,y:0,width:1920,height:1080},{x:-1280,y:-200,width:1280,height:1024}])for(const size of [.75,1,1.3])for(const carried of [false,true])for(const point of [{x:-4000,y:-4000},{x:4000,y:4000}]){
  const p=limitToArea(point,size,area,carried),r=petRect(size),top=carried?80:r.y;
  assert.ok(p.x+r.x>=area.x);assert.ok(p.x+r.x+r.width<=area.x+area.width);
  assert.ok(p.y+top>=area.y);assert.ok(p.y+top+r.height<=area.y+area.height);
  assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y));
 }
});
test('single-monitor bounds keep existing positions and handle undersized areas',()=>{
 const {limitToArea}=require('../dist-electron/position.js');
 assert.deepEqual(limitToArea({x:400,y:400},1,{x:0,y:0,width:1920,height:1080}),{x:400,y:400});
 const p=limitToArea({x:400,y:400},1.3,{x:0,y:0,width:40,height:40});assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y));
});
