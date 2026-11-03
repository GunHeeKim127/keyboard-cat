const fs=require('fs'),path=require('path'),sharp=require('sharp');
const catalog=require('../assets/interactions/catalog.json'),{islands,isolate}=require('./sprite-islands.cjs');
const actions=['ENTER_FOLDER','EXIT_CLOSED_FOLDER','EXIT_WINDOW','PETTED'];
function bounds(raw,w,h){let l=w,t=h,r=-1,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(raw[(y*w+x)*4+3]>32){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}if(r<l)throw Error('Empty interaction pose');return {left:l,top:t,width:r-l+1,height:b-t+1};}
function columns(raw,w,h,top,bottom){const runs=[];let start=-1;for(let x=0;x<=w;x++){let n=0;if(x<w)for(let y=top;y<bottom;y++)if(raw[(y*w+x)*4+3]>160)n++;if(n>2&&start<0)start=x;else if(n<=2&&start>=0){runs.push([start,x]);start=-1;}}return [0,...runs.slice(0,-1).map((r,i)=>Math.floor((r[1]+runs[i+1][0])/2)),w];}
async function cut(image,r){return sharp(image.data,{raw:image.info}).extract(r).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
async function main(){let total=0;const report=[];
 for(const [kind,breeds] of Object.entries(catalog)){
  const file=path.join('assets/interactions',kind+'-sheet.png'),img=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const ys=kind==='cat'?[0,175,314,435,559,700,img.info.height]:[0,180,330,480,630,img.info.height];
  const refRow=kind==='monkey'?1:0;const xs=columns(img.data,img.info.width,img.info.height,ys[refRow],ys[refRow+1]);
  const count=xs.length-1;if(count!==15&&count!==16)throw Error('Unexpected interaction columns '+kind+' '+count);
  for(let row=0;row<breeds.length;row++){
   const [pet,breed]=breeds[row];const crops=[];
   for(let i=0;i<count;i++){const crop=await cut(img,{left:xs[i],top:ys[row],width:xs[i+1]-xs[i],height:ys[row+1]-ys[row]});const found=islands(crop.data,crop.info.width,crop.info.height),largest=found.components.sort((a,b)=>b.area-a.area)[0];if(!largest)throw Error('Empty sprite island');const edges=[0,0,0,0];for(let yy=0;yy<crop.info.height;yy++){if(found.labels[yy*crop.info.width]===largest.label)edges[0]++;if(found.labels[yy*crop.info.width+crop.info.width-1]===largest.label)edges[1]++;}for(let xx=0;xx<crop.info.width;xx++){if(found.labels[xx]===largest.label)edges[2]++;if(found.labels[(crop.info.height-1)*crop.info.width+xx]===largest.label)edges[3]++;}const clipped=i!==4&&i!==3&&Math.max(...edges)>Math.max(8,largest.height*.08);const clean=isolate(crop,largest,found.labels),box=bounds(clean.data,clean.info.width,clean.info.height);crops.push({crop:clean,box,clipped});}
   const original=pet==='cat'&&breed==='original'?'public/sprites/IDLE-0.png':`public/sprites/${pet}-${breed}-IDLE-frame-0.png`;
   const base=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true}),baseBox=bounds(base.data,base.info.width,base.info.height),first=crops[0].box;
   let scale=Math.min(baseBox.width*100/base.info.width/first.width,baseBox.height*110/base.info.height/first.height);
   scale=Math.min(scale,...crops.map(c=>94/c.box.width),...crops.map(c=>102/c.box.height));
   for(let a=0;a<4;a++)for(let i=0;i<4;i++){
    let c=crops[a*4+i]??crops[7];if(count===15&&a===3&&i===3)c=crops[7];if(c.clipped){const alternatives=crops.slice(a*4,Math.min(count,a*4+4)).filter((p,j)=>!p.clipped&&!(a===0&&j===3)&&!(a===1&&j===0));c=alternatives[i%Math.max(1,alternatives.length)]??{crop:base,box:baseBox,scale:Math.min(100/base.info.width,110/base.info.height)};}
    if(kind==='penguin'&&breed==='gentoo'&&a===3){const g=await sharp('assets/interactions/gentoo-petted-sheet.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),gx=columns(g.data,g.info.width,g.info.height,0,g.info.height);if(gx.length!==5)throw Error('Gentoo happy grid');const part=await cut(g,{left:gx[i],top:0,width:gx[i+1]-gx[i],height:g.info.height});c={crop:part,box:bounds(part.data,part.info.width,part.info.height)};const factor=Math.min(first.width/c.box.width,first.height/c.box.height);c.scale=scale*factor;}
    const factor=c.scale??scale,w=Math.max(1,Math.round(c.box.width*factor)),h=Math.max(1,Math.round(c.box.height*factor));
    const png=await sharp(c.crop.data,{raw:c.crop.info}).extract(c.box).resize(w,h,{kernel:'nearest'}).png().toBuffer();
    const out=`public/sprites/interaction-${pet}-${breed}-${actions[a]}-frame-${i}.png`;
    await sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input:png,left:Math.floor((100-w)/2),top:106-h}]).png({compressionLevel:9}).toFile(out);total++;
   }
   report.push({pet,breed,scale,columns:count});
  }
 }
 fs.mkdirSync('work/desktop-interactions',{recursive:true});fs.writeFileSync('work/desktop-interactions/sprite-build.json',JSON.stringify(report,null,2));console.log('Interaction sprites ready: '+total);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={bounds,columns};
