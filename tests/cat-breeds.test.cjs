const {test}=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const {catBreeds,spriteFor,dogFrames,spriteDuration}=require('../dist-electron/pets');
const {presets,updateOptions}=require('../dist-electron/options');
test('cat breed selection persists independently of dog breed and presets; legacy settings retain original',()=>{
 assert.equal(presets.low.catBreed,'original');
 for(const catBreed of catBreeds){
  const chosen=updateOptions(presets.low,{catBreed,dogBreed:'husky'});
  assert.equal(updateOptions(chosen,{preset:'high'}).catBreed,catBreed);
  assert.equal(updateOptions(updateOptions(chosen,{pet:'dog'}),{pet:'cat'}).catBreed,catBreed);
  assert.equal(updateOptions(chosen,{catBreed:'../../outside'}).catBreed,catBreed);
 }
 assert.equal(spriteFor('cat','husky','IDLE','../../outside').src,'./sprites/IDLE-atlas.png');
 assert.equal(spriteFor('cat','husky','IDLE').frames,8);
});
test('five cat breeds provide every action and isolated transparent poses without neighboring pixels',async()=>{
 for(const breed of catBreeds.filter(b=>b!=='original'))for(const action of Object.keys(dogFrames)){
  const visual=spriteFor('cat','chihuahua',action,breed),file='public/'+visual.src.slice(2),meta=await sharp(file).metadata();
  assert.equal(meta.width,visual.frames*100);assert.equal(meta.height,110);
  for(let i=0;i<visual.frames;i++){
   const {data,info}=await sharp(file.replace('-atlas.png',`-frame-${i}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   assert.equal(info.width,100);assert.equal(info.height,110);
   let visible=0;for(let p=3;p<data.length;p+=4)if(data[p]>32)visible++;
   assert.ok(visible>200,breed+' '+action+' empty pose');
   for(let y=0;y<110;y++)for(const x of [0,1,2,3,96,97,98,99])assert.equal(data[(y*100+x)*4+3],0,breed+' frame border');
  }
 }
});
test('breed walk pacing stays smooth at low power and short cat actions stay visible',()=>{
 assert.ok(spriteDuration('cat','WALK',16,12,'persian')>spriteDuration('cat','WALK',16,12,'siamese'));
 for(const breed of catBreeds.filter(b=>b!=='original')){
  assert.ok(spriteDuration('cat','WALK',16,5,breed)>=1.4);
  assert.ok(spriteDuration('cat','CARRY',2,12,breed)>=1.3);
  assert.ok(spriteDuration('cat','SLEEP',2,12,breed)>=2.4);
 }
});
