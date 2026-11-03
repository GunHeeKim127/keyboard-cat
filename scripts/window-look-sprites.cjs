const sharp=require('sharp'),{bounds}=require('./interaction-sprites.cjs'),{islands,isolate}=require('./sprite-islands.cjs');
const breeds=require('../assets/interactions/catalog.json').penguin;
(async()=>{
 const image=await sharp('assets/interactions/penguin-window-look-sheet.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const found=islands(image.data,image.info.width,image.info.height),ordered=found.components.sort((a,b)=>a.cy-b.cy);
 if(ordered.length!==40)throw Error('Expected 40 complete penguin look poses, got '+ordered.length);
 for(let row=0;row<breeds.length;row++){
  const [pet,breed]=breeds[row],poses=ordered.slice(row*8,row*8+8).sort((a,b)=>a.cx-b.cx).map(c=>{const raw=isolate(image,c,found.labels);return {raw,box:bounds(raw.data,raw.info.width,raw.info.height)};});
  const base=await sharp(`public/sprites/${pet}-${breed}-IDLE-frame-0.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=bounds(base.data,base.info.width,base.info.height);
  const scale=Math.min(b.height*110/base.info.height/poses[0].box.height,...poses.map(p=>94/p.box.width),...poses.map(p=>102/p.box.height));
  for(let i=0;i<8;i++){const p=poses[i],w=Math.max(1,Math.round(p.box.width*scale)),h=Math.max(1,Math.round(p.box.height*scale)),input=await sharp(p.raw.data,{raw:p.raw.info}).extract(p.box).resize(w,h,{kernel:'nearest'}).png().toBuffer();await sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:Math.floor((100-w)/2),top:106-h}]).png({compressionLevel:9}).toFile(`public/sprites/interaction-${pet}-${breed}-WINDOW_LOOK-frame-${i}.png`);}
 }
 console.log('Penguin window look: 40 frames');
})().catch(e=>{console.error(e);process.exitCode=1;});
