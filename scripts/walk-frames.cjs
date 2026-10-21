const sharp=require('sharp');
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
// Use the face silhouette, not a reaching paw or a moving tail, as the anchor.
function headAnchor({rgba,width,height}){
 let right=-1;
 for(let y=0;y<Math.floor(height*.58);y++)for(let x=Math.floor(width*.55);x<width;x++)if(rgba[(y*width+x)*4+3]>=192)right=Math.max(right,x);
 if(right<0)throw Error('Walk frame has no opaque head anchor');
 return right;
}
async function walkFrames(poses,targetHeight,targetWidth=90,referenceHeadX){
 if(poses.length!==8)throw Error('A walk cycle requires eight complete poses');
 const anchors=poses.map(headAnchor),leftSpan=Math.max(...anchors),rightSpan=Math.max(...poses.map((p,i)=>p.width-anchors[i]));
 const scale=Math.min(targetHeight/median(poses.map(p=>p.height)),Math.min(90,targetWidth)/(leftSpan+rightSpan),96/Math.max(...poses.map(p=>p.height)));
 const minHeadX=5+leftSpan*scale,maxHeadX=95-rightSpan*scale;
 const headX=Math.max(minHeadX,Math.min(maxHeadX,referenceHeadX??minHeadX));
 return Promise.all(poses.map(async(p,i)=>{
  const width=Math.max(1,Math.round(p.width*scale)),height=Math.max(1,Math.round(p.height*scale));
  const input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
  const left=Math.max(4,Math.min(96-width,Math.round(headX-anchors[i]*scale)));
  return sharp({create:{width:100,height:110,channels:4,background:'#00000000'}}).composite([{input,left,top:104-height}]).png().toBuffer();
 }));
}
module.exports={headAnchor,walkFrames};
