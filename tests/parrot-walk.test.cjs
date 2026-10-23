const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const breeds=['cockatoo','macaw','cockatiel','parrotlet','lovebird'];
test('only forty parrot walk poses and five walk atlases replace the 1.3.20 artwork',()=>{
 const walk=require('./fixtures/parrot-walk-v2.json');
 const expected=breeds.flatMap(b=>[...Array.from({length:8},(_,i)=>`public/sprites/parrot-${b}-WALK-frame-${i}.png`),`public/sprites/parrot-${b}-WALK-atlas.png`]).sort();
 assert.deepEqual(Object.keys(walk).sort(),expected);
 const baseline={...require('./fixtures/legacy-sprites-1.3.17.json'),...require('./fixtures/parrot-sprites-1.3.18.json'),...require('./fixtures/parrot-sleep-v2.json')};
 let preserved=0;
 for(const [file,hash]of Object.entries(baseline)){
  const bytes=fs.readFileSync(file),actual=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(actual,walk[file]??hash,file);
  if(walk[file])assert.notEqual(actual,hash,file);else preserved++;
 }
 assert.equal(preserved,643);
});
test('parrot walk frames have clear margins, consistent size, ground contact and matching atlas cells',async()=>{
 for(const b of breeds){
  const atlas=await sharp(`public/sprites/parrot-${b}-WALK-atlas.png`).raw().toBuffer();const heights=[];
  for(let i=0;i<8;i++){
   const {data,info}=await sharp(`public/sprites/parrot-${b}-WALK-frame-${i}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,100);assert.equal(info.height,110);
   let left=100,right=-1,top=110,bottom=-1;
   for(let y=0;y<110;y++){for(let byte=0;byte<400;byte++){const a=data[y*400+byte],v=atlas[(y*800+i*100)*4+byte];assert.ok(Math.abs(a-v)<=1,b+' atlas alpha-composite rounding');}for(let x=0;x<100;x++)if(data[(y*100+x)*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
   assert.ok(left>=3&&right<=96&&top>=3&&bottom<=103,b+' unclipped');assert.ok(bottom>=101,b+' grounded');heights.push(bottom-top+1);
  }
  assert.ok(Math.max(...heights)-Math.min(...heights)<=4,b+' body size stability');
 }
});
