const test=require('node:test'),assert=require('node:assert/strict');
const {PeriodicUpdateCheck,UPDATE_CHECK_INTERVAL,updateBadgeBitmap}=require('../dist-electron/update-notice');
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
function harness(check){let now=1000,changed=0;const scheduled=new Map();let serial=0;const p=new PeriodicUpdateCheck(check,()=>changed++,()=>now,(fn,delay)=>{const timer={id:++serial,unref(){}};scheduled.set(timer,{fn,delay});return timer;},timer=>scheduled.delete(timer));return {p,scheduled,get changed(){return changed;},advance:n=>now+=n,run:async()=>{const [id,v]=scheduled.entries().next().value;scheduled.delete(id);v.fn();await flush();}};}
test('automatic update notice uses one sleeping timer, six-hour checks and preserves resume timing',async()=>{
 let requests=0;const h=harness(async()=>requests++);assert.equal(requests,0);h.p.start();h.p.start();assert.equal(h.scheduled.size,1);assert.equal([...h.scheduled.values()][0].delay,15000);await h.run();assert.equal(requests,1);assert.equal(h.changed,1);assert.equal([...h.scheduled.values()][0].delay,UPDATE_CHECK_INTERVAL);h.p.stop();assert.equal(h.scheduled.size,0);h.advance(60000);h.p.start();assert.equal([...h.scheduled.values()][0].delay,UPDATE_CHECK_INTERVAL-60000);h.p.stop();
});
test('offline update checks never busy-loop and stop prevents late notices',async()=>{
 const offline=harness(async()=>{throw Error('offline');});offline.p.start();await offline.run();assert.equal(offline.changed,0);assert.equal([...offline.scheduled.values()][0].delay,UPDATE_CHECK_INTERVAL);offline.p.stop();
 let finish;const h=harness(()=>new Promise(resolve=>finish=resolve));h.p.start();const running=h.run();h.p.stop();finish();await running;await flush();assert.equal(h.changed,0);assert.equal(h.scheduled.size,0);
});
test('tray notice only changes a tiny upper-right region and does not mutate the base icon',()=>{
 const base=Buffer.alloc(32*32*4),badge=updateBadgeBitmap(base,32,32);assert(base.every(v=>v===0));assert(badge.some(v=>v!==0));for(let y=12;y<32;y++)for(let x=0;x<32;x++)assert.equal(badge[(y*32+x)*4+3],0);assert.throws(()=>updateBadgeBitmap(Buffer.alloc(1),32,32));
});
