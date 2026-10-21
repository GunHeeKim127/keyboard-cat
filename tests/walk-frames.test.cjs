const {test}=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp'),crypto=require('node:crypto');
const {headAnchor,walkFrames}=require('../scripts/walk-frames.cjs');
const {splitSilhouettes}=require('../scripts/sprite-components.cjs');
const cats=['ragdoll','russian-blue','norwegian-forest','siamese','persian'],dogs=['chihuahua','jindo','retriever','shiba','husky'];
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
function bounds(data,width,height){let left=width,right=-1,top=height,bottom=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return {width:right-left+1,height:bottom-top+1,bottom};}
test('reaching paws do not move the head anchor and generated poses keep transparent borders',async()=>{
 const poses=Array.from({length:8},(_,i)=>{const width=90+i,height=80,rgba=Buffer.alloc(width*height*4);for(let y=10;y<30;y++)for(let x=55;x<80;x++)rgba[(y*width+x)*4+3]=255;for(let y=60;y<80;y++)for(let x=50;x<width;x++)rgba[(y*width+x)*4+3]=255;return {width,height,rgba};});
 assert.equal(new Set(poses.map(headAnchor)).size,1);
 const frames=await walkFrames(poses,70,90,85),anchors=[];
 for(const png of frames){const {data,info}=await sharp(png).raw().toBuffer({resolveWithObject:true});anchors.push(headAnchor({rgba:data,...info}));for(let y=0;y<110;y++)for(const x of [0,1,2,3,96,97,98,99])assert.equal(data[(y*100+x)*4+3],0);}
 assert.ok(Math.max(...anchors)-Math.min(...anchors)<=1);
 await assert.rejects(()=>walkFrames(poses.slice(1),70),/eight/);
});
test('all ten walking cycles have varied legs, bounded head drift and a stable floor',async()=>{
 for(const [kind,breeds]of [['cat',cats],['dog',dogs]])for(const breed of breeds){
  const anchors=[],legs=new Set();
  for(let i=0;i<16;i++){
   const {data,info}=await sharp(`public/sprites/${kind}-${breed}-WALK-frame-${i}.png`).raw().toBuffer({resolveWithObject:true});
   anchors.push(headAnchor({rgba:data,...info}));const box=bounds(data,info.width,info.height);assert.ok(box.bottom>=102&&box.bottom<=103,kind+' '+breed+' floor');
   legs.add(crypto.createHash('sha256').update(data.subarray(75*100*4)).digest('hex'));
  }
  assert.ok(Math.max(...anchors)-Math.min(...anchors)<=3,kind+' '+breed+' head jumped');
  assert.ok(legs.size>=6,kind+' '+breed+' repeated/static leg poses');
 }
});
test('new cat walking silhouettes do not exceed their previous walking size',async()=>{
 for(const breed of cats){
  const file=`assets/cats/${breed}-sheet${breed==='norwegian-forest'?'-v2':''}.png`,{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const source=splitSilhouettes(data,info.width,info.height,4,7),scale=Math.min(92/Math.max(...source.map(p=>p.width)),96/Math.max(...source.map(p=>p.height))),previous=source.slice(4,12);
  const widths=[],heights=[];
  for(let i=0;i<16;i++){const {data,info}=await sharp(`public/sprites/cat-${breed}-WALK-frame-${i}.png`).raw().toBuffer({resolveWithObject:true});const box=bounds(data,info.width,info.height);widths.push(box.width);heights.push(box.height);}
  assert.ok(median(heights)<=Math.round(median(previous.map(p=>p.height))*scale)+1,breed+' grew taller');
  assert.ok(Math.max(...widths)<=Math.round(Math.max(...previous.map(p=>p.width))*scale)+1,breed+' grew wider');
 }
});
