const fs=require('fs'),crypto=require('crypto'),{execFileSync}=require('child_process');
const catalog=require('../assets/interactions/catalog.json'),manifest='assets/interactions/frames-manifest.json';
const sources=['scripts/verify-frame-manifest.cjs','scripts/interaction-assets.cjs','scripts/sprite-islands.cjs','scripts/interaction-sprites.cjs','scripts/fall-sprites.cjs','scripts/window-look-sprites.cjs','scripts/hop-sprites.cjs','scripts/parrot-edge-sprites.cjs','assets/interactions/catalog.json',...fs.readdirSync('assets/interactions').filter(n=>n.endsWith('.png')).sort().map(n=>'assets/interactions/'+n)];
const files=[];for(const group of Object.values(catalog))for(const [pet,breed] of group){sources.push(pet==='cat'&&breed==='original'?'public/sprites/IDLE-0.png':`public/sprites/${pet}-${breed}-IDLE-frame-0.png`);for(const action of ['ENTER_FOLDER','EXIT_CLOSED_FOLDER','EXIT_WINDOW','PETTED','FALL_GROUND','LAND_GROUND'])for(let i=0;i<(action==='LAND_GROUND'?2:4);i++)files.push(`public/sprites/interaction-${pet}-${breed}-${action}-frame-${i}.png`);}
for(const [pet,breed] of catalog.penguin)for(const action of ['WINDOW_LOOK','HOP'])for(let i=0;i<8;i++)files.push(`public/sprites/interaction-${pet}-${breed}-${action}-frame-${i}.png`);
for(const [pet,breed] of catalog.parrot)for(let i=0;i<16;i++)files.push(`public/sprites/interaction-${pet}-${breed}-EDGE_CLIMB-frame-${i}.png`);
const hash=crypto.createHash('sha256');for(const file of sources)hash.update(file).update(/\.(cjs|json)$/.test(file)?fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'):fs.readFileSync(file));const revision=hash.digest('hex');
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
// Release builds preserve reviewed PNGs across image-library/SIMD differences.
const regenerate=process.argv.includes('--regenerate'),record=process.argv.includes('--record');
if(regenerate)for(const file of ['scripts/interaction-sprites.cjs','scripts/fall-sprites.cjs','scripts/window-look-sprites.cjs','scripts/hop-sprites.cjs','scripts/parrot-edge-sprites.cjs'])execFileSync(process.execPath,[file],{stdio:'inherit'});
if(regenerate||record){fs.writeFileSync(manifest,JSON.stringify({format:1,sourceRevision:revision,frames:Object.fromEntries(files.map(f=>[f,digest(f)]))},null,2)+'\n');console.log('Recorded 732 interaction frames; review before committing');}
else{
 const approved=JSON.parse(fs.readFileSync(manifest,'utf8'));
 require('./verify-frame-manifest.cjs')(approved,revision,files,digest);
 console.log('Interaction assets: 732 approved frames verified without regeneration');
}
