const {test}=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),path=require('node:path');
const {breeds,spriteFor,dogFrames}=require('../dist-electron/pets.js');
const {presets,updateOptions}=require('../dist-electron/options.js');
test('pet/breed choices persist across presets and old settings safely default to cat',()=>{
 const chosen=updateOptions(presets.low,{pet:'dog',dogBreed:'husky',avatarName:'하루'});
 assert.equal(chosen.quality,'low');const next=updateOptions(chosen,{preset:'high'});
 assert.equal(next.pet,'dog');assert.equal(next.dogBreed,'husky');assert.equal(next.avatarName,'하루');
 assert.deepEqual(updateOptions(presets.low,JSON.parse(JSON.stringify(chosen))),chosen);
 assert.equal(updateOptions(presets.low,{fps:8}).pet,'cat');
 const back=updateOptions(chosen,{pet:'cat'});assert.equal(updateOptions(back,{pet:'dog'}).dogBreed,'husky');
});
test('pet options reject invalid types, inherited properties and asset path injection',()=>{
 const next=updateOptions(presets.low,{pet:'fox',dogBreed:'../../secret'});
 assert.equal(next.pet,'cat');assert.equal(next.dogBreed,'chihuahua');
 assert.deepEqual(updateOptions(presets.low,Object.create({pet:'dog'})),presets.low);
 assert.equal(spriteFor('dog','../../secret','../../outside').src,'./sprites/dog-chihuahua-IDLE-atlas.png');
 assert.equal(spriteFor('cat','husky','JUMP').src,'./sprites/JUMP-atlas.png');
});
test('all five dog atlases have transparent matching frames and every action resolves to a bundled asset',async()=>{
 for(const breed of breeds)for(const action of Object.keys(dogFrames)){
  const visual=spriteFor('dog',breed,action),file=path.join('public',visual.src.slice(2)),meta=await sharp(file).metadata();
  assert.equal(meta.width,visual.frames*100,`${breed} ${action}`);assert.equal(meta.height,110);assert.equal(meta.hasAlpha,true);
 }
 for(const breed of breeds){const stats=await sharp(`public/sprites/dog-${breed}-IDLE-atlas.png`).stats();assert.equal(stats.channels[3].min,0);assert.ok(stats.channels[3].max>200);}
});
