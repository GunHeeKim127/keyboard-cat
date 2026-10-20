const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {InputMonitor}=require('../dist-electron/input-monitor.js');
function fixture(t,platform='darwin'){
 t.mock.timers.enable({apis:['setTimeout']});const children=[],prompts=[],counts=[],states=[];
 const monitor=new InputMonitor(platform,prompt=>{const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{child.killed=true;return true;};children.push(child);prompts.push(prompt);return child;},n=>counts.push(n),s=>states.push(s));
 t.after(()=>monitor.stop());return {monitor,children,prompts,counts,states};
}
test('permission denial recovers with a fresh process without repeated prompts',t=>{
 const f=fixture(t);f.monitor.start();assert.equal(f.monitor.status,'starting');
 f.children[0].stderr.write('PERMISSION_REQUIRED\n');f.children[0].emit('exit',77);
 assert.equal(f.monitor.status,'permission');t.mock.timers.tick(5000);
 assert.deepEqual(f.prompts,[true,false]);f.children[1].stderr.write('INPUT_READY\n');f.children[1].stdout.write('12\n');
 assert.equal(f.monitor.status,'ready');assert.deepEqual(f.counts,[12]);
});
test('readiness is required and invalid/stale output never changes the combo',t=>{
 const f=fixture(t);f.monitor.start();const old=f.children[0];
 old.stdout.write('0\n1001\n-1\nhello\n');assert.deepEqual(f.counts,[]);assert.equal(f.monitor.status,'starting');
 old.stderr.write('INPUT_READY\n');f.monitor.stop();old.stdout.write('42\n');old.emit('exit',77);t.mock.timers.tick(5000);
 assert.equal(f.children.length,1);assert.deepEqual(f.counts,[]);assert.equal(f.monitor.status,'stopped');
});
test('pause/quit cancels a pending retry and a missing ready signal times out',t=>{
 const f=fixture(t);f.monitor.start();f.children[0].emit('exit',77);f.monitor.stop();t.mock.timers.tick(5000);assert.equal(f.children.length,1);
 f.monitor.start();t.mock.timers.tick(30000);assert.ok(f.children[1].killed);assert.equal(f.monitor.status,'error');
});
test('Windows handshake and count-only compatibility remain supported',t=>{
 const f=fixture(t,'win32');f.monitor.start();f.children[0].stderr.write('RAW_INPUT_READY\n');f.children[0].stdout.write('5\n');assert.equal(f.monitor.status,'ready');assert.deepEqual(f.counts,[5]);
 f.children[0].emit('exit',77);t.mock.timers.tick(5000);assert.equal(f.children.length,1);
});
test('an interrupted macOS helper and unavailable tap retry but spawn errors do not loop',t=>{
 const f=fixture(t);f.monitor.start();f.children[0].emit('exit',null,'SIGKILL');t.mock.timers.tick(5000);assert.equal(f.children.length,2);
 f.children[1].emit('exit',78);f.monitor.retryNow();assert.equal(f.children.length,3);assert.equal(f.prompts[2],false);
 f.children[2].emit('error',new Error('ENOENT'));t.mock.timers.tick(5000);assert.equal(f.children.length,3);assert.equal(f.monitor.status,'error');
});
test('a pending OS permission prompt is not killed by the readiness timeout',t=>{
 const f=fixture(t);f.monitor.start();f.children[0].stderr.write('PERMISSION_REQUIRED\n');
 t.mock.timers.tick(60000);assert.equal(f.children[0].killed,undefined);assert.equal(f.monitor.status,'permission');
 f.children[0].stderr.write('INPUT_READY\n');assert.equal(f.monitor.status,'ready');
});
test('fixed diagnostic tokens distinguish OS denial from tap failure without retaining arbitrary output',t=>{
 const f=fixture(t);f.monitor.start();const old=f.children[0];
 old.stderr.write('ACCESS_ALLOWED\nTAP_CREATE_FAILED\nprivate typed text\n');
 assert.equal(f.monitor.diagnostics.access,'allowed');assert.equal(f.monitor.diagnostics.tap,'failed');
 assert.ok(!JSON.stringify(f.monitor.diagnostics).includes('private'));
 old.emit('exit',78);assert.equal(f.monitor.diagnostics.exitCode,78);
 t.mock.timers.tick(5000);assert.equal(f.monitor.diagnostics.attempt,2);assert.equal(f.monitor.diagnostics.access,'unknown');
 old.stderr.write('ACCESS_DENIED\n');assert.equal(f.monitor.diagnostics.access,'unknown');
 f.children[1].stderr.write('ACCESS_DENIED\nTAP_CREATED\nINPUT_READY\n');
 assert.equal(f.monitor.diagnostics.access,'denied');assert.equal(f.monitor.diagnostics.tap,'created');assert.equal(f.monitor.status,'ready');
});
test('missing helper, executable access denial and readiness timeout have distinct diagnostics',t=>{
 const f=fixture(t);f.monitor.start();f.children[0].emit('error',Object.assign(new Error('private path'),{code:'ENOENT'}));assert.equal(f.monitor.diagnostics.launchError,'not-found');
 f.monitor.start();f.children[1].emit('error',Object.assign(new Error('private path'),{code:'EACCES'}));assert.equal(f.monitor.diagnostics.launchError,'permission-denied');
 f.monitor.start();t.mock.timers.tick(30000);assert.equal(f.monitor.diagnostics.timedOut,true);
 assert.ok(!JSON.stringify(f.monitor.diagnostics).includes('private path'));
});
