const fs=require('node:fs'),path=require('node:path'),{execFileSync,spawnSync}=require('node:child_process');
if(process.platform!=='darwin')throw Error('Requires macOS');
const apps=fs.readdirSync('release').filter(n=>/^mac($|-)/.test(n)).map(n=>path.resolve('release',n,'Keyboard Cat.app')).filter(p=>fs.existsSync(p));
if(apps.length<2)throw Error('Both architectures must be built');
for(const app of apps){
  execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
  // Gatekeeper must accept the app and the stapled ticket must validate offline.
  execFileSync('/usr/sbin/spctl',['--assess','--type','execute','--verbose=2',app],{stdio:'inherit'});
  execFileSync('/usr/bin/xcrun',['stapler','validate',app],{stdio:'inherit'});
  const helper=path.join(app,'Contents','MacOS','KeyCounter-mac');
  const teams=[];
  for(const binary of [app,helper]){
    const result=spawnSync('/usr/bin/codesign',['--display','--verbose=4',binary],{encoding:'utf8'});
    const details=String(result.stdout)+String(result.stderr);
    if(result.status!==0||!/^Authority=Developer ID Application:/m.test(details)||!/^Timestamp=/m.test(details)||!details.includes('(runtime)'))throw Error(`Missing Developer ID, secure timestamp or hardened runtime: ${binary}`);
    const team=details.match(/^TeamIdentifier=(.+)$/m)?.[1];
    if(!team||team==='not set')throw Error(`Missing signing team: ${binary}`);
    teams.push(team);
  }
  if(teams[0]!==teams[1])throw Error('App and input helper must share the same signing team');
  execFileSync('/usr/bin/codesign',['--verify','--strict',helper],{stdio:'inherit'});
}
console.log('Developer ID apps accepted by Gatekeeper; stapled notarization tickets validated.');
