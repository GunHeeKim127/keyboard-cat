const sharp=require('sharp'),{bounds}=require('./interaction-sprites.cjs'),{islands,isolate}=require('./sprite-islands.cjs');
(async()=>{for(const [pet,breed] of require('../assets/interactions/catalog.json').parrot){
 const image=await sharp(`assets/interactions/parrot-${breed}-edge-sheet.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}),found=islands(image.data,image.info.width,image.info.height),ordered=found.components.sort((a,b)=>a.cy-b.cy);
 if(ordered.length!==16)throw Error('Expected 16 complete parrot edge poses: '+breed+' '+ordered.length);
 const poses=[];for(let row=0;row<4;row++)for(const part of ordered.slice(row*4,row*4+4).sort((a,b)=>a.cx-b.cx)){const raw=isolate(image,part,found.labels);poses.push({raw,box:bounds(raw.data,raw.info.width,raw.info.height)});}
 const base=await sharp(`public/sprites/parrot-${breed}-IDLE-frame-0.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=bounds(base.data,base.info.width,base.info.height);
 const scale=Math.min(b.height*110/base.info.height*1.3/poses[0].box.height,...poses.map(p=>90/p.box.width),...poses.map(p=>102/p.box.height));
 for(let i=0;i<16;i++){const p=poses[i],w=Math.max(1,Math.round(p.box.width*scale)),h=Math.max(1,Math.round(p.box.height*scale)),input=await sharp(p.raw.data,{raw:p.raw.info}).extract(p.box).resize(w,h,{kernel:'nearest'}).png().toBuffer();await sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left:94-w,top:106-h}]).png({compressionLevel:9}).toFile(`public/sprites/interaction-parrot-${breed}-EDGE_CLIMB-frame-${i}.png`);}
 }console.log('Parrot vertical climbing: 80 whole-body frames');})().catch(e=>{console.error(e);process.exitCode=1;});
