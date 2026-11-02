// Offline raster authoring only. The application never runs this deformation.
// A single continuous image field keeps feathers, belly, flippers and feet joined.
const fs=require('node:fs'),sharp=require('sharp');
const {monkeyCutouts:wholeCutouts}=require('./monkey-cutouts.cjs');
const breeds=['emperor','adelie','gentoo','rockhopper','little'],S=6,W=100,H=110;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function step(phase){phase=((phase%1)+1)%1;return phase<.62?{x:3.2-6.4*phase/.62,y:0}:{x:-3.2+6.4*(phase-.62)/.38,y:-1.8*Math.sin(Math.PI*(phase-.62)/.38)};}
function field(x,y,i){
 const a=step(i/16),b=step(i/16+.5),phase=i*Math.PI/8;
 const feet=clamp((y-89)/12,0,1),right=clamp((x-48)/9,0,1);
 const lateral=1.25*Math.sin(phase),vertical=-.45*(1-Math.cos(phase*2))+.035*Math.sin(phase)*(x-50);
 return {x:lateral*(1-feet)+(a.x*(1-right)+b.x*right)*feet,y:vertical*(1-feet)+(a.y*(1-right)+(b.y+1)*right)*feet};
}
async function author(breed){
 if(!breeds.includes(breed))throw Error('Unknown penguin');
 const {data,info}=await sharp(`assets/penguins/${breed}-sheet.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true}),poses=wholeCutouts(data,info.width,info.height,10),p=poses[0];
 const scale=Math.min(88/Math.max(...poses.map(p=>p.width)),94/Math.max(...poses.map(p=>p.height))),w=Math.round(p.width*scale),h=Math.round(p.height*scale),left=Math.round((100-w)/2),top=103-h;
 const input=await sharp(p.rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(w*S,h*S).png().toBuffer(),source=await sharp({create:{width:W*S,height:H*S,channels:4,background:'#00000000'}}).composite([{input,left:left*S,top:top*S}]).raw().toBuffer(),frames=[];
 for(let i=0;i<16;i++){
  const out=Buffer.alloc(source.length);
  for(let y=0;y<H*S;y++)for(let x=0;x<W*S;x++){
   let sx=x/S,sy=y/S;
   for(let n=0;n<8;n++){const d=field(sx,sy,i);sx=x/S-d.x;sy=y/S-d.y;}
   sx*=S;sy*=S;const x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0,to=(y*W*S+x)*4;
   let alpha=0,r=0,g=0,b=0;
   for(const [xx,yy,weight]of [[x0,y0,(1-fx)*(1-fy)],[x0+1,y0,fx*(1-fy)],[x0,y0+1,(1-fx)*fy],[x0+1,y0+1,fx*fy]]){
    if(xx<0||xx>=W*S||yy<0||yy>=H*S)continue;
    const at=(yy*W*S+xx)*4,a=source[at+3]*weight;alpha+=a;r+=source[at]*a;g+=source[at+1]*a;b+=source[at+2]*a;
   }
   if(alpha){out[to]=Math.round(r/alpha);out[to+1]=Math.round(g/alpha);out[to+2]=Math.round(b/alpha);out[to+3]=Math.round(alpha);}
  }
  const native=await sharp(out,{raw:{width:W*S,height:H*S,channels:4}}).resize(W,H).ensureAlpha().raw().toBuffer();
  for(let y=104;y<H;y++)for(let x=0;x<W;x++)native[(y*W+x)*4+3]=0;
  frames.push(await sharp(native,{raw:{width:W,height:H,channels:4}}).png({compressionLevel:9,palette:false}).toBuffer());
 }
 const sheet=await sharp({create:{width:400,height:440,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%4*100,top:Math.floor(i/4)*110}))).png({compressionLevel:9,palette:false}).toBuffer();
 fs.writeFileSync(`assets/penguins/${breed}-walk-v2-sheet.png`,sheet);
 console.log('Whole PNG stride authored: '+breed);
}
(async()=>{for(const b of process.argv[2]?[process.argv[2]]:breeds)await author(b);})().catch(e=>{console.error(e);process.exitCode=1;});
