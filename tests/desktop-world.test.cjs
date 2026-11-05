const test=require('node:test'),assert=require('node:assert/strict');
const {DesktopWorld,emptyScene,parseScene}=require('../dist-electron/desktop-world');
const area={x:0,y:0,width:1200,height:900},body={x:0,y:0,width:80,height:100};
const off={windowWalk:false,gravity:false,edgeClimb:false,folderPlay:false};
function folderScene(){return {windows:[],folders:[{id:'DESKTOP/TOP',rect:{x:200,y:200,width:80,height:80}}],explorers:[],foldersAvailable:true};}
const enterPoint={x:200,y:156};
test('closed-folder label anchors to its actual icon at every pet scale and follows moved icons',()=>{
 for(const size of [.75,1,1.3]){
  const w=new DesktopWorld(()=>.25),s=folderScene(),r=s.folders[0].rect,b={x:160-56*size,y:248-112*size,width:112*size,height:112*size};
  let p=w.step({x:r.x+r.width/2-b.x-b.width/2,y:r.y+r.height*.7-b.y-b.height},b,area,{...off,folderPlay:true},s,1000,0);
  p=w.step(p,b,area,{...off,folderPlay:true},s,2000,0);assert(p.hidden);assert.deepEqual(p.folderAnchor,{x:r.x+r.width/2,y:r.y+r.height/2});
  s.folders[0].rect={...r,x:r.x+80,y:r.y+100};p=w.step(p,b,area,{...off,folderPlay:true},s,2100,0);
  assert.deepEqual(p.folderAnchor,{x:r.x+80+r.width/2,y:r.y+100+r.height/2});
 }
});
test('voluntary folder exit uses the nearby left edge without teleporting from the middle',()=>{
 const w=new DesktopWorld(()=>.25),s=folderScene();let p=enter(w,s);s.windows=[{id:'10',rect:{x:100,y:80,width:700,height:600}}];s.explorers=[{windowId:'10',folderId:'DESKTOP/TOP'}];p=w.step(p,body,area,{...off,folderPlay:true},s,2200,0);p={...p,x:130};
 w.leaveFolder(2250);let next=w.step(p,body,area,{...off,folderPlay:true},s,2300,0);assert.equal(next.mode,'exit-approach');assert.equal(next.facing,-1);assert(next.x<=130&&next.x>120);assert(!next.hidden);
 let saw=false;for(let t=2400;t<7000;t+=100){next=w.step(next,body,area,{...off,folderPlay:true},s,t,0);if(next.action==='EXIT_WINDOW'){saw=true;assert(!next.hidden);}if(next.mode==='normal')break;}assert(saw);assert(next.x+80<=100);assert.equal(next.mode,'normal');
});
test('slow climbing accumulates subpixels and smoothly crosses the window lip',()=>{
 const w=new DesktopWorld(()=>.25),s=emptyScene();s.windows=[{id:'w',rect:{x:200,y:500,width:500,height:300}}];const o={...off,edgeClimb:true,windowWalk:true,climbSpeed:6};let p=w.step({x:120,y:435},body,area,o,s,1000,3),previous=p,mount=false,finished=false,moved=false;
 for(let t=1033;t<10000;t+=33){p=w.step(p,body,area,o,s,t,0);if(p.y<previous.y)moved=true;if(p.mode==='mount'){if(mount)assert(Math.abs(p.x-previous.x)<15);mount=true;}if(p.landing){finished=true;break;}previous=p;}
 assert(moved,'slow movement was rounded away');assert(mount);assert(finished);assert.equal(p.y+100,500);
});
test('a folder that loses entry eligibility during entry or inside its open window exits visibly',()=>{
 const o={...off,folderPlay:true},s=folderScene(),w=new DesktopWorld(()=>.25);let p=w.step(enterPoint,body,area,o,s,1000,0);s.folders=[];p=w.step(p,body,area,o,s,1100,0);assert.equal(p.action,'EXIT_CLOSED_FOLDER');assert(!p.hidden);
 const w2=new DesktopWorld(()=>.25),s2=folderScene();let p2=enter(w2,s2);s2.windows=[{id:'10',rect:{x:100,y:80,width:700,height:600}}];s2.explorers=[{windowId:'10',folderId:'DESKTOP/TOP'}];p2=w2.step(p2,body,area,o,s2,2200,0);s2.folders=[];p2=w2.step(p2,body,area,o,s2,2300,0);assert.equal(p2.mode,'exit-approach');assert.equal(p2.action,'WALK');assert(!p2.hidden);
});
test('climbing an adjacent window edge finishes on its real top instead of hanging in midair',()=>{
 const w=new DesktopWorld(()=>.25),s=emptyScene();s.windows=[{id:'w',rect:{x:200,y:500,width:500,height:300}}];const o={...off,edgeClimb:true,windowWalk:true,gravity:true};let p=w.step({x:120,y:530},body,area,o,s,1000,3);assert.equal(p.mode,'climb');let top=false;for(let t=1100;t<4500;t+=100){p=w.step(p,body,area,o,s,t,0);if(p.landing){top=true;break;}}assert(top);assert.equal(p.y+100,500);assert.equal(p.mode,'normal');
});
test('penguin watches a blocking window then reverses; behind mode bypasses the reaction',()=>{
 const s=emptyScene();s.windows=[{id:'window',rect:{x:200,y:100,width:500,height:600}}];
 const o={...off,pet:'penguin',windowWalk:true,windowLook:true};
 const w=new DesktopWorld(()=>.25);const p=w.step({x:119,y:300},body,area,o,s,1000,3);
 assert.equal(p.action,'WINDOW_LOOK');assert.equal(p.x,119);
 const end=w.step(p,body,area,o,s,3500,3);assert.equal(end.mode,'normal');assert.equal(end.reverse,true);
 const behind=new DesktopWorld(()=>.25).step({x:119,y:300},body,area,{...o,behindWindows:true},s,1000,3);assert.equal(behind.mode,'normal');assert.equal(behind.x,122);
});
test('penguin policy forbids climbing and other animals cannot use penguin window watching',()=>{
 const {desktopMotionPolicy}=require('../dist-electron/desktop-world');
 assert.equal(desktopMotionPolicy({...off,wander:true,desktopRoam:false,pet:'penguin',edgeClimb:true}).edgeClimb,false);
 assert.notEqual(new DesktopWorld(()=>.25).step({x:0,y:800},body,area,{...off,pet:'penguin',edgeClimb:true},emptyScene(),1000,-3).mode,'climb');
 assert.equal(desktopMotionPolicy({...off,wander:true,desktopRoam:false,pet:'cat',windowWalk:true,windowLook:true}).windowLook,false);
});
function enter(w,s=folderScene()){let p=w.step(enterPoint,body,area,{...off,folderPlay:true},s,1000,0);assert.equal(p.action,'ENTER_FOLDER');p=w.step(p,body,area,{...off,folderPlay:true},s,2000,0);assert.equal(p.mode,'inside-closed');assert(p.hidden);return p;}
test('folder toggle off immediately starts visible closed-folder exit and eventually clears hidden state',()=>{
 const w=new DesktopWorld(()=>.25),s=folderScene(),p=enter(w,s);const exit=w.step(p,body,area,off,s,2100,0);assert.equal(exit.action,'EXIT_CLOSED_FOLDER');assert.equal(exit.hidden,false);assert.equal(w.step(exit,body,area,off,emptyScene(),3100,0).mode,'normal');
});
test('turning folder entry off walks to the window edge before the visible exit',()=>{
 const w=new DesktopWorld(()=>.25),s=folderScene(),p=enter(w,s);s.windows=[{id:'10',rect:{x:100,y:80,width:700,height:600}}];s.explorers=[{windowId:'10',folderId:'DESKTOP/TOP'}];
 const inside=w.step(p,body,area,{...off,folderPlay:true},s,2200,3);assert.equal(inside.mode,'inside-window');assert.equal(inside.ownerWindow,'10');assert.deepEqual(inside.clip,s.windows[0].rect);
 w.leaveFolder(2250);let exit=w.step(inside,body,area,off,s,2300,0);assert.equal(exit.mode,'exit-approach');assert.equal(exit.action,'WALK');assert(Math.abs(exit.x-inside.x)<10);assert(!exit.hidden);let saw=false;
 for(let t=2400;t<20000;t+=100){exit=w.step(exit,body,area,off,s,t,0);saw||=exit.action==='EXIT_WINDOW';if(exit.mode==='normal')break;}assert(saw);assert.equal(exit.mode,'normal');assert(exit.x>=800);
});

