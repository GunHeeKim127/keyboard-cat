const sharp=require('sharp'),fs=require('node:fs'),path=require('node:path');
const cats=['original','ragdoll','russian-blue','norwegian-forest','siamese','persian'],dogs=['chihuahua','jindo','retriever','shiba','husky'];
const actions=['IDLE','WALK','JUMP','FALL','LAND','DASH','ATTACK','SLEEP','CARRY','CLIMB'];
const names={'ragdoll':'랙돌','russian-blue':'러시안 블루','norwegian-forest':'노르웨이 숲',siamese:'샴',persian:'페르시안',chihuahua:'치와와',jindo:'진돗개',retriever:'리트리버',shiba:'시바견',husky:'허스키'};
const directory=path.resolve(process.argv[2]||'work/motion-review');fs.mkdirSync(directory,{recursive:true});
function file(kind,breed,action,i=0){return breed==='original'?`public/sprites/${action==='CARRY'?'carry':action+'-'+i}.png`:`public/sprites/${kind}-${breed}-${action}-frame-${i}.png`;}
function svg(width,height,body){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#182436"/><style>text{font-family:Malgun Gothic,sans-serif;fill:#e3ebf7;font-size:13px}</style>${body}</svg>`);}
async function audit(kind,breeds){
 const width=1250,height=35+breeds.length*150,parts=[];let labels='';
 for(const [i,breed]of breeds.entries()){
  labels+=`<text x="8" y="${90+i*150}">${names[breed]||breed}</text>`;
  for(const [j,action]of actions.entries()){
   const x=125+j*112,y=35+i*150;
   labels+=`<text x="${x}" y="${y+10}">${action}</text>`;
   parts.push({input:await sharp(file(kind,breed,action)).resize(100,110,{fit:'contain',kernel:'nearest',background:'#00000000'}).png().toBuffer(),left:x,top:y+20});
  }
 }
 await sharp(svg(width,height,labels)).composite(parts).png().toFile(path.join(directory,`motion-audit-${kind}.png`));
}
async function walkGif(kind,breeds){
 const width=800,height=185,frames=[];
 const labels=breeds.map((b,i)=>`<text x="${i*160+30}" y="28">${names[b]}</text>`).join('');
 for(let frame=0;frame<8;frame++){
  const parts=[];
  for(const [i,breed]of breeds.entries())parts.push({input:await fs.promises.readFile(file(kind,breed,'WALK',frame)),left:i*160+30,top:48});
  frames.push(await sharp(svg(width,height,labels)).composite(parts).ensureAlpha().raw().toBuffer());
 }
 await sharp(Buffer.concat(frames),{raw:{width,height:height*8,channels:4,pageHeight:height}}).gif({delay:Array(8).fill(200),loop:0,effort:7}).toFile(path.join(directory,`walk-${kind}.gif`));
}
(async()=>{await audit('cat',cats);await audit('dog',dogs);await walkGif('cat',cats.slice(1));await walkGif('dog',dogs);console.log(directory);})().catch(error=>{console.error(error);process.exitCode=1;});
