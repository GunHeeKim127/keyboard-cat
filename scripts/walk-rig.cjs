const sharp=require('sharp');
const {splitSilhouettes}=require('./sprite-components.cjs');
const gait=require('../electron/walk-gait.json');
const WALK_FRAMES=16;
// A planted paw moves back at constant speed. Only the returning paw lifts.
function footPhase(phase){
 const p=((phase%1)+1)%1,stance=gait.stance;
 if(p<stance)return {x:1-2*p/stance,lift:0};
 const t=(p-stance)/(1-stance);
 return {x:-Math.cos(Math.PI*t),lift:Math.sin(Math.PI*t)**2};
}
// Fixed bone lengths, with the fore elbow back and hind stifle forward.
function solveJoint(root,end,upper,lower,hind=false){
 const dx=end.x-root.x,dy=end.y-root.y,d=Math.hypot(dx,dy);
 if(d>=upper+lower||d<=Math.abs(upper-lower))throw Error('Unreachable paw target');
 const along=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-along*along))*(hind?-1:1);
 return {x:root.x+dx/d*along-dy/d*bend,y:root.y+dy/d*along+dx/d*bend};
}
function limbPose(phase,length,hind=false,far=false,bob=0){
 const foot=footPhase(phase),root={x:0,y:bob},pawHeight=length*.15;
 const sole={x:foot.x*gait.stridePixels/2,y:length-(far?2:0)-foot.lift*4.5};
 const ankle={x:sole.x,y:sole.y-pawHeight},upper=length*.46,lower=length*.46;
 return {root,joint:solveJoint(root,ankle,upper,lower,hind),ankle,sole,upper,lower,pawHeight,planted:foot.lift===0};
}
// Texture each articulated segment; the planted paw stays horizontal.
function skin(uri,width,height,pose,id){
 const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 const upper=t=>mix(pose.root,pose.joint,t/.45),lower=t=>mix(pose.joint,pose.ankle,(t-.45)/.4),paw=t=>mix(pose.ankle,pose.sole,(t-.85)/.15);
 const blend=(a,b,t)=>{const u=Math.max(0,Math.min(1,t)),s=u*u*(3-2*u);return mix(a,b,s);};
 function center(t){if(t<.37)return upper(t);if(t<.53)return blend(upper(t),lower(t),(t-.37)/.16);if(t<.78)return lower(t);if(t<.92)return blend(lower(t),paw(t),(t-.78)/.14);return paw(t);}
 const vertices=[];
 for(let i=0;i<=24;i++){
  const c=center(i/24);
  // Horizontal skin sections cannot fold over at a tightly flexed little joint.
  vertices.push([{x:c.x-width/2,y:c.y},{x:c.x+width/2,y:c.y}]);
 }
 let triangles=`<defs><image id="${id}-texture" href="${uri}" width="${width}" height="${height}" preserveAspectRatio="none"/></defs>`;
 for(let i=0;i<24;i++){
  const y0=i/24*height,y1=(i+1)/24*height,dy=y1-y0,[l0,r0]=vertices[i],[l1,r1]=vertices[i+1];
  const matrices=[[(r0.x-l0.x)/width,(r0.y-l0.y)/width,(l1.x-l0.x)/dy,(l1.y-l0.y)/dy,l0.x-(l1.x-l0.x)/dy*y0,l0.y-(l1.y-l0.y)/dy*y0],[(r1.x-l1.x)/width,(r1.y-l1.y)/width,(r1.x-r0.x)/dy,(r1.y-r0.y)/dy,0,0]];
  matrices[1][4]=r1.x-matrices[1][0]*width-matrices[1][2]*y1;matrices[1][5]=r1.y-matrices[1][1]*width-matrices[1][3]*y1;
  for(let j=0;j<2;j++){
   const clip=`${id}-${i}-${j}`,points=j?[r1,l1,r0]:[l0,r0,l1];
   const path=points.map((p,k)=>(k?'L':'M')+p.x+' '+p.y).join('')+'Z';
   triangles+=`<clipPath id="${clip}"><path d="${path}"/></clipPath><g clip-path="url(#${clip})"><use href="#${id}-texture" transform="matrix(${matrices[j].join(' ')})"/></g>`;
  }
 }
 return triangles;
}
async function rigFrames(file,targetHeight,targetWidth=90,referenceHeadX=90){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const parts=splitSilhouettes(data,info.width,info.height,3,1,{ordered:true});
 // Match the oversampled render size rather than decoding full source layers
 // for every mesh triangle (which can exhaust the SVG renderer's resources).
 const uris=await Promise.all(parts.map(async(p,i)=>'data:image/png;base64,'+(await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize({height:i===0?384:128,withoutEnlargement:true,kernel:'nearest'}).png().toBuffer()).toString('base64')));
 const [body,front,hind]=parts;
 const scale=Math.min((Math.min(86,targetWidth-2))/body.width,Math.min(targetHeight*.79,targetHeight-14.5)/body.height),w=body.width*scale,h=body.height*scale,left=Math.min(94-w,Math.max(5,referenceHeadX-w)),bottom=90,top=bottom-h;
 const legHeight=Math.min(30,targetHeight*.36),legTop=104-legHeight;
 const legs=[{name:'far-hind',x:.26,part:hind,uri:uris[2],far:true,hind:true},{name:'far-front',x:.72,part:front,uri:uris[1],far:true,hind:false},{name:'near-hind',x:.22,part:hind,uri:uris[2],far:false,hind:true},{name:'near-front',x:.68,part:front,uri:uris[1],far:false,hind:false}];
 const frames=[];
 for(let i=0;i<WALK_FRAMES;i++){
  const phase=i/WALK_FRAMES,bob=.35*Math.sin(4*Math.PI*phase);
  const images=legs.map(leg=>{
   const pose=limbPose(phase+gait.phases[leg.name],legHeight,leg.hind,leg.far,bob),width=Math.min(leg.hind?14:12,legHeight*leg.part.width/leg.part.height);
   const x=left+w*leg.x,y=legTop,id=leg.name;
   return `<g ${leg.far?'filter="url(#far)"':''} transform="translate(${x} ${y})">${skin(leg.uri,width,legHeight,pose,id)}</g>`;
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="110"><defs><filter id="far"><feComponentTransfer><feFuncR type="linear" slope=".8"/><feFuncG type="linear" slope=".8"/><feFuncB type="linear" slope=".8"/></feComponentTransfer></filter><linearGradient id="join" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset=".65" stop-color="white"/></linearGradient><mask id="join-mask" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#join)"/></mask></defs>${images.slice(0,2).join('')}<image href="${uris[0]}" x="${left}" y="${top+bob}" width="${w}" height="${h}" preserveAspectRatio="none"/><g mask="url(#join-mask)">${images.slice(2).join('')}</g></svg>`;
  if(/(?:matrix\(| d=")[^"<>]*(?:NaN|Infinity)/.test(svg))throw Error(`Invalid mesh coordinates: ${file} ${i}`);
  try{frames.push(await sharp(Buffer.from(svg),{density:288}).resize(100,110).png().toBuffer());}
  catch(error){throw new Error(`Cannot render ${file} frame ${i}`,{cause:error});}
 }
 return frames;
}
module.exports={WALK_FRAMES,footPhase,solveJoint,limbPose,rigFrames};
