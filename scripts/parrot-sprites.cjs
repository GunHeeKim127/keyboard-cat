// Whole-bird cutouts only. Existing cat and dog assets are never written here.
const sharp=require('sharp');
const {splitSilhouettes}=require('./sprite-components.cjs');
const {writeAsset}=require('./write-asset.cjs');
const breeds=['cockatoo','macaw','cockatiel','parrotlet','lovebird'];
const range=(start,n)=>Array.from({length:n},(_,i)=>start+i);
const actions={IDLE:range(0,4),WALK:range(4,8),CHIRP:range(12,4),CLIMB:range(16,4),FLY:range(20,4),DISPLAY:range(24,4),SLEEP:range(28,4),CARRY:range(32,4),LAND:range(36,4)};
async function build(){
 for(const breed of breeds){
  const {data,info}=await sharp(`assets/parrots/${breed}-sheet.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const poses=splitSilhouettes(data,info.width,info.height,4,10,{ordered:'rows',threshold:64});
  const scale=Math.min(88/Math.max(...poses.map(p=>p.width)),94/Math.max(...poses.map(p=>p.height)));
  const cells=await Promise.all(poses.map(async p=>{
   const width=Math.max(1,Math.round(p.width*scale)),height=Math.max(1,Math.round(p.height*scale));
   const input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height).png().toBuffer();
   return sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((100-width)/2),top:103-height}]).png().toBuffer();
  }));
  for(const [action,indices]of Object.entries(actions)){
   const selected=indices.map(i=>cells[i]),base=`public/sprites/parrot-${breed}-${action}`;
   for(let i=0;i<selected.length;i++)await writeAsset(`${base}-frame-${i}.png`,selected[i]);
   await writeAsset(`${base}-atlas.png`,await sharp({create:{width:100*selected.length,height:110,channels:4,background:'#00000000'}}).composite(selected.map((input,i)=>({input,left:i*100,top:0}))).png().toBuffer());
  }
 }
 console.log('Five parrots: 200 whole-bird frames and 45 atlases ready');
}
if(require.main===module)build().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={breeds,actions,build};
