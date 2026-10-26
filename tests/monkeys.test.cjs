const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const m=require('../dist-electron/monkeys'),{spriteFor,spriteDuration}=require('../dist-electron/pets'),{presets,updateOptions}=require('../dist-electron/options');
test('five monkey choices persist through presets and reject injected selections',()=>{
 for(const breed of m.monkeyBreeds){let o=updateOptions(presets.low,{pet:'monkey',monkeyBreed:breed,catBreed:'siamese',parrotBreed:'macaw',dogBreed:'husky'});o=updateOptions(o,{preset:'high'});assert.equal(o.pet,'monkey');assert.equal(o.monkeyBreed,breed);assert.equal(o.catBreed,'siamese');assert.equal(o.parrotBreed,'macaw');assert.equal(o.dogBreed,'husky');assert.equal(updateOptions(presets.low,JSON.parse(JSON.stringify(o))).monkeyBreed,breed);}
 assert.equal(updateOptions(presets.low,{monkeyBreed:'../../secret'}).monkeyBreed,'capuchin');assert.equal(updateOptions(presets.low,Object.create({pet:'monkey'})),presets.low);
 assert.equal(m.monkeySpriteFor('../../secret','constructor').src,'./sprites/monkey-capuchin-IDLE-atlas.png');
});
test('monkey combo boundaries include careful slow loris travel and no jumps',()=>{
 for(const breed of m.monkeyBreeds){const slow=breed==='loris',climb=slow?3600:1800,travel=slow?2400:1200,state=(effect,age)=>m.monkeyAnimationState(breed,false,false,false,0,1,effect,age);
  for(const [effect,age,action]of [[10,0,'FORAGE'],[10,1799,'FORAGE'],[20,climb-1,'CLIMB_UP'],[20,climb,'CLIMB_DOWN'],[20,climb*2,'LAND'],[30,travel-1,'TRAVEL'],[30,travel,'LAND'],[50,2399,'DISPLAY']])assert.equal(state(effect,age).action,action,`${breed} ${effect} ${age}`);
  for(const [effect,end]of [[10,1800],[20,climb*2+1200],[30,travel+1200],[50,2400]]){assert.equal(state(effect,end).effect,0);assert.equal(state(effect,-1).effect,0);}
  assert.deepEqual(m.monkeyAnimationState(breed,true,false,false,0,1,50,0),{action:'IDLE',effect:0,animate:false});assert.equal(m.monkeyAnimationState(breed,false,false,true,0,1,50,0).effect,0);
  for(const idle of [0,30000])assert.equal(m.monkeyAnimationState(breed,false,true,false,idle,0,0,0).animate,false);
  assert.ok(m.monkeyWalkVelocity(breed,1,12)>0);
 }
 assert.ok(m.monkeyWalkVelocity('loris',1,12)<m.monkeyWalkVelocity('tamarin',1,12));assert.ok(m.monkeyDuration('loris','WALK',8,12)>m.monkeyDuration('capuchin','WALK',8,12));
});
test('all 688 pre-existing sprite files remain byte identical',()=>{
 const entries=Object.entries(require('./fixtures/legacy-sprites-2.1.2.json'));assert.equal(entries.length,688);
 for(const [file,sha]of entries)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sha,file);
});
test('all 150 monkey sprites outside walking, carry and sleep remain byte identical',()=>{
 const all=Object.entries(require('./fixtures/monkey-nonwalk-2.2.0.json'));assert.equal(all.length,200);const entries=all.filter(([f])=>!/-CARRY-|-SLEEP-/.test(f));assert.equal(entries.length,150);for(const [file,sha]of entries)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sha,file);
});
test('monkey translation follows painted stride at every size/FPS without rounding drift',()=>{
 for(const breed of m.monkeyBreeds)for(const size of [.75,1,1.3])for(const fps of [5,8,12]){
  const walker=new m.MonkeyWalkStepper(),speed=m.monkeyWalkVelocity(breed,size,fps);let x=0;
  for(let i=0;i<1000;i++){const step=walker.advance(breed,size,fps,1);assert.ok(Number.isInteger(step)&&step>=0);x+=step;}
  assert.ok(Math.abs(x-speed*100)<1,`${breed} ${size} ${fps} accumulated distance`);
  for(let i=0;i<1000;i++)x+=walker.advance(breed,size,fps,-1);assert.ok(Math.abs(x)<=1);
  walker.reset();assert.equal(walker.advance(breed,size,fps,1),Math.trunc(speed*.1));
 }
 assert.ok(m.monkeyWalkVelocity('capuchin',.75,5)<m.monkeyWalkVelocity('capuchin',1.3,12));
});
test('all monkey poses have isolated transparent margins and complete matching atlas frames',async()=>{
 for(const breed of m.monkeyBreeds)for(const action of Object.keys(m.monkeyFrames)){
  const v=spriteFor('monkey','husky',action,'siamese','macaw',breed),file=path.join('public',v.src.slice(2)),meta=await sharp(file).metadata();assert.equal(meta.width,v.frames*100);assert.equal(meta.height,110);assert.ok(spriteDuration('monkey',action,v.frames,5,'original','cockatoo',breed)>=v.frames/5);
  for(let i=0;i<v.frames;i++){const data=await sharp(file.replace('-atlas.png',`-frame-${i}.png`)).ensureAlpha().raw().toBuffer();let visible=0;
   for(let y=0;y<110;y++)for(let x=0;x<100;x++){const a=data[(y*100+x)*4+3];if(a>32)visible++;if(x<4||x>=96||y<4||y>=104)assert.equal(a,0,`${breed} ${action} ${i} border`);}assert.ok(visible>300);
   const expected=await sharp(file).extract({left:i*100,top:0,width:100,height:110}).ensureAlpha().raw().toBuffer();for(let j=3;j<data.length;j+=4)assert.equal(data[j],expected[j]);
  }
 }
});
test('monkey hands follow pointer with integer safe positions on negative monitors',()=>{
 for(const size of [.75,1,1.3]){const p={x:-1500,y:350},c=m.monkeyCarryPosition(p,size),d=m.monkeyDropPosition(p,size,{x:-1920,y:0,width:1920,height:1080});assert.ok(Number.isInteger(c.x)&&Number.isInteger(c.y)&&Number.isInteger(d.x)&&Number.isInteger(d.y));assert.ok(Math.abs(c.y+80+112*size*.12-p.y)<=.5);}
});
test('sixteen whole-body walk frames keep size and ground stable without an idle reset',async()=>{
 for(const breed of m.monkeyBreeds){const frames=await Promise.all(Array.from({length:16},(_,i)=>sharp(`public/sprites/monkey-${breed}-WALK-frame-${i}.png`).ensureAlpha().raw().toBuffer()));const boxes=frames.map(d=>{let minX=100,maxX=0,minY=110,maxY=0,area=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++)if(d[(y*100+x)*4+3]>64){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);area++;}return {w:maxX-minX+1,h:maxY-minY+1,bottom:maxY,area};});
  assert.equal(new Set(frames.map(b=>crypto.createHash('sha256').update(b).digest('hex'))).size,16,breed+' distinct steps');assert.ok(Math.max(...boxes.map(b=>b.h))/Math.min(...boxes.map(b=>b.h))<1.3,breed+' fixed height');assert.ok(Math.max(...boxes.map(b=>b.w))/Math.min(...boxes.map(b=>b.w))<1.3,breed+' fixed width');assert.ok(Math.max(...boxes.map(b=>b.area))/Math.min(...boxes.map(b=>b.area))<1.35,breed+' no sitting reset');assert.ok(Math.max(...boxes.map(b=>b.bottom))-Math.min(...boxes.map(b=>b.bottom))<=1,breed+' floor');
  const diff=(a,b)=>{let n=0;for(let i=3;i<a.length;i+=4)n+=Math.abs(a[i]-b[i]);return n;},steps=frames.slice(1).map((f,i)=>diff(frames[i],f));assert.ok(diff(frames[15],frames[0])<=Math.max(...steps)*1.75,breed+' loop seam');
 }
});
test('each carried monkey frame contains a continuous visible wooden branch above the face',async()=>{
 const heights=require('./fixtures/monkey-carry-height-2.2.0.json');
 for(const breed of m.monkeyBreeds)for(let i=0;i<4;i++){
  const d=await sharp(`public/sprites/monkey-${breed}-CARRY-frame-${i}.png`).ensureAlpha().raw().toBuffer();let branch=false;
  for(let y=4;y<26;y++){const xs=[];for(let x=4;x<96;x++){const p=(y*100+x)*4;if(d[p+3]>64&&d[p]>35&&d[p]>d[p+1]*1.1&&d[p+1]>d[p+2]*1.05)xs.push(x);}if(xs.length>=25&&xs.at(-1)-xs[0]>=30&&xs.every((x,j)=>j===0||x-xs[j-1]<=8)){branch=true;break;}}
  assert.ok(branch,`${breed} carry ${i}: branch cannot disappear or be cropped`);
  let top=110,bottom=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++)if(d[(y*100+x)*4+3]>64){top=Math.min(top,y);bottom=Math.max(bottom,y);}
  assert.ok(bottom-top+1>=heights[breed][i]*.85,`${breed} carry ${i}: adding a branch must not miniaturize the monkey`);
 }
});
test('sleep cycles preserve orientation and body size with a slow breathing cadence',async()=>{
 for(const breed of m.monkeyBreeds){const frames=await Promise.all(Array.from({length:4},(_,i)=>sharp(`public/sprites/monkey-${breed}-SLEEP-frame-${i}.png`).ensureAlpha().raw().toBuffer()));const areas=frames.map(d=>{let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>64)n++;return n;});assert.ok(Math.max(...areas)/Math.min(...areas)<1.15,breed+' stable resting size');
  for(let i=0;i<4;i++){const a=frames[i],b=frames[(i+1)%4];let direct=0,mirrored=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++){const p=(y*100+x)*4,q=(y*100+99-x)*4;for(let c=0;c<4;c++){direct+=Math.abs(a[p+c]-b[p+c]);mirrored+=Math.abs(a[p+c]-b[q+c]);}}assert.ok(direct<mirrored,breed+' no mirrored sleep pose');}
  assert.ok(m.monkeyDuration(breed,'SLEEP',4,12)>=4.8);
 }
});

