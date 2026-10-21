const {test}=require('node:test'),assert=require('node:assert/strict');
const {spriteDuration}=require('../dist-electron/pets.js');
const {animationState}=require('../dist-electron/view-state.js');
const {splitSilhouettes}=require('../scripts/sprite-components.cjs');
test('short dog cycles hold each pose and respect a lower user FPS',()=>{
 assert.equal(spriteDuration('dog','ATTACK',2,12),.9);
 assert.equal(spriteDuration('dog','SLEEP',2,12),2.4);
 assert.equal(spriteDuration('dog','CARRY',2,12),1.3);
 assert.equal(spriteDuration('dog','WALK',16,12),1.6);
 assert.equal(spriteDuration('dog','WALK',16,5),1.6);
 assert.equal(spriteDuration('cat','ATTACK',5,12),5/12);
});
test('dog combo phases remain visible through jump, fall, landing and both ladder directions',()=>{
 const state=(effect,age)=>animationState(false,false,false,0,1,effect,age,'dog');
 for(const [age,action]of [[0,'JUMP'],[799,'JUMP'],[800,'FALL'],[1249,'FALL'],[1250,'LAND'],[1699,'LAND']])assert.equal(state(10,age).action,action);
 for(const [age,action]of [[1399,'CLIMB_UP'],[1400,'CLIMB_DOWN'],[2799,'CLIMB_DOWN'],[2800,'LAND'],[3299,'LAND']])assert.equal(state(20,age).action,action);
 assert.equal(state(20,3300).effect,0);
 assert.equal(state(50,1799).effect,50);assert.equal(state(50,1800).effect,0);
 assert.equal(animationState(true,false,false,0,1,20,100,'dog').animate,false);
});
test('whole silhouette extraction preserves crossing poses without copying a neighboring fragment',()=>{
 const w=20,h=20,data=Buffer.alloc(w*h*4);
 const box=(x,y,width,height)=>{for(let j=y;j<y+height;j++)for(let i=x;i<x+width;i++){const at=(j*w+i)*4;data[at]=255;data[at+3]=255;}};
 box(2,2,3,10);box(12,3,3,4);box(4,14,3,4);box(12,13,3,4);
 const cells=splitSilhouettes(data,w,h,2,2,{minArea:5});
 assert.equal(cells.length,4);assert.equal(cells[0].height,10);assert.equal(cells[0].area,30);
 assert.equal(cells[2].height,4);assert.equal(cells[2].rgba.length,3*4*4);
});
