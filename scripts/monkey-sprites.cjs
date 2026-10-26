// New monkey artwork only: existing cats, dogs and parrots are never rewritten.
const fs=require('node:fs'),sharp=require('sharp');
const {monkeyCutouts}=require('./monkey-cutouts.cjs'),{writeAsset}=require('./write-asset.cjs');
const {digest,readCache,cacheEntry,cacheMatches}=require('./asset-cache.cjs');
const breeds=['capuchin','loris','tamarin','macaque','langur'];
const range=(s,n)=>Array.from({length:n},(_,i)=>s+i);
const actions={IDLE:range(0,4),WALK:range(4,8),FORAGE:range(12,4),CLIMB:range(16,4),TRAVEL:range(20,4),DISPLAY:range(24,4),SLEEP:range(28,4),CARRY:range(32,4),LAND:range(36,4)};
async function build(){
 const manifest='assets/monkeys/generated-manifest.json',cache=readCache(manifest);
 const pipeline=digest(Buffer.concat(['scripts/monkey-sprites.cjs','scripts/monkey-cutouts.cjs','scripts/write-asset.cjs'].map(p=>Buffer.from(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'))).concat(Buffer.from(sharp.versions.sharp))));
 let rebuilt=0;
 for(const breed of breeds){
  const source=`assets/monkeys/${breed}-sheet.png`,outputs=Object.entries(actions).flatMap(([a,frames])=>[...frames.map((_,i)=>`public/sprites/monkey-${breed}-${a}-frame-${i}.png`),`public/sprites/monkey-${breed}-${a}-atlas.png`]);
  const walkSource=`assets/monkeys/${breed}-walk-sheet.png`;
  const key=digest(Buffer.concat([Buffer.from(pipeline),fs.readFileSync(source),fs.readFileSync(walkSource)]));if(cacheMatches(cache[breed],key,outputs))continue;
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const poses=monkeyCutouts(data,info.width,info.height);
  // A shared scale preserves anatomy through every action, especially the stride.
  const scale=Math.min(90/Math.max(...poses.map(p=>p.width)),96/Math.max(...poses.map(p=>p.height)));
  const cells=await Promise.all(poses.map(async p=>{
   const w=Math.max(1,Math.round(p.width*scale)),h=Math.max(1,Math.round(p.height*scale));
   const input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(w,h,{kernel:'nearest'}).png().toBuffer();
   return sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((100-w)/2),top:103-h}]).png().toBuffer();
  }));
  const walk=await sharp(walkSource).ensureAlpha().raw().toBuffer({resolveWithObject:true}),steps=monkeyCutouts(walk.data,walk.info.width,walk.info.height,2);
  const median=v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)];
  const walkScale=Math.min(median(poses.slice(4,12).map(p=>p.width))*scale/median(steps.map(p=>p.width)),median(poses.slice(4,12).map(p=>p.height))*scale/median(steps.map(p=>p.height)),90/Math.max(...steps.map(p=>p.width)),96/Math.max(...steps.map(p=>p.height)));
  for(const [i,p]of steps.entries()){
   const w=Math.max(1,Math.round(p.width*walkScale)),h=Math.max(1,Math.round(p.height*walkScale)),input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(w,h,{kernel:'nearest'}).png().toBuffer();
   cells[4+i]=await sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.round((100-w)/2),top:103-h}]).png().toBuffer();
  }
  for(const [a,indices]of Object.entries(actions)){const selected=indices.map(i=>cells[i]),base=`public/sprites/monkey-${breed}-${a}`;for(let i=0;i<selected.length;i++)await writeAsset(`${base}-frame-${i}.png`,selected[i]);await writeAsset(`${base}-atlas.png`,await sharp({create:{width:100*selected.length,height:110,channels:4,background:'#00000000'}}).composite(selected.map((input,i)=>({input,left:i*100,top:0}))).png().toBuffer());}
  cache[breed]=cacheEntry(key,outputs);rebuilt++;
 }
 await writeAsset(manifest,Buffer.from(JSON.stringify(cache,null,2)+'\n'));console.log(`Monkey sheets ready: ${rebuilt} rebuilt, ${breeds.length-rebuilt} cached`);
}
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={build,breeds,actions};
