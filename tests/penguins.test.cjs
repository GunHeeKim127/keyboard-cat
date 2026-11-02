const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const p=require('../dist-electron/penguins'),{presets,updateOptions}=require('../dist-electron/options'),{spriteFor,spriteDuration}=require('../dist-electron/pets');
test('five penguin choices persist across presets and settings while rejecting invalid input',()=>{
 assert.equal(p.penguinBreeds.length,5);
 for(const breed of p.penguinBreeds){const chosen=updateOptions(presets.low,{pet:'penguin',penguinBreed:breed});assert.equal(chosen.pet,'penguin');assert.equal(updateOptions(chosen,{preset:'high'}).penguinBreed,breed);assert.deepEqual(updateOptions(presets.low,JSON.parse(JSON.stringify(chosen))),chosen);}
 assert.equal(updateOptions(presets.low,{penguinBreed:'../../secret'}).penguinBreed,'emperor');assert.deepEqual(updateOptions(presets.low,Object.create({pet:'penguin'})),presets.low);
 assert.equal(p.penguinSpriteFor('../../evil','constructor').src,'./sprites/penguin-emperor-IDLE-atlas.png');assert.equal(updateOptions(presets.low,{pet:'fish'}).pet,'cat');
});
test('penguin combos use species activities and swimming without changing other pet states',()=>{
 const state=(effect,age)=>p.penguinAnimationState(false,false,false,0,1,effect,age);
 assert.equal(state(10,0).action,'CALL');assert.equal(state(20,0).action,'SLIDE');assert.equal(state(20,1600).action,'LAND');assert.equal(state(30,0).action,'SWIM');assert.equal(state(30,1800).action,'LAND');assert.equal(state(50,2999).action,'DISPLAY');assert.equal(state(50,3000).effect,0);assert.equal(state(50,-1).effect,0);
 assert.equal(p.penguinAnimationState(true,false,false,0,0,50,1).action,'IDLE');assert.equal(p.penguinAnimationState(false,false,true,0,0,50,1).effect,0);
 assert.equal(p.penguinAnimationState(false,false,false,5000,0,0,0).action,'WALK');assert.equal(p.penguinAnimationState(false,true,false,31000,0,0,0).animate,false);
 assert.match(p.penguinActivities.rockhopper,/바위/);assert.match(p.penguinActivities.little,/깃/);assert.match(p.penguinDisplays.emperor,/알/);assert.match(p.penguinDisplays.adelie,/조약돌/);
});
test('every existing animal PNG remains byte-identical to pre-penguin 2.2.2',()=>{const previous=require('./fixtures/pre-penguin-2.2.2.json');assert.equal(Object.keys(previous).length,973);for(const [file,hash]of Object.entries(previous))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);});
test('all five penguins have isolated whole poses, transparent margins and matching atlases',async()=>{
 for(const breed of p.penguinBreeds)for(const [action,count]of Object.entries(p.penguinFrames)){
  const v=spriteFor('penguin','husky',action,'siamese','macaw','langur',breed);assert.equal(v.frames,count);assert.ok(spriteDuration('penguin',action,count,5,'siamese','macaw','langur',breed)>=count/5);
  const atlas='public/'+v.src.slice(2),meta=await sharp(atlas).metadata();assert.equal(meta.width,count*100);assert.equal(meta.height,110);
  for(let i=0;i<count;i++){const d=await sharp(atlas.replace('-atlas.png',`-frame-${i}.png`)).ensureAlpha().raw().toBuffer(),tile=await sharp(atlas).extract({left:i*100,top:0,width:100,height:110}).ensureAlpha().raw().toBuffer();let visible=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++){const a=d[(y*100+x)*4+3];if(a>64)visible++;if(x<4||x>=96||y<4||y>=104)assert.equal(a,0,`${breed} ${action} ${i} no crop/adjacent pose`);}assert.ok(visible>300);for(let j=3;j<d.length;j+=4){assert.equal(d[j],tile[j]);if(d[j]>240)for(let c=1;c<=3;c++)assert.ok(Math.abs(d[j-c]-tile[j-c])<=2);}}
 }
});
test('penguin walking uses sixteen complete varied poses with bounded body size and loop seam',async()=>{
 for(const breed of p.penguinBreeds){const frames=await Promise.all(Array.from({length:16},(_,i)=>sharp(`public/sprites/penguin-${breed}-WALK-frame-${i}.png`).ensureAlpha().raw().toBuffer()));assert.equal(new Set(frames.map(d=>crypto.createHash('sha256').update(d).digest('hex'))).size,16);
  const boxes=frames.map(d=>{let top=110,bottom=0,area=0;for(let y=0;y<110;y++)for(let x=0;x<100;x++)if(d[(y*100+x)*4+3]>64){top=Math.min(top,y);bottom=Math.max(bottom,y);area++;}return {height:bottom-top+1,bottom,area};});assert.ok(Math.max(...boxes.map(b=>b.height))/Math.min(...boxes.map(b=>b.height))<1.2,breed+' stable walking size');assert.ok(Math.max(...boxes.map(b=>b.area))/Math.min(...boxes.map(b=>b.area))<1.3,breed+' stable body');assert.ok(Math.max(...boxes.map(b=>b.bottom))-Math.min(...boxes.map(b=>b.bottom))<=1);
  const diff=(a,b)=>{let n=0;for(let j=3;j<a.length;j+=4)n+=Math.abs(a[j]-b[j]);return n;},steps=frames.slice(1).map((f,i)=>diff(frames[i],f));assert.ok(diff(frames[15],frames[0])<=Math.max(...steps)*1.7,breed+' smooth wrap');
 }
});
test('penguin movement follows frame cadence and pointer positions remain safe on negative monitors',()=>{
 for(const breed of p.penguinBreeds)for(const size of [.75,1,1.3])for(const fps of [5,8,12]){const stepper=new p.PenguinWalkStepper();let distance=0;for(let i=0;i<1000;i++)distance+=stepper.advance(breed,size,fps,1);assert.ok(Math.abs(distance-p.penguinWalkVelocity(breed,size,fps)*100)<1);for(let i=0;i<1000;i++)distance+=stepper.advance(breed,size,fps,-1);assert.ok(Math.abs(distance)<=1);const c=p.penguinCarryPosition({x:-1500,y:300},size),d=p.penguinDropPosition({x:-1500,y:300},size,{x:-1920,y:0,width:1920,height:1080});for(const n of [c.x,c.y,d.x,d.y])assert.ok(Number.isInteger(n));}
});

