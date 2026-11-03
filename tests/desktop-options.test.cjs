const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),sharp=require('sharp');
const {presets,desktopDefaults,updateOptions}=require('../dist-electron/options');
const {IconRoute}=require('../dist-electron/icon-route');
const {DesktopWorld,emptyScene}=require('../dist-electron/desktop-world');
test('hop timing spends the final short section settling and does not add a second long pause',()=>{const {iconHopFrame}=require('../dist-electron/icon-route');assert.equal(iconHopFrame(0),0);assert.equal(iconHopFrame(.18),2);assert.equal(iconHopFrame(.78),5);assert.equal(iconHopFrame(.99),7);const r=new IconRoute(),icons=[{id:'a',rect:{x:100,y:100,width:40,height:50}},{id:'b',rect:{x:180,y:100,width:40,height:50}}];r.step({x:30,y:110},icons,1000);const end=r.step({x:30,y:110},icons,2200);assert(end.landed);assert(!r.step(end.foot,icons,2240).moving);assert(r.step(end.foot,icons,2300).moving);});
test('no reachable icon still permits walking on a real surface, never drifting in air or sliding during landing',()=>{const {surfaceFallbackTravel:f}=require('../dist-electron/icon-route');assert.equal(f(true,true,false,false,false,0,-1),-2);assert.equal(f(true,true,false,false,false,3,1),3);for(const args of [[false,true,false,false,false],[true,false,false,false,false],[true,true,true,false,false],[true,true,false,true,false],[true,true,false,false,true]])assert.equal(f(...args,3,1),0);});
test('foothold poses anticipate, fly and settle without replaying a jump after landing',()=>{
 const {iconHopAction}=require('../dist-electron/icon-route');assert.deepEqual(Array.from({length:8},(_,i)=>iconHopAction('dog',i)),['IDLE','IDLE','ICON_HOP','ICON_HOP','FALL_GROUND','LAND_GROUND','LAND_GROUND','LAND_GROUND']);assert.equal(iconHopAction('parrot',4),'ICON_HOP');assert.equal(iconHopAction('parrot',5),'LAND_GROUND');for(let i=0;i<8;i++)assert.equal(iconHopAction('penguin',i),'ICON_HOP');
});
test('five parrots have 16 separate padded upright climbing frames with no painted wall',async()=>{
 const {interactionSprite}=require('../dist-electron/interaction-sprites');
 for(const [,breed] of require('../assets/interactions/catalog.json').parrot){assert.equal(interactionSprite('parrot','EDGE_CLIMB','chihuahua','original',breed,'capuchin','emperor').frames,16);for(let i=0;i<16;i++){const file=`public/sprites/interaction-parrot-${breed}-EDGE_CLIMB-frame-${i}.png`,{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,100);assert.equal(info.height,110);let visible=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++){const a=data[(y*100+x)*4+3];if(a>32)visible++;if(x===0||x===99||y===0||y===109)assert.equal(a,0,file);}assert(visible>100&&visible<8000,file);}}
 assert.equal(interactionSprite('penguin','EDGE_CLIMB','chihuahua','original','cockatoo','capuchin','emperor'),undefined);
});
test('wall travel follows the existing painted stride cadence and excludes penguins',()=>{
 const {wallClimbSpeed}=require('../dist-electron/wall-motion');const o={...presets.low,pet:'monkey',monkeyBreed:'loris'};assert(wallClimbSpeed(o)>0&&wallClimbSpeed(o)<10);assert(wallClimbSpeed({...o,fps:12})>wallClimbSpeed(o));assert.equal(wallClimbSpeed({...o,pet:'penguin'}),0);
});
test('folder icons remain footholds with folder entry disabled',()=>{
 const icons=[{id:'DESKTOP/FOLDER',rect:{x:100,y:100,width:60,height:70}}],r=new IconRoute();r.step({x:30,y:114},icons,1000);const landed=r.step({x:30,y:114},icons,2400);assert(landed.landed);assert.deepEqual(landed.foot,{x:130,y:114});
 const scene={...emptyScene(),icons,folders:icons,foldersAvailable:true},p=new DesktopWorld().step({x:90,y:14},{x:0,y:0,width:80,height:100},{x:0,y:0,width:1200,height:900},{windowWalk:false,gravity:false,folderPlay:false,edgeClimb:false,iconWalk:true},scene,2500,0);assert.equal(p.mode,'normal');assert(!p.hidden);
});
test('species foothold limits keep penguins low, lorises close, and flight optional',()=>{
 const {iconMotionLimits}=require('../dist-electron/icon-route');
 const penguin=iconMotionLimits('penguin','capuchin','emperor',100),rock=iconMotionLimits('penguin','capuchin','rockhopper',100),loris=iconMotionLimits('monkey','loris','emperor',100),flight=iconMotionLimits('parrot','capuchin','emperor',100,true),walk=iconMotionLimits('parrot','capuchin','emperor',100,false);
 assert.equal(penguin.rise,30);assert(rock.rise>penguin.rise);assert.equal(loris.arc,0);assert(loris.distance<100);assert(flight.rise>walk.rise);
 const high=[{id:'high',rect:{x:50,y:90,width:40,height:50}}];assert(!new IconRoute().step({x:20,y:200},high,1000,penguin).moving);assert(new IconRoute().step({x:20,y:200},high,1000,flight).moving);
});
test('a newly blocked or moved foothold safely cancels a flight; clear flight takes priority over climbing',()=>{
 const {iconMotionLimits}=require('../dist-electron/icon-route'),{desktopMotionPolicy}=require('../dist-electron/desktop-world'),limits=iconMotionLimits('parrot','capuchin','emperor',100,true),icons=[{id:'target',rect:{x:110,y:100,width:40,height:50}}];
 const r=new IconRoute();assert(r.step({x:20,y:110},icons,1000,limits).moving);assert(r.step({x:20,y:110},icons,1300,limits,[{x:60,y:0,width:30,height:200}]).fall);
 assert.equal(desktopMotionPolicy({...presets.high,pet:'parrot',edgeClimb:true},true).edgeClimb,false);assert.equal(desktopMotionPolicy({...presets.high,pet:'parrot',edgeClimb:true},false).edgeClimb,true);
 const moved=new IconRoute();moved.step({x:20,y:110},icons,1000,limits);assert(moved.step({x:20,y:110},[{...icons[0],rect:{...icons[0].rect,x:140}}],1100,limits).fall);
});
test('low hop holds takeoff and landing positions rather than sliding while crouching',()=>{
 const r=new IconRoute(),icons=[{id:'low',rect:{x:100,y:100,width:40,height:50}}],start={x:30,y:110};r.step(start,icons,1000);assert.deepEqual(r.step(start,icons,1170).foot,start);const airborne=r.step(start,icons,1500);assert(airborne.foot.y<110);const nearEnd=r.step(airborne.foot,icons,1900);assert.deepEqual(nearEnd.foot,{x:120,y:110});
});
test('penguin look poses are eight complete transparent frames and absent from other species',async()=>{
 const {interactionSprite}=require('../dist-electron/interaction-sprites');
 for(const [,breed] of require('../assets/interactions/catalog.json').penguin){
  assert.equal(interactionSprite('penguin','WINDOW_LOOK','chihuahua','original','cockatoo','capuchin',breed).frames,8);
  for(const action of ['WINDOW_LOOK','HOP'])for(let i=0;i<8;i++){const file=`public/sprites/interaction-penguin-${breed}-${action}-frame-${i}.png`,{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,100);assert.equal(info.height,110);let n=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++){const a=data[(y*100+x)*4+3];if(a>32)n++;if(x===0||x===99||y===0||y===109)assert.equal(a,0,file);}assert(n>100,file);}
 }
 assert.equal(interactionSprite('cat','WINDOW_LOOK','chihuahua','original','cockatoo','capuchin','emperor'),undefined);
});
test('window walking off alone preserves airborne travel even if the gravity preference is on',()=>{
 const {desktopMotionPolicy}=require('../dist-electron/desktop-world');
 const o={...presets.high,gravity:true,windowWalk:false,edgeClimb:false};const policy=desktopMotionPolicy(o);assert.equal(policy.gravity,false);assert.equal(policy.windowWalk,false);
 const w=new DesktopWorld(),p=w.step({x:350,y:150},{x:0,y:0,width:80,height:100},{x:0,y:0,width:1200,height:900},policy,emptyScene(),1000,3);assert.equal(p.x,353);assert.equal(p.y,150);
 const behind=desktopMotionPolicy({...o,windowWalk:true,behindWindows:true});assert.equal(behind.windowWalk,false);
});
test('desktop features are opt-in, independently persisted and untouched by quality presets',()=>{
 for(const o of Object.values(presets))for(const k of Object.keys(desktopDefaults))assert.equal(o[k],false,k);
 for(const key of Object.keys(desktopDefaults)){const selected=updateOptions(presets.low,{[key]:true});assert.equal(selected[key],true);assert.equal(selected.quality,'low');assert.equal(updateOptions(presets.low,JSON.parse(JSON.stringify(selected)))[key],true);for(const preset of ['low','medium','high'])assert.equal(updateOptions(selected,{preset})[key],true);for(const value of [1,'true',null,[],{}])assert.equal(updateOptions(selected,{[key]:value}),selected);}
});
test('icon route makes bounded continuous hops, never crosses an arbitrary desktop gap',()=>{
 const r=new IconRoute(),icons=[{id:'folder',rect:{x:100,y:100,width:60,height:70}}];let foot={x:30,y:114};const begin=r.step(foot,icons,1000);assert(begin.moving);const mid=r.step(foot,icons,1400);assert(mid.foot.y<114);const end=r.step(mid.foot,icons,2300);assert.deepEqual(end.foot,{x:130,y:114});assert(end.landed);assert(!r.step(end.foot,[],2400).moving);assert.equal(new IconRoute().step({x:900,y:800},icons,1000).moving,false);
});
test('deleted or covered icon cannot strand an active hop or a rested pet in the air',()=>{
 const r=new IconRoute(),icons=[{id:'folder',rect:{x:100,y:100,width:60,height:70}}];r.step({x:30,y:114},icons,1000);assert(r.step({x:30,y:114},[],1100).fall);r.step({x:30,y:114},icons,2000);const end=r.step({x:30,y:114},icons,3300);assert(end.landed);assert(r.step(end.foot,[],3400).fall);
});
test('behind-window transition falls through all window/icon platforms even with ordinary gravity off',()=>{
 const w=new DesktopWorld(),s=emptyScene(),area={x:0,y:0,width:1200,height:900},body={x:0,y:0,width:80,height:100};s.windows=[{id:'1',rect:{x:0,y:400,width:600,height:300}}];s.icons=[{id:'file',rect:{x:80,y:600,width:80,height:80}}];let p={x:100,y:300};w.dropToFloor(1000);let saw=false;for(let t=1000;t<5000;t+=100){p=w.step(p,body,area,{windowWalk:true,edgeClimb:false,gravity:false,folderPlay:false,iconWalk:true,behindWindows:true},s,t,0);saw||=p.action==='ENV_FALL';}assert(saw);assert.equal(p.y+100,900);assert(!w.droppingToFloor);
});
test('turning both movement modes off preserves an airborne location and walking compatibility',()=>{
 const w=new DesktopWorld(),s=emptyScene(),area={x:0,y:0,width:1200,height:900},body={x:0,y:0,width:80,height:100};w.dropToFloor(1000);w.pauseMotion();const p=w.step({x:350,y:150},body,area,{windowWalk:false,edgeClimb:false,gravity:false,folderPlay:false},s,1100,0);assert.deepEqual({x:p.x,y:p.y},{x:350,y:150});assert.equal(p.mode,'normal');
});
test('all 26 pet variants have separate folder, petting, fall and land assets with transparent padded cells',async()=>{
 const catalog=require('../assets/interactions/catalog.json');let count=0;for(const group of Object.values(catalog))for(const [pet,breed] of group)for(const action of ['ENTER_FOLDER','EXIT_CLOSED_FOLDER','EXIT_WINDOW','PETTED','FALL_GROUND','LAND_GROUND'])for(let i=0;i<(action==='LAND_GROUND'?2:4);i++){
  const file=`public/sprites/interaction-${pet}-${breed}-${action}-frame-${i}.png`;assert(fs.existsSync(file),file);const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,100);assert.equal(info.height,110);let visible=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++){const a=data[(y*100+x)*4+3];if(a>32)visible++;if(x===0||x===99||y===0||y===109)assert.equal(a,0,file+' edge');}assert(visible>100,file+' empty');count++;
 }assert.equal(count,572);
});

test('native scene rectangles enclose fractional coordinates with integer fields',()=>{const {nativeSceneRect:f}=require('../dist-electron/desktop-scene');assert.deepEqual(f({x:-12.25,y:10.5,width:90.1,height:40.2}),{x:-13,y:10,width:91,height:41});assert.deepEqual(f({x:0,y:0,width:94,height:87}),{x:0,y:0,width:94,height:87});for(const v of [NaN,Infinity,0,-1])assert.throws(()=>f({x:0,y:0,width:v,height:20}));});
