// Group detached fruit/branch fragments with their nearest whole-animal pose.
// Only monkey sheets use this extractor; no legacy crop rules are changed.
function monkeyCutouts(data,width,height,rows=10){
 const labels=new Int32Array(width*height),queue=new Int32Array(width*height),parts=[];let id=0;
 for(let p=0;p<labels.length;p++){
  if(labels[p]||data[p*4+3]<64)continue;
  id++;let head=0,n=1,left=width,top=height,right=0,bottom=0,sx=0,sy=0;queue[0]=p;labels[p]=id;
  while(head<n){const at=queue[head++],x=at%width,y=Math.floor(at/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);sx+=x;sy+=y;
   for(const next of [at-1,at+1,at-width,at+width]){if(next<0||next>=labels.length||labels[next]||Math.abs(next%width-x)>1||data[next*4+3]<64)continue;labels[next]=id;queue[n++]=next;}
  }
  if(n>=80)parts.push({id,area:n,left,top,right,bottom,cx:sx/n,cy:sy/n});
 }
 const count=rows*4;
 parts.sort((a,b)=>b.area-a.area);const anchors=parts.slice(0,count);if(anchors.length!==count||anchors.some(a=>a.area<800))throw Error('Missing complete monkey poses');
 anchors.sort((a,b)=>a.cy-b.cy);for(let r=0;r<rows;r++)anchors.splice(r*4,4,...anchors.slice(r*4,r*4+4).sort((a,b)=>a.cx-b.cx));
 const groups=anchors.map(a=>({...a,ids:new Set([a.id])}));
 for(const p of parts.slice(count)){const near=groups.reduce((best,a)=>{const distance=((a.cx-p.cx)/(width/4))**2+((a.cy-p.cy)/(height/rows))**2;return distance<best.distance?{a,distance}:best;},{distance:Infinity,a:groups[0]});if(near.distance>.65)continue;const a=near.a;a.ids.add(p.id);a.left=Math.min(a.left,p.left);a.top=Math.min(a.top,p.top);a.right=Math.max(a.right,p.right);a.bottom=Math.max(a.bottom,p.bottom);}
 return groups.map(p=>{const w=p.right-p.left+1,h=p.bottom-p.top+1,rgba=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=(p.top+y)*width+p.left+x;if(p.ids.has(labels[at]))data.copy(rgba,(y*w+x)*4,at*4,at*4+4);}return {...p,width:w,height:h,rgba};});
}
module.exports={monkeyCutouts};
