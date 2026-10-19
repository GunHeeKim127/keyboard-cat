// Extract frames from the user's illustrated sheet, removing only edge-connected dark background.
const sharp=require('sharp');const fs=require('node:fs');
const specs={IDLE:{x:80,y:61,w:80,h:80,n:8},WALK:{x:80,y:142,w:80,h:80,n:9},JUMP:{x:80,y:222,w:80,h:99,n:7},DASH:{x:160,y:401,w:80,h:80,n:6},ATTACK:{x:160,y:481,w:80,h:80,n:5},SLEEP:{x:160,y:722,w:80,h:78,n:5}};
(async()=>{for(const [name,s]of Object.entries(specs))for(let f=0;f<s.n;f++){
 const {data,info}=await sharp('public/sprites/source.png').extract({left:s.x+f*s.w,top:s.y,width:s.w,height:s.h}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(s.w*s.h),queue=[];
 const add=(x,y)=>{if(x<0||y<0||x>=s.w||y>=s.h)return;const p=y*s.w+x;if(seen[p])return;seen[p]=1;const i=p*4;if(Math.max(data[i],data[i+1],data[i+2])<150){data[i+3]=0;queue.push(p);}};
 for(let x=0;x<s.w;x++){add(x,0);add(x,s.h-1);}for(let y=0;y<s.h;y++){add(0,y);add(s.w-1,y);}
 for(let k=0;k<queue.length;k++){const p=queue[k],x=p%s.w,y=Math.floor(p/s.w);add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);}
 // Same canvas for every state keeps feet and animation scale aligned.
 await sharp(data,{raw:{width:s.w,height:s.h,channels:4}}).extend({top:110-s.h,bottom:0,left:10,right:10,background:{r:0,g:0,b:0,alpha:0}}).png().toFile(`public/sprites/${name}-${f}.png`);
 }fs.writeFileSync('public/sprites/frames.json',JSON.stringify(specs,null,2));console.log('Extracted 40 frames');})();
