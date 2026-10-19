const sharp=require('sharp');
const frames={IDLE:8,WALK:9,JUMP:7,DASH:6,ATTACK:5,SLEEP:5};
(async()=>{for(const [name,n]of Object.entries(frames))await sharp({create:{width:100*n,height:110,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(Array.from({length:n},(_,i)=>({input:`public/sprites/${name}-${i}.png`,left:i*100,top:0}))).png().toFile(`public/sprites/${name}-atlas.png`);console.log('6 animation atlases ready');})();
