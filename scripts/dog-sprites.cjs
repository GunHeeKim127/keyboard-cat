// Extract complete silhouettes, including poses crossing their nominal grid.
const sharp=require('sharp'),fs=require('node:fs');
const {splitSilhouettes}=require('./sprite-components.cjs');
const {writeAsset}=require('./write-asset.cjs');
const {headAnchor}=require('./walk-frames.cjs');
const {rigFrames}=require('./walk-rig.cjs');
const breeds=['chihuahua','jindo','retriever','shiba','husky'];
const actions={IDLE:[0,1,2,3],JUMP:[8,9],FALL:[10],LAND:[11],DASH:[12,13],ATTACK:[14,15],SLEEP:[16,17],CARRY:[18,19],CLIMB:[20,21,22,23]};
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function poses(file,rows){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 return splitSilhouettes(data,info.width,info.height,4,rows);
}
async function cell(pose,scale){
 const width=Math.max(1,Math.round(pose.width*scale)),height=Math.max(1,Math.round(pose.height*scale));
 const input=await sharp(pose.rgba,{raw:{width:pose.width,height:pose.height,channels:4}}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
 const left=Math.max(4,Math.min(96-width,Math.round((100-width)/2)));
 return sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left,top:104-height}]).png().toBuffer();
}
async function pack(breed,action,cells){
 // Runtime uses independent PNGs: scaled/clipped atlases can sample a neighbor.
 for(let i=0;i<cells.length;i++)await writeAsset(`public/sprites/dog-${breed}-${action}-frame-${i}.png`,cells[i]);
 await writeAsset(`public/sprites/dog-${breed}-${action}-atlas.png`,await sharp({create:{width:100*cells.length,height:110,channels:4,background:'#00000000'}}).composite(cells.map((input,i)=>({input,left:i*100,top:0}))).png().toBuffer());
}
async function build(){
 fs.mkdirSync('public/sprites',{recursive:true});
 for(const breed of breeds){
  const original=await poses(`assets/dogs/${breed}-sheet.png`,6);
  const scale=Math.min(92/Math.max(...original.map(p=>p.width)),96/Math.max(...original.map(p=>p.height)));
  const cells=await Promise.all(original.map(p=>cell(p,scale)));
  for(const [action,indices]of Object.entries(actions))await pack(breed,action,indices.map(i=>cells[i]));
  const idle=original.slice(0,4);
  const headX=median(idle.map(p=>Math.round((100-Math.round(p.width*scale))/2)+headAnchor(p)*scale));
  await pack(breed,'WALK',await rigFrames(`assets/dogs/${breed}-walk-rig.png`,median(idle.map(p=>p.height))*scale,90,headX));
 }
 console.log('50 dog atlases and 180 isolated frames ready: complete silhouettes, sixteen-frame rigged walks');
}
if(require.main===module)build().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={poses};
