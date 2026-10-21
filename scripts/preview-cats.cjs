const sharp=require('sharp'),path=require('node:path'),fs=require('node:fs');
const breeds=[['original','Original · 기존'],['ragdoll','랙돌'],['russian-blue','러시안 블루'],['norwegian-forest','노르웨이 숲'],['siamese','샴'],['persian','페르시안']];
async function preview(destination){
 const width=960,height=590,parts=[];
 let svg=`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#101826"/><style>text{font-family:Malgun Gothic,sans-serif;fill:#edf1f9}</style><text x="26" y="36" font-size="21">고양이 품종 비교 · 기본 자세 / 목덜미 들기</text>`;
 for(const [i,[breed,name]]of breeds.entries()){
  const x=(i%3)*320,y=55+Math.floor(i/3)*265;
  svg+=`<rect x="${x+10}" y="${y}" width="300" height="250" rx="15" fill="#202c40"/><text x="${x+26}" y="${y+32}" font-size="20">${name}</text><text x="${x+26}" y="${y+231}" font-size="13" fill="#aab9d0">기본 자세</text><text x="${x+171}" y="${y+231}" font-size="13" fill="#aab9d0">목덜미 들기</text>`;
  for(const [j,action]of ['IDLE','CARRY'].entries()){
   const file=breed==='original'?`public/sprites/${action==='IDLE'?'IDLE-0':'carry'}.png`:`public/sprites/cat-${breed}-${action}-frame-0.png`;
   const input=await sharp(file).resize(140,154,{fit:'contain',kernel:'nearest',background:'#00000000'}).png().toBuffer();parts.push({input,left:x+20+j*145,top:y+51});
  }
 }
 svg+='</svg>';fs.mkdirSync(path.dirname(destination),{recursive:true});
 await sharp(Buffer.from(svg)).composite(parts).png().toFile(destination);
 console.log(destination);
}
preview(process.argv[2]||'work/cat-breeds-preview.png').catch(error=>{console.error(error);process.exitCode=1;});
