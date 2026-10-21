// A generated sheet can cross its nominal grid. Label complete alpha silhouettes
// first, then assign each silhouette by its centroid, rather than clipping cells.
function splitSilhouettes(data,width,height,columns,rows,{threshold=32,minArea=800,ordered=false}={}){
 if(data.length!==width*height*4)throw Error('Expected RGBA sprite sheet');
 const labels=new Int32Array(width*height),queue=new Int32Array(width*height),slots=Array(columns*rows).fill(null);
 let id=0;const found=[];
 for(let p=0;p<labels.length;p++){
  if(labels[p]||data[p*4+3]<threshold)continue;
  id++;let length=1,head=0,left=width,top=height,right=0,bottom=0,sumX=0,sumY=0;queue[0]=p;labels[p]=id;
  while(head<length){
   const at=queue[head++],x=at%width,y=Math.floor(at/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);sumX+=x;sumY+=y;
   for(const next of [at-1,at+1,at-width,at+width]){
    if(next<0||next>=labels.length||labels[next]||Math.abs(next%width-x)>1||data[next*4+3]<threshold)continue;
    labels[next]=id;queue[length++]=next;
   }
  }
  if(length<minArea)continue;
  const centerX=sumX/length,centerY=sumY/length,index=Math.min(rows-1,Math.floor(centerY/height*rows))*columns+Math.min(columns-1,Math.floor(centerX/width*columns));
  const component={id,left,top,right,bottom,centerX,centerY,area:length};
  if(ordered){found.push(component);continue;}
  if(slots[index])throw Error(`Multiple silhouettes in sprite slot ${index}`);
  slots[index]=component;
 }
 if(ordered){if(found.length!==columns*rows)throw Error(`Expected ${columns*rows} ordered cutouts, found ${found.length}`);found.sort((a,b)=>a.centerX-b.centerX).forEach((s,i)=>slots[i]=s);}
 if(slots.some(s=>!s))throw Error('Missing sprite silhouette');
 return slots.map(s=>{
  const w=s.right-s.left+1,h=s.bottom-s.top+1,rgba=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const original=(s.top+y)*width+s.left+x;if(labels[original]!==s.id)continue;
   data.copy(rgba,(y*w+x)*4,original*4,original*4+4);
  }
  return {...s,width:w,height:h,rgba};
 });
}
module.exports={splitSilhouettes};
