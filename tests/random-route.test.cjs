const {test}=require('node:test'),assert=require('node:assert/strict');
const {IconRoute}=require('../dist-electron/icon-route');
test('voluntary departure walks to the icon edge before falling, including subpixel strides',()=>{
 let random=.25;const route=new IconRoute(()=>random),icons=[{id:'a',rect:{x:100,y:100,width:40,height:50}}];let p={x:30,y:110};route.step(p,icons,1000);p=route.step(p,icons,2200).foot;random=0;let result=route.step(p,icons,2400,undefined,[],{allowDrop:true,walkSpeed:2});assert.equal(result.motion,'walk');assert(!result.fall);
 let fell=false;for(let now=2500;now<18000;now+=100){result=route.step(p,icons,now,undefined,[],{allowDrop:true,walkSpeed:2});p={x:Math.round(result.foot.x),y:Math.round(result.foot.y)};if(result.fall){assert(result.foot.x<100);fell=true;break;}assert.equal(result.motion,'walk');}assert(fell);
});
test('gravity-off policy never chooses a voluntary fall',()=>{
 const route=new IconRoute(()=>0),icons=[{id:'a',rect:{x:100,y:100,width:40,height:50}}];route.step({x:30,y:110},icons,1000);const end=route.step({x:30,y:110},icons,2200);for(let now=2400;now<10000;now+=100){const result=route.step(end.foot,icons,now,undefined,[],{allowDrop:false,walkSpeed:2});assert(!result.fall);assert(!result.moving);}
});
test('invalid route geometry cancels an active hop rather than producing a destination',()=>{
 const route=new IconRoute(()=>.25),icons=[{id:'a',rect:{x:100,y:100,width:40,height:50}}];route.step({x:30,y:110},icons,1000);assert(route.active);const result=route.step({x:30,y:110},[{id:'bad',rect:{x:NaN,y:0,width:40,height:50}}],1100);assert(result.invalid);assert(!route.active);assert.deepEqual(result.foot,{x:30,y:110});
});
test('declining a folder is sampled once per encounter, never every movement tick',()=>{
 const {DesktopWorld,emptyScene}=require('../dist-electron/desktop-world');let calls=0;const world=new DesktopWorld(()=>{calls++;return .9;}),scene={...emptyScene(),foldersAvailable:true,folders:[{id:'a',rect:{x:200,y:200,width:80,height:80}}]},body={x:0,y:0,width:80,height:100},area={x:0,y:0,width:1200,height:900};let p={x:200,y:180};for(let now=1000;now<2000;now+=100){p=world.step(p,body,area,{folderPlay:true,gravity:false,windowWalk:false,edgeClimb:false},scene,now,0);assert.equal(p.mode,'normal');}assert.equal(calls,1);
});
