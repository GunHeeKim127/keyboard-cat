// Whole-bird cutouts only. Existing cat and dog assets are never written here.
const sharp=require('sharp'),fs=require('node:fs');
const {digest,readCache,cacheEntry,cacheMatches}=require('./asset-cache.cjs');
const {splitSilhouettes}=require('./sprite-components.cjs');
const {writeAsset}=require('./write-asset.cjs');
const breeds=['cockatoo','macaw','cockatiel','parrotlet','lovebird'];
const range=(start,n)=>Array.from({length:n},(_,i)=>start+i);
const actions={IDLE:range(0,4),WALK:range(4,8),CHIRP:range(12,4),CLIMB:range(16,4),FLY:range(20,4),DISPLAY:range(24,4),SLEEP:range(28,4),CARRY:range(32,4),LAND:range(36,4)};
const sleepFixes={macaw:{file:'assets/parrots/macaw-sleep-v2-sheet.png',frames:[2,3]},parrotlet:{file:'assets/parrots/parrotlet-sleep-v2-sheet.png',frames:[2]},lovebird:{file:'assets/parrots/lovebird-sleep-v2-sheet.png',frames:[3]}};
const outputFiles=breed=>Object.entries(actions).flatMap(([action,indices])=>[...indices.map((_,i)=>`public/sprites/parrot-${breed}-${action}-frame-${i}.png`),`public/sprites/parrot-${breed}-${action}-atlas.png`]);
async function build({force=false}={}){
 const cacheFile='assets/parrots/generated-manifest.json',cache=readCache(cacheFile);
 const pipeline=digest(Buffer.concat(['scripts/parrot-sprites.cjs','scripts/sprite-components.cjs','scripts/write-asset.cjs','scripts/asset-cache.cjs'].map(file=>Buffer.from(file+'\0'+fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')+'\0')).concat(Buffer.from(sharp.versions.sharp))));
 let rebuilt=0,cached=0;
 for(const breed of breeds){
  const walkFile=`assets/parrots/${breed}-walk-v2-sheet.png`;
  const files=outputFiles(breed),key=digest(Buffer.concat([Buffer.from(pipeline),fs.readFileSync(`assets/parrots/${breed}-sheet.png`),fs.readFileSync(walkFile),...(sleepFixes[breed]?[fs.readFileSync(sleepFixes[breed].file)]:[])]));
  if(!force&&cacheMatches(cache[breed],key,files)){cached++;continue;}
  rebuilt++;
  const {data,info}=await sharp(`assets/parrots/${breed}-sheet.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const poses=splitSilhouettes(data,info.width,info.height,4,10,{ordered:'rows',threshold:64});
  const scale=Math.min(88/Math.max(...poses.map(p=>p.width)),94/Math.max(...poses.map(p=>p.height)));
  const cells=await Promise.all(poses.map(async p=>{
   const width=Math.max(1,Math.round(p.width*scale)),height=Math.max(1,Math.round(p.height*scale));
   const input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height).png().toBuffer();
   return sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((100-width)/2),top:103-height}]).png().toBuffer();
  }));
  // Complete painted bird poses: no separate legs, rigging or runtime deformation.
  // Use one scale for the entire stride so lifting a foot cannot resize the body.
  {
   const {data:rgba,info:meta}=await sharp(walkFile).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const corrected=splitSilhouettes(rgba,meta.width,meta.height,4,2,{ordered:'rows',threshold:64});
   const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
   const targetWidth=median(poses.slice(4,12).map(p=>p.width))*scale;
   const targetHeight=median(poses.slice(4,12).map(p=>p.height))*scale;
   const walkScale=Math.min(targetWidth/median(corrected.map(p=>p.width)),targetHeight/median(corrected.map(p=>p.height)),92/Math.max(...corrected.map(p=>p.width)),96/Math.max(...corrected.map(p=>p.height)));
   for(const [i,p]of corrected.entries()){
    const width=Math.max(1,Math.round(p.width*walkScale)),height=Math.max(1,Math.round(p.height*walkScale));
    const input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height).png().toBuffer();
    cells[4+i]=await sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((100-width)/2),top:103-height}]).png().toBuffer();
   }
  }
  // Override only reviewed sleep poses. Other cells retain their exact original bytes.
  if(sleepFixes[breed]){
   const fix=sleepFixes[breed],{data:rgba,info:meta}=await sharp(fix.file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const corrected=splitSilhouettes(rgba,meta.width,meta.height,2,2,{ordered:'rows',threshold:64});
   const good=poses[28],targetWidth=Math.round(good.width*scale),targetHeight=Math.round(good.height*scale);
   for(const index of fix.frames){
    const p=corrected[index],fixScale=Math.min(targetHeight/p.height,targetWidth*1.1/p.width),width=Math.max(1,Math.round(p.width*fixScale)),height=Math.max(1,Math.round(p.height*fixScale));
    if(width>92||height>98)throw Error('Corrected sleep pose exceeds existing frame');
    const input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height).png().toBuffer();
    cells[28+index]=await sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((100-width)/2),top:103-height}]).png().toBuffer();
   }
  }
  for(const [action,indices]of Object.entries(actions)){
   const selected=indices.map(i=>cells[i]),base=`public/sprites/parrot-${breed}-${action}`;
   for(let i=0;i<selected.length;i++)await writeAsset(`${base}-frame-${i}.png`,selected[i]);
   await writeAsset(`${base}-atlas.png`,await sharp({create:{width:100*selected.length,height:110,channels:4,background:'#00000000'}}).composite(selected.map((input,i)=>({input,left:i*100,top:0}))).png().toBuffer());
  }
  cache[breed]=cacheEntry(key,files);
 }
 await writeAsset(cacheFile,Buffer.from(JSON.stringify(Object.fromEntries(breeds.map(b=>[b,cache[b]])),null,2)+'\n'));
 console.log(`Five parrots ready: ${rebuilt} regenerated, ${cached} verified from content cache`);
 return {rebuilt,cached};
}
if(require.main===module)build({force:process.argv.includes('--force')}).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={breeds,actions,build};