test('walk-only revision preserves all 200 other monkey PNGs including branches and sleeping poses',()=>{
 const previous=require('./fixtures/monkey-nonwalk-2.2.1.json');assert.equal(Object.keys(previous).length,200);
 for(const [file,hash]of Object.entries(previous))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
});

test('moving body retains the original face and torso palette',async()=>{const layout=require('../assets/monkeys/walk-forward-layout.json');for(const breed of m.monkeyBreeds){const old=await sharp('assets/monkeys/'+breed+'-walk-v4-keys.png').extract({left:0,top:0,width:100,height:110}).ensureAlpha().raw().toBuffer();for(let i=0;i<16;i++){const frame=await sharp('public/sprites/monkey-'+breed+'-WALK-frame-'+i+'.png').ensureAlpha().raw().toBuffer();for(const key of ['protectedFace','protectedTorso']){const [left,top,w,h]=layout[breed][key],mean=d=>{const sums=[0,0,0];let weight=0;for(let y=top;y<top+h;y++)for(let x=left;x<left+w;x++){const p=(y*100+x)*4,a=d[p+3]/255;weight+=a;for(let c=0;c<3;c++)sums[c]+=d[p+c]*a;}assert.ok(weight>20);return sums.map(v=>v/weight);},before=mean(old),after=mean(frame);for(let c=0;c<3;c++)assert.ok(Math.abs(before[c]-after[c])<15,breed+' '+key+' stable fur colors');}}}});
test('painted support feet move backward under the forward moving body without moonwalking',async()=>{
 const layout=require('../assets/monkeys/walk-forward-layout.json');for(const breed of m.monkeyBreeds){const c=layout[breed],frames=await Promise.all(Array.from({length:16},(_,i)=>sharp('public/sprites/monkey-'+breed+'-WALK-frame-'+i+'.png').ensureAlpha().raw().toBuffer()));for(let limb=0;limb<2;limb++){const [left,right]=c.footWindows[limb],points=[];for(let tick=limb?10:0;tick<(limb?22:12);tick++){const d=frames[tick%16];let bottom=0;for(let y=90;y<104;y++)for(let x=left;x<=right;x++)if(d[(y*100+x)*4+3]>180)bottom=Math.max(bottom,y);const xs=[];for(let y=bottom-1;y<=bottom;y++)for(let x=left;x<=right;x++)if(d[(y*100+x)*4+3]>180)xs.push(x);assert.ok(xs.length);points.push({x:xs.reduce((a,b)=>a+b,0)/xs.length,tick});}const world=points.map(p=>p.x+p.tick*c.stride/16);assert.ok(Math.max(...world)-Math.min(...world)<3,breed+' planted foot drift');for(let i=1;i<points.length;i++)assert.ok(points[i].x-points[i-1].x<=1.5,breed+' backward foot trajectory');assert.ok(points[0].x-points.at(-1).x>10,breed+' moving stride');}}
});

test('painted upper body follows each stride with bounded continuous motion',async()=>{for(const breed of m.monkeyBreeds){const centers=[];for(let i=0;i<16;i++){const d=await sharp('public/sprites/monkey-'+breed+'-WALK-frame-'+i+'.png').ensureAlpha().raw().toBuffer();let sum=0,weight=0;for(let y=4;y<75;y++)for(let x=20;x<95;x++){const a=d[(y*100+x)*4+3];sum+=y*a;weight+=a;}centers.push(sum/weight);}const range=Math.max(...centers)-Math.min(...centers);assert.ok(range>.25&&range<2,breed+' subtle body movement');for(let i=0;i<16;i++)assert.ok(Math.abs(centers[i]-centers[(i+1)%16])<.85,breed+' no body snap');}});
