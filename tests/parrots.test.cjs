const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),{execFileSync}=require('node:child_process');
const p=require('../dist-electron/parrots'),{spriteFor,spriteDuration}=require('../dist-electron/pets'),{presets,updateOptions}=require('../dist-electron/options');
test('parrot choices persist safely without changing cat/dog choices',()=>{
 for(const breed of p.parrotBreeds){let o=updateOptions(presets.low,{pet:'parrot',parrotBreed:breed,dogBreed:'husky',catBreed:'siamese'});o=updateOptions(o,{preset:'high'});assert.equal(o.pet,'parrot');assert.equal(o.parrotBreed,breed);assert.equal(o.dogBreed,'husky');assert.equal(o.catBreed,'siamese');assert.equal(updateOptions(presets.low,JSON.parse(JSON.stringify(o))).parrotBreed,breed);}
 assert.equal(updateOptions(presets.low,{parrotBreed:'../../secret'}).parrotBreed,'cockatoo');assert.equal(updateOptions(presets.low,Object.create({pet:'parrot'})),presets.low);
 assert.equal(p.parrotSpriteFor('../../outside','constructor').src,'./sprites/parrot-cockatoo-IDLE-atlas.png');
});
test('bird combo phases, pause, movement and low power obey boundaries',()=>{
 const state=(effect,age,...rest)=>p.parrotAnimationState(false,false,false,0,1,effect,age,...rest);
 for(const [effect,age,action]of [[10,0,'CHIRP'],[10,1599,'CHIRP'],[20,0,'CLIMB_UP'],[20,1599,'CLIMB_UP'],[20,1600,'CLIMB_DOWN'],[20,3199,'CLIMB_DOWN'],[20,3200,'LAND'],[20,4199,'LAND'],[30,1599,'FLY'],[30,1600,'LAND'],[30,2599,'LAND'],[50,2399,'DISPLAY']])assert.equal(state(effect,age).action,action);
 for(const [effect,end]of [[10,1600],[20,4200],[30,2600],[50,2400]]){assert.equal(state(effect,end).effect,0);assert.equal(state(effect,-1).effect,0);}
 assert.deepEqual(p.parrotAnimationState(true,false,false,0,1,50,0),{action:'IDLE',effect:0,animate:false});assert.equal(p.parrotAnimationState(false,false,true,0,1,50,0).effect,0);
 assert.equal(p.parrotAnimationState(false,true,false,0,0,0,0).animate,false);assert.equal(p.parrotAnimationState(false,true,false,30000,0,0,0).animate,false);
});
test('all bird frames fit, have clear margins, and match their atlas',async()=>{
 for(const breed of p.parrotBreeds)for(const action of Object.keys(p.parrotFrames)){
  const visual=spriteFor('parrot','chihuahua',action,'original',breed),atlas=path.join('public',visual.src.slice(2)),meta=await sharp(atlas).metadata();assert.equal(meta.width,visual.frames*100);assert.equal(meta.height,110);
  assert.ok(spriteDuration('parrot',action,visual.frames,5,'original',breed)>=visual.frames/5);
  for(let i=0;i<visual.frames;i++){
   const {data,info}=await sharp(atlas.replace('-atlas.png',`-frame-${i}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,100);assert.equal(info.height,110);let visible=0;
   for(let y=0;y<110;y++)for(let x=0;x<100;x++){const alpha=data[(y*100+x)*4+3];if(alpha>32)visible++;if(x<4||x>=96||y<4||y>=104)assert.equal(alpha,0,`${breed} ${action} ${i} border`);}assert.ok(visible>300);
   const expected=await sharp(atlas).extract({left:i*100,top:0,width:100,height:110}).ensureAlpha().raw().toBuffer();
   for(let at=3;at<data.length;at+=4)assert.equal(data[at],expected[at],`${breed} ${action} ${i} atlas alpha`);
  }
 }
});
test('legacy 443 cat/dog PNGs retain committed source and decoded pixels across platforms',async()=>{
 const entries=Object.entries(require('./fixtures/legacy-sprites-1.3.17.json'));assert.equal(entries.length,443);
 // libpng compression can differ between macOS and Windows. Verify the original
 // committed bytes, then compare decoded output if a rebuild changes encoding.
 const packed=execFileSync('git',['cat-file','--batch'],{input:entries.map(([f])=>`HEAD:${f}`).join('\n')+'\n',maxBuffer:128*1024*1024});let cursor=0;
 for(const [file,expected]of entries){
  const end=packed.indexOf(10,cursor),[hash,type,length]=packed.subarray(cursor,end).toString().split(' ');assert.equal(type,'blob');assert.equal(hash,expected,file+' committed source');
  const original=packed.subarray(end+1,end+1+Number(length));cursor=end+2+Number(length);const actual=fs.readFileSync(file);
  if(actual.equals(original))continue;
  const a=await sharp(actual).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(a.info.width,b.info.width,file);assert.equal(a.info.height,b.info.height,file);assert.deepEqual(a.data,b.data,file+' decoded pixels');
 }
});

test('bird carry anchors feet and clamps drops on negative-coordinate screens',()=>{
 for(const size of [.75,1,1.3]){const pointer={x:-1500,y:300},pos=p.parrotCarryPosition(pointer,size);assert.ok(Number.isInteger(pos.x)&&Number.isInteger(pos.y));assert.ok(Math.abs(pos.y+80+112*size*.94-pointer.y)<1);const drop=p.parrotDropPosition(pointer,size,{x:-1920,y:0,width:1920,height:1080});assert.ok(Number.isInteger(drop.x)&&Number.isInteger(drop.y));}
});
