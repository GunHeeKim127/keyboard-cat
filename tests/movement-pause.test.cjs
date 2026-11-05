const test=require('node:test'),assert=require('node:assert/strict');
const {DesktopWorld,emptyScene}=require('../dist-electron/desktop-world'),{IconRoute}=require('../dist-electron/icon-route'),{SceneCoordinates}=require('../dist-electron/scene-coordinates');
test('combo freeze preserves fall velocity without catching up the frozen time',()=>{
 const body={x:0,y:0,width:80,height:100},area={x:0,y:0,width:1200,height:900},o={windowWalk:true,gravity:true,folderPlay:false};
 const a=new DesktopWorld(()=>.25),b=new DesktopWorld(()=>.25);let p={x:200,y:100},q={...p};
 for(const t of [1000,1100]){p=a.step(p,body,area,o,emptyScene(),t,0);q=b.step(q,body,area,o,emptyScene(),t,0);}
 const held={...p};for(let t=1200;t<=2100;t+=100)a.freeze(t);assert.deepEqual(p,held);
 p=a.step(p,body,area,o,emptyScene(),2200,0);q=b.step(q,body,area,o,emptyScene(),1200,0);assert.deepEqual(p,q);
});
test('combo freeze preserves folder entry phase instead of skipping to hidden state',()=>{
 const w=new DesktopWorld(()=>.25),scene={...emptyScene(),foldersAvailable:true,folders:[{id:'top',rect:{x:200,y:200,width:80,height:80}}]},body={x:0,y:0,width:80,height:100},area={x:0,y:0,width:1200,height:900},o={windowWalk:false,gravity:false,folderPlay:true};
 let p=w.step({x:200,y:156},body,area,o,scene,1000,0);assert.equal(p.mode,'enter');
 for(let t=1100;t<=3000;t+=100)w.freeze(t);p=w.step(p,body,area,o,scene,3100,0);assert.equal(p.mode,'enter');assert(p.folderProgress<.2);assert(!p.hidden);
});
test('combo freeze preserves climbing and window-mount progress',()=>{
 const body={x:0,y:0,width:80,height:100},area={x:0,y:0,width:1200,height:900},scene={...emptyScene(),windows:[{id:'w',rect:{x:200,y:500,width:500,height:300}}]},o={windowWalk:true,gravity:true,folderPlay:false,edgeClimb:true,climbSpeed:200};
 for(const target of ['climb','mount']){
  const a=new DesktopWorld(()=>.25),b=new DesktopWorld(()=>.25);let p={x:120,y:530},q={...p},now=1000;
  for(;now<5000;now+=100){p=a.step(p,body,area,o,scene,now,3);q=b.step(q,body,area,o,scene,now,3);if(p.mode===target)break;}
  assert.equal(p.mode,target);for(let t=now+100;t<=now+2000;t+=100)a.freeze(t);
  assert.deepEqual(a.step(p,body,area,o,scene,now+2100,0),b.step(q,body,area,o,scene,now+100,0));
 }
});
test('combo freeze resumes the same file-hop phase without teleporting to its destination',()=>{
 const a=new IconRoute(()=>.25),b=new IconRoute(()=>.25),icons=[{id:'a',rect:{x:100,y:100,width:40,height:50}},{id:'b',rect:{x:180,y:100,width:40,height:50}}];let p={x:30,y:110},q={...p};
 for(const t of [1000,1100]){p=a.step(p,icons,t).foot;q=b.step(q,icons,t).foot;}
 for(let t=1200;t<=2100;t+=100)a.freeze(t);
 assert.deepEqual(a.step(p,icons,2200),b.step(q,icons,1200));
});
test('unchanged icon/window rectangles avoid native DPI calls, and display changes invalidate the cache',()=>{
 let calls=0,scale=1;const c=new SceneCoordinates(r=>{calls++;return {...r,x:r.x*scale};}),rect={x:100,y:100,width:40,height:50};
 const scene={...emptyScene(),windows:[{id:'w',rect}],folders:[{id:'f',rect}],icons:[{id:'f',rect}]};
 c.map(scene);assert.equal(calls,1);for(let i=0;i<100;i++)c.map(scene);assert.equal(calls,1);
 scale=2;c.invalidate();assert.equal(c.map(scene).icons[0].rect.x,200);assert.equal(calls,2);
 c.map(emptyScene());c.map(scene);assert.equal(calls,3);
});
