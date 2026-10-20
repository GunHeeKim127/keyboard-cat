const {test}=require('node:test');const assert=require('node:assert/strict');const {animationState:view}=require('../dist-electron/view-state.js');
test('low power idles and sleeps without animation; pause freezes',()=>{assert.deepEqual(view(false,true,false,0,0,0,2000),{action:'IDLE',effect:0,animate:false});assert.equal(view(false,true,false,30000,0,0,2000).animate,false);assert.equal(view(true,false,false,500,50,50,1).animate,false);});
test('effects expire and walking/typing remain animated',()=>{assert.equal(view(false,true,false,100,50,50,1099).action,'ATTACK');assert.equal(view(false,true,false,4001,0,50,1100).action,'WALK');assert.equal(view(false,true,false,4001,0,0,2000).animate,true);});
test('jump proceeds through fall and land, then expires',()=>{
 for(const [age,action] of [[0,'JUMP'],[599,'JUMP'],[600,'FALL'],[949,'FALL'],[950,'LAND'],[1299,'LAND']])assert.equal(view(false,false,false,0,10,10,age).action,action);
 assert.equal(view(false,false,false,0,10,10,1300).effect,0);
});
test('ladder reverses for descent and lands before expiring',()=>{
 for(const [age,action] of [[0,'CLIMB_UP'],[799,'CLIMB_UP'],[800,'CLIMB_DOWN'],[1599,'CLIMB_DOWN'],[1600,'LAND'],[1899,'LAND']])assert.equal(view(false,false,false,0,20,20,age).action,action);
 assert.equal(view(false,false,false,0,20,20,1900).effect,0);
});
test('pause, position adjustment and negative ages suppress combo effects',()=>{
 for(const effect of [10,20,30,50]){
  assert.equal(view(true,false,false,0,20,effect,100).effect,0);
  assert.equal(view(false,false,true,0,20,effect,100).effect,0);
  assert.equal(view(false,false,false,0,20,effect,-1).effect,0);
 }
});
