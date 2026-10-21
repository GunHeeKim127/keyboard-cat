const sharp=require('sharp'),fs=require('node:fs');
const {splitSilhouettes}=require('./sprite-components.cjs');
const {writeAsset}=require('./write-asset.cjs');
const {headAnchor}=require('./walk-frames.cjs');
const {rigFrames}=require('./walk-rig.cjs');
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const breeds=['ragdoll','russian-blue','norwegian-forest','siamese','persian'];
const actions={IDLE:[0,1,2,3],WALK:[4,5,6,7,8,9,10,11],JUMP:[12,13],FALL:[14],LAND:[15],DASH:[16,17],ATTACK:[18,19],SLEEP:[20,21],CARRY:[22,23],CLIMB:[24,25,26,27]};
async function poses(file,columns,rows){const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});return splitSilhouettes(data,info.width,info.height,columns,rows);}
async function frame(pose,scale,carry=false){
 const width=Math.max(1,Math.round(pose.width*scale)),height=Math.max(1,Math.round(pose.height*scale));
 const input=await sharp(pose.rgba,{raw:{width:pose.width,height:pose.height,channels:4}}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
 return sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((100-width)/2),top:carry?22:104-height}]).png().toBuffer();
}
async function build(){
 fs.mkdirSync('public/sprites',{recursive:true});
 const carry=await poses('assets/cats/scruff-carry-sheet.png',2,5);
 for(const [b,breed]of breeds.entries()){
  const source=await poses(`assets/cats/${breed}-sheet${breed==='norwegian-forest'?'-v2':''}.png`,4,7);
  const scale=Math.min(92/Math.max(...source.map(p=>p.width)),96/Math.max(...source.map(p=>p.height)));
  const cells=await Promise.all(source.map(p=>frame(p,scale)));
  const previousWalk=source.slice(4,12);
  // Keep the previous walking size rather than enlarging to the sitting poses.
  const headX=median(source.slice(0,4).map(p=>Math.round((100-Math.round(p.width*scale))/2)+headAnchor(p)*scale));
  const walking=await rigFrames(`assets/cats/${breed}-walk-rig.png`,median(previousWalk.map(p=>p.height))*scale,Math.max(...previousWalk.map(p=>p.width))*scale,headX);
  const held=carry.slice(b*2,b*2+2),heldScale=Math.min(92/Math.max(...held.map(p=>p.width)),82/Math.max(...held.map(p=>p.height)));
  for(const [action,indices]of Object.entries(actions)){
   const frames=action==='WALK'?walking:action==='CARRY'?await Promise.all(held.map(p=>frame(p,heldScale,true))):indices.map(i=>cells[i]);
   for(const [i,buffer]of frames.entries())await writeAsset(`public/sprites/cat-${breed}-${action}-frame-${i}.png`,buffer);
   await writeAsset(`public/sprites/cat-${breed}-${action}-atlas.png`,await sharp({create:{width:100*frames.length,height:110,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i*100,top:0}))).png().toBuffer());
  }
 }
 console.log('Five cat breeds: 180 isolated frames, including scruff carry poses');
}
if(require.main===module)build().catch(error=>{console.error(error);process.exitCode=1;});
