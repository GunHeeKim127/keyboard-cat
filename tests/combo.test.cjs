const {test}=require('node:test');const assert=require('node:assert/strict');const {Combo}=require('../dist-electron/combo.js');
test('threshold crossings fire exactly once, including batched keydowns',()=>{const c=new Combo();assert.deepEqual(c.hit(2000,9),[]);assert.deepEqual(c.hit(2025,1),[10]);assert.deepEqual(c.hit(2050,42),[20,30,20,50]);assert.deepEqual(c.hit(2075),[]);});
test('1500ms timeout resets before next input',()=>{const c=new Combo();c.hit(2000,30);assert.equal(c.expire(3499),false);assert.equal(c.expire(3500),true);assert.equal(c.count,0);c.hit(4000,9);assert.deepEqual(c.hit(5500),[]);assert.equal(c.count,1);});
test('pause reset clears combo history',()=>{const c=new Combo();c.hit(2000,50);c.reset();assert.equal(c.count,0);assert.deepEqual(c.hit(2025),[]);});
test('ladder threshold fires once and can fire again after combo timeout',()=>{
 const c=new Combo();c.hit(2000,19);assert.deepEqual(c.hit(2050),[20]);assert.deepEqual(c.hit(2100),[]);
 assert.deepEqual(c.hit(4000,20),[10,20]);
});
test('multiples repeat with attack, dash, ladder, jump precedence',()=>{
 const c=new Combo(),expected=[10,20,30,20,50,30,10,20,30,50,10,30,10,20,50];
 for(let i=0;i<expected.length;i++)assert.deepEqual(c.hit(2000+i*50,10),[expected[i]],`milestone ${(i+1)*10}`);
});
test('batches crossing repeated milestones return effects in time order',()=>{
 const c=new Combo();c.hit(2000,95);
 assert.deepEqual(c.hit(2050,30),[50,10,30]);
 assert.deepEqual(c.hit(2100),[]);
 c.expire(3600);assert.deepEqual(c.hit(3650,10),[10]);
});
