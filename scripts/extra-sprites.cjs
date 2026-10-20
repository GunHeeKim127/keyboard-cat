// Add unused original frames without regenerating or changing the existing sprites.
const sharp=require('sharp');
const fs=require('node:fs');
const specs={FALL:{x:80,y:322,n:4},LAND:{x:520,y:322,n:3},CLIMB:{x:160,y:562,n:4}};
async function extract(){
 for(const [name,s] of Object.entries(specs))for(let f=0;f<s.n;f++){
  const {data}=await sharp('public/sprites/source.png').extract({left:s.x+f*80,top:s.y,width:80,height:79}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Remove the dark sheet/grid, including enclosed ladder gaps. Keep brown ladder pixels.
  for(let i=0;i<data.length;i+=4){const high=Math.max(data[i],data[i+1],data[i+2]),low=Math.min(data[i],data[i+1],data[i+2]);if(high<150&&high-low<38)data[i+3]=0;}
  await sharp(data,{raw:{width:80,height:79,channels:4}}).extend({top:31,bottom:0,left:10,right:10,background:{r:0,g:0,b:0,alpha:0}}).png().toFile(`public/sprites/${name}-${f}.png`);
 }
 const manifest=JSON.parse(fs.readFileSync('public/sprites/frames.json','utf8'));
 for(const [name,s] of Object.entries(specs))manifest[name]={...s,w:80,h:79};
 fs.writeFileSync('public/sprites/frames.json',JSON.stringify(manifest,null,2));
 console.log('11 fall, land and climb frames ready');
}
extract().catch(error=>{console.error(error);process.exitCode=1;});
