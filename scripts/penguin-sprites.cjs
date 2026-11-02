// Penguin-only asset build. All poses are complete painted birds, never limb rigs.
const fs=require('node:fs'),sharp=require('sharp');
const {monkeyCutouts:wholeCutouts}=require('./monkey-cutouts.cjs');
const {digest,readCache,cacheEntry,cacheMatches}=require('./asset-cache.cjs');
const {writeAsset}=require('./write-asset.cjs');
const breeds=['emperor','adelie','gentoo','rockhopper','little'];
const range=(start,n)=>Array.from({length:n},(_,i)=>start+i);
const actions={IDLE:range(0,4),WALK:range(4,16),CALL:range(12,4),SLIDE:range(16,4),SWIM:range(20,4),DISPLAY:range(24,4),SLEEP:range(28,4),CARRY:range(32,4),LAND:range(36,4)};
const outputs=b=>Object.entries(actions).flatMap(([a,ids])=>[...ids.map((_,i)=>`public/sprites/penguin-${b}-${a}-frame-${i}.png`),`public/sprites/penguin-${b}-${a}-atlas.png`]);
const png={compressionLevel:9,palette:false};
async function build(){
 const manifest='assets/penguins/generated-manifest.json',cache=readCache(manifest);
 const pipeline=digest(Buffer.concat(['scripts/penguin-sprites.cjs','scripts/monkey-cutouts.cjs','scripts/asset-cache.cjs','scripts/write-asset.cjs'].map(f=>Buffer.from(fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'))).concat(Buffer.from(sharp.versions.sharp))));
 let rebuilt=0;
 for(const breed of breeds){
  const file=`assets/penguins/${breed}-sheet.png`,walk=`assets/penguins/${breed}-walk-v2-sheet.png`,fix=breed==='gentoo'?'assets/penguins/gentoo-slide-sheet.png':undefined,files=outputs(breed),key=digest(Buffer.concat([Buffer.from(pipeline),fs.readFileSync(file),fs.readFileSync(walk),...(fix?[fs.readFileSync(fix)]:[])]));
  if(cacheMatches(cache[breed],key,files))continue;
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),poses=wholeCutouts(data,info.width,info.height,10);
  // One scale for every action: a sleeping/swimming bird keeps the same head size.
  const scale=Math.min(88/Math.max(...poses.map(p=>p.width)),94/Math.max(...poses.map(p=>p.height)));
  const cells=await Promise.all(poses.map(async p=>{const w=Math.max(1,Math.round(p.width*scale)),h=Math.max(1,Math.round(p.height*scale));const input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(w,h).png(png).toBuffer();return sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((100-w)/2),top:103-h}]).png(png).toBuffer();}));
  const walkMeta=await sharp(walk).metadata();if(walkMeta.width!==400||walkMeta.height!==440)throw Error('Expected sixteen finished 100x110 walk cells');
  // Finished whole-body cells have one shared canvas and ground; do not recenter each frame.
  const walkFrames=await Promise.all(Array.from({length:16},(_,i)=>sharp(walk).extract({left:i%4*100,top:Math.floor(i/4)*110,width:100,height:110}).png(png).toBuffer()));
  if(fix){
   const {data:rgba,info:meta}=await sharp(fix).ensureAlpha().raw().toBuffer({resolveWithObject:true}),corrected=wholeCutouts(rgba,meta.width,meta.height,1);
   // Match the original horizontal swimming body, without stretching or per-frame resizing.
   const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)],target=median(poses.slice(20,24).map(p=>p.width))*scale,fixScale=Math.min(target/median(corrected.map(p=>p.width)),88/Math.max(...corrected.map(p=>p.width)));
   for(const [i,p]of corrected.entries()){const w=Math.round(p.width*fixScale),h=Math.round(p.height*fixScale),input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(w,h).png(png).toBuffer();cells[16+i]=await sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((100-w)/2),top:103-h}]).png(png).toBuffer();}
  }
  for(const [action,ids]of Object.entries(actions)){const base=`public/sprites/penguin-${breed}-${action}`,frames=action==='WALK'?walkFrames:ids.map(i=>cells[i]);for(const [i,frame]of frames.entries())await writeAsset(`${base}-frame-${i}.png`,frame);const atlas=Buffer.alloc(frames.length*100*110*4);for(const [i,frame]of frames.entries()){const rgba=await sharp(frame).ensureAlpha().raw().toBuffer();for(let y=0;y<110;y++)rgba.copy(atlas,(y*frames.length*100+i*100)*4,y*400,(y+1)*400);}await writeAsset(`${base}-atlas.png`,await sharp(atlas,{raw:{width:frames.length*100,height:110,channels:4}}).png(png).toBuffer());}
  cache[breed]=cacheEntry(key,files);rebuilt++;
 }
 await writeAsset(manifest,Buffer.from(JSON.stringify(cache,null,2)+'\n'));
 console.log(`Penguin sheets ready: ${rebuilt} rebuilt, ${breeds.length-rebuilt} cached`);
}
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={build,breeds,actions};
