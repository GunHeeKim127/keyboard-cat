// Whole-image review only: this never constructs or moves individual limbs.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const directory=path.resolve(process.argv[2]||'work/whole-walk-review');
const groups={cat:['ragdoll','russian-blue','norwegian-forest','siamese','persian'],dog:['chihuahua','jindo','retriever','shiba','husky']};
const {headAnchor}=require('./walk-frames.cjs');
function measure(data,width,height){let left=width,right=-1,top=height,bottom=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return {left,right,top,bottom,width:right-left+1,height:bottom-top+1};}
(async()=>{
 fs.mkdirSync(directory,{recursive:true});const report=[];
 for(const [kind,breeds]of Object.entries(groups)){
  const width=1600,height=1250,parts=[];let text='';
  for(const [row,breed]of breeds.entries()){
   text+=`<text x="8" y="${row*250+20}">${breed} — 0 → 7 → 0</text>`;
   const images=[],measures=[];
   for(let i=0;i<8;i++){
    const file=`public/sprites/${kind}-${breed}-WALK-frame-${i}.png`,{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});images.push(data);
    measures.push({...measure(data,info.width,info.height),headX:headAnchor({rgba:data,...info})});
    parts.push({input:await sharp(file).resize(200,220,{kernel:'nearest'}).png().toBuffer(),left:i*200,top:row*250+30});
    text+=`<text x="${i*200+12}" y="${row*250+48}">${i}</text>`;
   }
   const differences=images.map((data,i)=>{const next=images[(i+1)%8];let delta=0;for(let p=0;p<data.length;p++)delta+=Math.abs(data[p]-next[p]);return Math.round(delta/data.length*1000)/1000;});
   report.push({kind,breed,frames:measures,adjacentRGBAChange:differences,loopRGBAChange:differences[7],note:'Geometry metrics do not prove natural anatomy; review the full strip and GIF.'});
  }
  const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#182436"/><style>text{font:14px sans-serif;fill:#e9f1ff}</style>${text}</svg>`);
  await sharp(svg).composite(parts).png().toFile(path.join(directory,`walk-contact-${kind}.png`));
 }
 fs.writeFileSync(path.join(directory,'walk-measurements.json'),JSON.stringify(report,null,2));console.log('Whole-image contact sheets and loop measurements ready: '+directory);
})().catch(error=>{console.error(error);process.exitCode=1;});
