// Compare complete drawings with existing motions; never manipulate body parts.
const sharp=require('sharp'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const groups={cat:['ragdoll','russian-blue','norwegian-forest','siamese','persian'],dog:['chihuahua','jindo','retriever','shiba','husky']};
const directory=path.resolve(process.argv[2]||'work/compact-walk-review');
const columns=[['IDLE','IDLE',0],['JUMP','JUMP',0],['LAND','LAND',0],['OLD WALK 0','WALK',0,true],['NEW WALK 0','WALK',0],['OLD WALK 4','WALK',4,true],['NEW WALK 4','WALK',4]];
(async()=>{fs.mkdirSync(directory,{recursive:true});for(const [kind,breeds]of Object.entries(groups)){
 const parts=[];let labels='';
 for(const [row,breed]of breeds.entries()){
  labels+=`<text x="8" y="${row*250+20}">${breed}</text>`;
  for(const [column,[label,action,frame,previous]]of columns.entries()){
   const file=`public/sprites/${kind}-${breed}-${action}-frame-${frame}.png`;
   const input=previous?cp.execFileSync('git',['show',`v1.3.13:${file}`],{maxBuffer:1024*1024}):fs.readFileSync(file);
   parts.push({input:await sharp(input).resize(200,220,{kernel:'nearest'}).png().toBuffer(),left:column*200,top:row*250+30});
   labels+=`<text x="${column*200+8}" y="${row*250+48}">${label}</text>`;
  }
 }
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1250"><rect width="100%" height="100%" fill="#182436"/><style>text{font:14px sans-serif;fill:#e9f1ff}</style>${labels}</svg>`);
 await sharp(svg).composite(parts).png().toFile(path.join(directory,`proportions-${kind}.png`));
}console.log('Existing motions / previous walk / corrected walk comparison: '+directory);})().catch(error=>{console.error(error);process.exitCode=1;});