test('penguin walk revision preserves every other penguin motion and all prior animal images',()=>{const previous=require('./fixtures/pre-penguin-walk-review.json');assert.equal(Object.keys(previous).length,1173);for(const [file,hash]of Object.entries(previous))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);});

test('both painted penguin feet take turns supporting without stationary rear feet or moonwalking',async()=>{
 for(const breed of p.penguinBreeds){const frames=await Promise.all(Array.from({length:16},(_,i)=>sharp('public/sprites/penguin-'+breed+'-WALK-frame-'+i+'.png').ensureAlpha().raw().toBuffer()));for(const [side,left,right,start]of [[0,35,52,0],[1,54,68,8]]){const points=[];for(let tick=start;tick<start+10;tick++){const d=frames[tick%16];let bottom=0;for(let y=97;y<104;y++)for(let x=left;x<=right;x++)if(d[(y*100+x)*4+3]>128)bottom=Math.max(bottom,y);let n=0,sum=0;for(let y=bottom-1;y<=bottom;y++)for(let x=left;x<=right;x++)if(d[(y*100+x)*4+3]>128){n++;sum+=x;}assert.ok(n>0,breed+' visible foot '+side);points.push({x:sum/n,tick});}assert.ok(points[0].x-points.at(-1).x>2,breed+' both support feet must move backward under body');const world=points.map(q=>q.x+6*q.tick/16);assert.ok(Math.max(...world)-Math.min(...world)<1.5,breed+' planted foot must stay on ground during forward translation');for(let i=1;i<points.length;i++)assert.ok(points[i].x-points[i-1].x<.6,breed+' no forward snap in stance');}}
});
