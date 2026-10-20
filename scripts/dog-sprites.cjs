// Slice the generated transparent 4x6 sheets. Never modify the original cat art.
const sharp=require('sharp'),fs=require('node:fs');
const breeds=['chihuahua','jindo','retriever','shiba','husky'];
const actions={IDLE:[0,1,2,3],WALK:[4,5,6,7],JUMP:[8,9],FALL:[10],LAND:[11],DASH:[12,13],ATTACK:[14,15],SLEEP:[16,17],CARRY:[18,19],CLIMB:[20,21,22,23]};
async function build(){
 fs.mkdirSync('public/sprites',{recursive:true});
 for(const breed of breeds){
  const file=`assets/dogs/${breed}-sheet.png`,meta=await sharp(file).metadata();
  if(meta.width!==1024||meta.height!==1536||!meta.hasAlpha)throw Error(`Unexpected dog sheet layout: ${breed}`);
  const cells=[];
  for(let i=0;i<24;i++)cells.push(await sharp(file).extract({left:i%4*256,top:Math.floor(i/4)*256,width:256,height:256}).resize(100,100,{kernel:'nearest'}).extend({top:10,bottom:0,left:0,right:0,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer());
  for(const [action,indices]of Object.entries(actions))await sharp({create:{width:100*indices.length,height:110,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(indices.map((i,j)=>({input:cells[i],left:j*100,top:0}))).png().toFile(`public/sprites/dog-${breed}-${action}-atlas.png`);
 }
 console.log('50 dog animation atlases ready (five breeds, 24 poses each)');
}
build().catch(error=>{console.error(error);process.exitCode=1;});
