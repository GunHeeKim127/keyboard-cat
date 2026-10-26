const fs=require('node:fs'),path=require('node:path');
const pets=require('../dist-electron/pets'),parrots=require('../dist-electron/parrots'),monkeys=require('../dist-electron/monkeys');
function runtimeSprites(){
 const required=new Set(['IDLE-0.png','carry.png']);
 function add(pet,breed,catBreed,parrotBreed,monkeyBreed,actions,atlas){
  for(const action of Object.keys(actions)){
   const v=pets.spriteFor(pet,breed,action,catBreed,parrotBreed,monkeyBreed),name=path.basename(v.src);
   if(atlas)required.add(name);else for(let i=0;i<v.frames;i++)required.add(name.replace('-atlas.png',`-frame-${i}.png`));
  }
 }
 add('cat','chihuahua','original','cockatoo','capuchin',pets.catFrames,true);
 for(const breed of pets.breeds)add('dog',breed,'original','cockatoo','capuchin',pets.dogFrames,false);
 for(const breed of pets.catBreeds.filter(b=>b!=='original'))add('cat','chihuahua',breed,'cockatoo','capuchin',pets.dogFrames,false);
 for(const breed of parrots.parrotBreeds)add('parrot','chihuahua','original',breed,'capuchin',parrots.parrotFrames,false);
 for(const breed of monkeys.monkeyBreeds)add('monkey','chihuahua','original','cockatoo',breed,monkeys.monkeyFrames,false);
 return required;
}
function knownUnused(name){return /^(?:dog|cat|parrot|monkey)-[a-z-]+-[A-Z]+-atlas\.png$/.test(name)||/^(?:IDLE|WALK|JUMP|DASH|ATTACK|SLEEP|FALL|LAND|CLIMB)-\d+\.png$/.test(name)||['source.png','carry-source.png','frames.json','carry-prompt.txt'].includes(name);}
function prune(root=path.resolve(__dirname,'../dist/sprites')){
 const absolute=path.resolve(root),required=runtimeSprites();
 if(fs.lstatSync(absolute).isSymbolicLink()||fs.lstatSync(path.dirname(absolute)).isSymbolicLink())throw Error('Linked sprite root cannot be pruned');
 // Validate the entire retained set before deleting anything. Unknown additions
 // remain intact; only known build-time duplicates are eligible for removal.
 for(const name of required){const st=fs.lstatSync(path.join(absolute,name));if(!st.isFile()||st.isSymbolicLink())throw Error('Missing or linked runtime sprite '+name);}
 const removed=[];let bytes=0;
 for(const name of fs.readdirSync(absolute)){
  if(required.has(name)||!knownUnused(name))continue;
  const file=path.join(absolute,name),st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink())throw Error('Unexpected duplicate sprite type '+name);
  removed.push({file,name,size:st.size});
 }
 for(const item of removed){fs.unlinkSync(item.file);bytes+=item.size;}
 return {required:required.size,removed:removed.map(i=>i.name),bytes};
}
if(require.main===module){const r=prune();console.log(`Runtime sprites: ${r.required} retained, ${r.removed.length} unused files removed, ${r.bytes} bytes saved`);}
module.exports={runtimeSprites,knownUnused,prune};
