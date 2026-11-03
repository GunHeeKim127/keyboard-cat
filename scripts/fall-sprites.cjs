const fs=require('fs'),sharp=require('sharp'),{bounds,columns}=require('./interaction-sprites.cjs'),catalog=require('../assets/interactions/catalog.json'),{islands,isolate}=require('./sprite-islands.cjs');
(async()=>{let count=0;for(const [kind,breeds] of Object.entries(catalog)){
 const img=await sharp('assets/interactions/'+kind+'-fall-sheet.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const parts=islands(img.data,img.info.width,img.info.height),ordered=parts.components.sort((a,b)=>a.cy-b.cy);if(ordered.length!==breeds.length*6)throw Error('Fall sprite islands '+kind+' '+ordered.length);
 for(let row=0;row<breeds.length;row++){
  const [pet,breed]=breeds[row],poses=ordered.slice(row*6,row*6+6).sort((a,b)=>a.cx-b.cx).map(c=>{const raw=isolate(img,c,parts.labels);return {raw,box:bounds(raw.data,raw.info.width,raw.info.height)};});
  const old=await sharp(pet==='cat'&&breed==='original'?'public/sprites/IDLE-0.png':`public/sprites/${pet}-${breed}-IDLE-frame-0.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}),base=bounds(old.data,old.info.width,old.info.height),idle=poses[5].box;
  const scale=Math.min(base.width*100/old.info.width/idle.width,base.height*110/old.info.height/idle.height,...poses.map(p=>94/p.box.width),...poses.map(p=>102/p.box.height));
  for(let i=0;i<6;i++){const p=poses[i],w=Math.max(1,Math.round(p.box.width*scale)),h=Math.max(1,Math.round(p.box.height*scale)),input=await sharp(p.raw.data,{raw:p.raw.info}).extract(p.box).resize(w,h,{kernel:'nearest'}).png().toBuffer();await sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.floor((100-w)/2),top:106-h}]).png({compressionLevel:9}).toFile(`public/sprites/interaction-${pet}-${breed}-${i<4?'FALL_GROUND':'LAND_GROUND'}-frame-${i<4?i:i-4}.png`);count++;}
 }
}console.log('Fall/land sprites ready: '+count);})().catch(e=>{console.error(e);process.exitCode=1;});
