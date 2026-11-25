// One explicitly approved prerelease. No signing credentials or downloaded app
// code are executed in this publisher; only verified DMGs and public reports.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const repo='GunHeeKim127/keyboard-cat',tag='mac-fixed-identity-preview-2',releaseId=457720867;
const fingerprint='AE37A9663433A2C80338B686DB8180EB6FDF4082';
function gh(args){return execFileSync('gh',args,{encoding:'utf8',maxBuffer:2*1024*1024,timeout:600000});}
function api(endpoint){return JSON.parse(gh(['api',`repos/${repo}/${endpoint}`]));}
async function sha256(file){const h=crypto.createHash('sha256');for await(const data of fs.createReadStream(file))h.update(data);return h.digest('hex');}
function release(){const r=api(`releases/${releaseId}`);if(r.tag_name!==tag||r.draft||!r.prerelease)throw Error('Unexpected release target');return r;}
async function main(){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==repo)throw Error('Publisher requires the repository CI environment');
 const run=api('actions/runs/45561045179');
 if(run.conclusion!=='success'||run.head_sha!=='3d4f17c82b475cef333a96eb4b3f716263d86084')throw Error('Final Mac verification did not pass the pinned commit');
 const stable=api('releases/latest').id;release();
 const output='work/permission-preview2-publication';fs.mkdirSync(output,{recursive:true});const files=[];
 for(const arch of ['arm64','x64']){
  const root=`work/delivery-${arch}`,report=JSON.parse(fs.readFileSync(path.join(root,'local-signature-native-report.json'),'utf8'));
  if(report.nativeVerificationPassed!==true||report.privateKeyUploaded!==false)throw Error('Missing native signing verification');
  for(const [file,id] of [['app','local.keyboardcat.pet'],['Contents/MacOS/KeyCounter-mac','KeyCounter-mac'],['Contents/MacOS/DesktopScene-mac','DesktopScene-mac']]){
   const requirement=report.requirements?.[file]||'';
   if(!requirement.toUpperCase().includes(fingerprint)||!requirement.includes(`identifier "${id}"`)||/cdhash/i.test(requirement))throw Error('Preview signing identity changed');
  }
  const file=path.join(root,'verified-mac-preview',`Keyboard-Cat-2.5.2-permission-preview2-${arch}.dmg`),size=fs.statSync(file).size;
  if(size<100*1024*1024||size>300*1024*1024)throw Error('Unexpected DMG size');
  files.push({file,name:path.basename(file),sha256:await sha256(file),size});
 }
 const guide=path.join(output,'Mac-권한수정2-설치안내.md');fs.copyFileSync('MAC-PERMISSION-PREVIEW2.md',guide);
 files.push({file:guide,name:path.basename(guide),sha256:await sha256(guide),size:fs.statSync(guide).size});
 const sums=path.join(output,'SHA256SUMS.txt');fs.writeFileSync(sums,files.map(f=>`${f.sha256}  ${f.name}`).join('\n')+'\n');
 files.push({file:sums,name:path.basename(sums),sha256:await sha256(sums),size:fs.statSync(sums).size});
 for(const file of files){
  let asset=release().assets.find(a=>a.name===file.name);
  if(!asset){
   try{gh(['release','upload',tag,file.file,'--repo',repo]);}
   catch{/* A successful upload can lose its response. Verify before retrying. */}
   asset=release().assets.find(a=>a.name===file.name);
  }
  if(asset?.digest!==`sha256:${file.sha256}`||asset.size!==file.size)throw Error(`Published file hash mismatch: ${file.name}`);
  file.url=asset.browser_download_url;console.log(`PUBLISHED_AND_HASH_VERIFIED ${file.name}`);
 }
 const state=path.join(output,'release-state.json');fs.writeFileSync(state,JSON.stringify({body:fs.readFileSync('build/mac-permission-preview2-release.md','utf8'),prerelease:true,make_latest:'false'}));
 gh(['api','--method','PATCH',`repos/${repo}/releases/${releaseId}`,'--input',state]);
 if(api('releases/latest').id!==stable)throw Error('Stable release changed during publication');
 fs.writeFileSync(path.join(output,'publication.json'),JSON.stringify({tag,files,stableReleaseUnchanged:true,privateSigningKeyUploaded:false},null,2));
 console.log('MAC_PERMISSION_PREVIEW2_PUBLISHED');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
