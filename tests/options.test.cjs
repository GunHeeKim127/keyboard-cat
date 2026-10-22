const {test}=require('node:test'),assert=require('node:assert/strict');const {presets,updateOptions}=require('../dist-electron/options.js');
test('quality presets preserve opt-in effects and movement',()=>{assert.equal(presets.low.wander,false);assert.equal(presets.high.wander,true);assert.equal(updateOptions(presets.low,{preset:'high'}).fps,12);});

test('equivalent settings reuse identity to avoid disk writes and tray rebuilds',()=>{
 const current=updateOptions(presets.high,{avatarName:'나비',multiMonitor:false});
 for(const patch of [{},{unknown:true},{avatarName:'  나비  '},{fps:current.fps},{preset:'high'},{...current},{size:999}])assert.equal(updateOptions(current,patch),current);
 for(const patch of [{nameDisplay:'hidden'},{pet:'dog'},{wander:false},{fps:5},{preset:'low'}])assert.notEqual(updateOptions(current,patch),current);
});
test('toggles remain independent and reject invalid payloads',()=>{const o=updateOptions(presets.high,{wander:false,fps:999,size:999,effects:'false'});assert.equal(o.wander,false);assert.equal(o.effects,true);assert.equal(o.fps,12);assert.equal(o.size,1.3);assert.equal(o.quality,'custom');assert.deepEqual(updateOptions(o,null),o);});
test('sleep animation can be enabled without idle animation or effects',()=>{const o=updateOptions(presets.low,{sleepAnimation:true});assert.equal(o.sleepAnimation,true);assert.equal(o.restAnimation,false);assert.equal(o.effects,false);});
test('avatar name persists through quality changes without changing the quality itself',()=>{
 const named=updateOptions(presets.low,{avatarName:'  나비 🐈  '});assert.equal(named.avatarName,'나비 🐈');assert.equal(named.quality,'low');
 assert.equal(updateOptions(named,{preset:'high'}).avatarName,'나비 🐈');
 assert.equal(updateOptions(presets.low,JSON.parse(JSON.stringify(named))).avatarName,'나비 🐈');
});
test('avatar names reject invalid types, remove controls and limit Unicode length',()=>{
 assert.equal(updateOptions(presets.low,{avatarName:42}).avatarName,'고양이');
 assert.equal(updateOptions(presets.low,{avatarName:'  \n  '}).avatarName,'고양이');
 assert.equal(updateOptions(presets.low,{avatarName:'나\u202e비\u0000'}).avatarName,'나비');
 assert.equal(updateOptions(presets.low,{avatarName:'🐈'.repeat(21)}).avatarName,'🐈'.repeat(20));
});
test('multi-monitor preference persists and is independent of quality presets',()=>{
 const o=updateOptions(presets.low,{multiMonitor:false});
 assert.equal(o.multiMonitor,false);assert.equal(o.quality,'low');
 assert.equal(updateOptions(o,{preset:'high'}).multiMonitor,false);
 assert.equal(updateOptions(presets.low,JSON.parse(JSON.stringify(o))).multiMonitor,false);
 assert.equal(updateOptions(o,{multiMonitor:'true'}).multiMonitor,false);
 assert.equal(updateOptions(o,{multiMonitor:true}).multiMonitor,true);
});
test('name display keeps legacy hover default, persists all modes and rejects invalid settings',()=>{
 assert.equal(updateOptions(presets.low,{avatarName:'나비'}).nameDisplay,'hover');
 for(const nameDisplay of ['always','hover','hidden']){
  const chosen=updateOptions(presets.low,{nameDisplay});assert.equal(chosen.nameDisplay,nameDisplay);assert.equal(chosen.quality,'low');
  assert.equal(updateOptions(presets.low,JSON.parse(JSON.stringify(chosen))).nameDisplay,nameDisplay);
  for(const preset of ['low','medium','high'])assert.equal(updateOptions(chosen,{preset}).nameDisplay,nameDisplay);
  for(const invalid of [true,0,null,'never',{},[]])assert.equal(updateOptions(chosen,{nameDisplay:invalid}).nameDisplay,nameDisplay);
 }
 assert.equal(updateOptions(presets.low,Object.create({nameDisplay:'always'})),presets.low);
});
