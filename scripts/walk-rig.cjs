const sharp=require('sharp');
const {splitSilhouettes}=require('./sprite-components.cjs');
const WALK_FRAMES=16;
// A planted paw moves back at constant speed. Only the returning paw lifts.
function footPhase(phase){
 const p=((phase%1)+1)%1,stance=.625;
 if(p<stance)return {x:1-2*p/stance,lift:0};
 const t=(p-stance)/(1-stance);
 return {x:-Math.cos(Math.PI*t),lift:Math.sin(Math.PI*t)**2};
}
async function rigFrames(file,targetHeight,targetWidth=90,referenceHeadX=90){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const parts=splitSilhouettes(data,info.width,info.height,3,1,{ordered:true});
 const uris=await Promise.all(parts.map(async p=>'data:image/png;base64,'+(await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).png().toBuffer()).toString('base64')));
 const [body,front,hind]=parts;
 const scale=Math.min((Math.min(86,targetWidth-2))/body.width,Math.min(targetHeight*.79,targetHeight-14)/body.height),w=body.width*scale,h=body.height*scale,left=Math.min(94-w,Math.max(5,referenceHeadX-w)),bottom=90,top=bottom-h;
 const legHeight=Math.min(30,targetHeight*.36),legTop=104-legHeight;
 const legs=[{name:'far-hind',x:.35,phase:.25,part:hind,uri:uris[2],far:true},{name:'far-front',x:.8,phase:.5,part:front,uri:uris[1],far:true},{name:'near-hind',x:.22,phase:.75,part:hind,uri:uris[2],far:false},{name:'near-front',x:.68,phase:0,part:front,uri:uris[1],far:false}];
 const frames=[];
 for(let i=0;i<WALK_FRAMES;i++){
  const phase=i/WALK_FRAMES;
  const images=legs.map(leg=>{
   const foot=footPhase(phase+leg.phase),height=legHeight-(leg.far?2:0)-foot.lift*3.2,width=Math.min(16,legHeight*leg.part.width/leg.part.height),shift=foot.x*3.2;
   const x=left+w*leg.x-width*.5,y=legTop;
   // Shear keeps the shoulder/hip attached while the foot follows its arc.
   return `<g ${leg.far?'filter="url(#far)"':''} transform="translate(${x} ${y}) matrix(1 0 ${shift/height} 1 0 0)"><image href="${leg.uri}" width="${width}" height="${height}" preserveAspectRatio="none"/></g>`;
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="110"><defs><filter id="far"><feComponentTransfer><feFuncR type="linear" slope=".75"/><feFuncG type="linear" slope=".75"/><feFuncB type="linear" slope=".75"/></feComponentTransfer></filter><linearGradient id="join" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset=".35" stop-color="white"/></linearGradient><mask id="join-mask" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#join)"/></mask></defs>${images.slice(0,2).join('')}<image href="${uris[0]}" x="${left}" y="${top}" width="${w}" height="${h}" preserveAspectRatio="none"/><g mask="url(#join-mask)">${images.slice(2).join('')}</g></svg>`;
  frames.push(await sharp(Buffer.from(svg),{density:288}).resize(100,110).png().toBuffer());
 }
 return frames;
}
module.exports={WALK_FRAMES,footPhase,rigFrames};