test('a subfolder or unrelated Explorer never receives the hidden pet',()=>{
 const w=new DesktopWorld(()=>.25),s=folderScene(),p=enter(w,s);s.windows=[{id:'10',rect:{x:100,y:80,width:700,height:600}}];s.explorers=[{windowId:'10',folderId:'DESKTOP/TOP/CHILD'}];assert.equal(w.step(p,body,area,{...off,folderPlay:true},s,2200,0).mode,'inside-closed');
});
test('closing folder window returns to its icon and voluntary departure remains animated',()=>{
 const w=new DesktopWorld(()=>.25),s=folderScene();let p=enter(w,s);s.windows=[{id:'10',rect:{x:100,y:80,width:700,height:600}}];s.explorers=[{windowId:'10',folderId:'DESKTOP/TOP'}];p=w.step(p,body,area,{...off,folderPlay:true},s,2200,0);s.windows=[];s.explorers=[];p=w.step(p,body,area,{...off,folderPlay:true},s,2300,0);assert.equal(p.mode,'inside-closed');p=w.step(p,body,area,{...off,folderPlay:true},s,15400,0);assert.equal(p.action,'EXIT_CLOSED_FOLDER');assert(!p.hidden);
});
test('entry cancellation is visible and cannot instantly re-enter the same folder',()=>{
 const w=new DesktopWorld(()=>.25),s=folderScene();let p=w.step(enterPoint,body,area,{...off,folderPlay:true},s,1000,0);p=w.step(p,body,area,off,s,1100,0);assert.equal(p.action,'EXIT_CLOSED_FOLDER');p=w.step(p,body,area,off,s,2100,0);assert.equal(w.step(p,body,area,{...off,folderPlay:true},s,2200,0).mode,'normal');
});
test('removed folder recovers visibly instead of losing the pet',()=>{
 const w=new DesktopWorld(()=>.25),p=enter(w);const next=w.step(p,body,area,{...off,folderPlay:true},emptyScene(),2300,0);assert.equal(next.action,'EXIT_CLOSED_FOLDER');assert(!next.hidden);
});
test('gravity lands on exposed window top; closing support falls to the monitor floor',()=>{
 const w=new DesktopWorld(()=>.25),s=emptyScene();s.windows=[{id:'1',rect:{x:0,y:400,width:600,height:300}}];const o={...off,windowWalk:true,gravity:true};let p={x:100,y:100};for(let n=1;n<30;n++)p=w.step(p,body,area,o,s,n*100,0);assert.equal(p.y+100,400);s.windows=[];for(let n=30;n<70;n++)p=w.step(p,body,area,o,s,n*100,0);assert.equal(p.y+100,900);
});
test('occluded window tops cannot catch the falling pet',()=>{
 const w=new DesktopWorld(()=>.25),s=emptyScene();s.windows=[{id:'front',rect:{x:0,y:200,width:600,height:600}},{id:'back',rect:{x:0,y:400,width:600,height:300}}];let p={x:100,y:250};for(let n=1;n<40;n++)p=w.step(p,body,area,{...off,gravity:true,windowWalk:true},s,n*100,0);assert.equal(p.y+100,900);
});
test('pet follows a moved supporting window instead of floating at its old position',()=>{
 const w=new DesktopWorld(()=>.25),s=emptyScene();s.windows=[{id:'1',rect:{x:0,y:400,width:600,height:300}}];let p=w.step({x:100,y:300},body,area,{...off,windowWalk:true,gravity:true},s,1000,0);s.windows[0].rect={x:80,y:450,width:600,height:300};p=w.step(p,body,area,{...off,windowWalk:true,gravity:true},s,1100,0);assert.equal(p.x,180);assert.equal(p.y,350);
});
test('wall climb retains the matching left-facing direction and never applies to penguins',()=>{
 const w=new DesktopWorld(()=>.25);const p=w.step({x:0,y:800},body,area,{...off,edgeClimb:true,gravity:false},emptyScene(),1000,-3);assert.equal(p.mode,'climb');assert.equal(p.action,'EDGE_CLIMB');assert.equal(p.facing,-1);
});

test('negative monitor coordinates remain finite; oversized and malformed scene data is rejected',()=>{
 const w=new DesktopWorld(()=>.25),a={x:-1600,y:-200,width:1600,height:1000};let p={x:-1000,y:0};for(let n=1;n<50;n++)p=w.step(p,body,a,{...off,gravity:true},emptyScene(),n*100,0);assert.equal(p.y+100,800);assert(Number.isSafeInteger(p.x));assert(parseScene(emptyScene()));
 for(const bad of [{...emptyScene(),windows:[{id:'x',rect:{x:NaN,y:0,width:1,height:1}}]},{...emptyScene(),folders:Array(257).fill({})},{...emptyScene(),explorers:[{windowId:'x',folderId:'bad\npath'}]}])assert.equal(parseScene(bad),undefined);
});
