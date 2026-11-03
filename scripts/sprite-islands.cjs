// Separate complete painted sprites by alpha connectivity, not an assumed grid.
// This is packing/cropping only; source artwork remains unchanged.
function islands(data,w,h){const labels=new Uint32Array(w*h),queue=new Int32Array(w*h),components=[];let label=0;
 for(let p=0;p<w*h;p++){if(labels[p]||data[p*4+3]<=48)continue;let head=0,tail=1,l=w,t=h,r=0,b=0;queue[0]=p;labels[p]=++label;
  while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;const n=ny*w+nx;if(!labels[n]&&data[n*4+3]>48){labels[n]=label;queue[tail++]=n;}}}
  if(tail>256)components.push({label,area:tail,left:l,top:t,width:r-l+1,height:b-t+1,cx:(l+r)/2,cy:(t+b)/2});
 }return {labels,components};
}
function isolate(image,component,labels){const {data,info}=image,c=component,left=Math.max(0,c.left-1),top=Math.max(0,c.top-1),width=Math.min(info.width-left,c.width+2),height=Math.min(info.height-top,c.height+2),out=Buffer.alloc(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const sx=left+x,sy=top+y,p=sy*info.width+sx;let keep=labels[p]===c.label;if(!keep&&data[p*4+3]>0)for(let dy=-1;dy<=1&&!keep;dy++)for(let dx=-1;dx<=1&&!keep;dx++){const xx=sx+dx,yy=sy+dy;if(xx>=0&&xx<info.width&&yy>=0&&yy<info.height&&labels[yy*info.width+xx]===c.label)keep=true;}if(keep)data.copy(out,(y*width+x)*4,p*4,p*4+4);}
 return {data:out,info:{width,height,channels:4}};
}
module.exports={islands,isolate};
