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
  assert.ok(m.monkeySpeed(breed)>0&&m.monkeySpeed(breed)<=3);
 }
 assert.ok(m.monkeySpeed('loris')<m.monkeySpeed('tamarin'));assert.ok(m.monkeyDuration('loris','WALK',8,12)>m.monkeyDuration('capuchin','WALK',8,12));
});
test('all 688 pre-existing sprite files remain byte identical',()=>{
 const entries=Object.entries(require('./fixtures/legacy-sprites-2.1.2.json'));assert.equal(entries.length,688);
 for(const [file,sha]of entries)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sha,file);
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
test('eight whole-body walk frames keep size and ground stable without an idle reset',async()=>{
 for(const breed of m.monkeyBreeds){const frames=await Promise.all(Array.from({length:8},(_,i)=>sharp(`public/sprites/monkey-${breed}-WALK-frame-${i}.png`).ensureAlpha().raw().toBuffer()));const boxes=frames.map(d=>{let minX=100,maxX=0,minY=110,maxY=0,area=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++)if(d[(y*100+x)*4+3]>64){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);area++;}return {w:maxX-minX+1,h:maxY-minY+1,bottom:maxY,area};});
  assert.equal(new Set(frames.map(b=>crypto.createHash('sha256').update(b).digest('hex'))).size,8,breed+' distinct steps');assert.ok(Math.max(...boxes.map(b=>b.h))/Math.min(...boxes.map(b=>b.h))<1.3,breed+' fixed height');assert.ok(Math.max(...boxes.map(b=>b.w))/Math.min(...boxes.map(b=>b.w))<1.3,breed+' fixed width');assert.ok(Math.max(...boxes.map(b=>b.area))/Math.min(...boxes.map(b=>b.area))<1.35,breed+' no sitting reset');assert.ok(Math.max(...boxes.map(b=>b.bottom))-Math.min(...boxes.map(b=>b.bottom))<=1,breed+' floor');
  const diff=(a,b)=>{let n=0;for(let i=3;i<a.length;i+=4)n+=Math.abs(a[i]-b[i]);return n;},steps=frames.slice(1).map((f,i)=>diff(frames[i],f));assert.ok(diff(frames[7],frames[0])<=Math.max(...steps)*1.75,breed+' loop seam');
 }
});
