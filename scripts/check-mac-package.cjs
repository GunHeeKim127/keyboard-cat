const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {checkHelper,parseArchitectures}=require('./check-mac-helper.cjs');
if(process.platform!=='darwin')throw Error('Requires macOS');
const apps=fs.readdirSync('release').filter(n=>/^mac($|-)/.test(n)&&fs.existsSync(path.join('release',n,'Keyboard Cat.app')));
if(apps.length<2)throw Error('Both x64 and arm64 app bundles must be built');
const found=new Set();
for(const dir of apps){const base=path.join('release',dir,'Keyboard Cat.app','Contents');const helper=path.join(base,'Resources','KeyCounter-mac');checkHelper(helper);if(fs.existsSync(path.join(base,'Resources','KeyCounter.exe')))throw Error('Windows helper included in Mac app');execFileSync('plutil',['-lint',path.join(base,'Info.plist')],{stdio:'inherit'});for(const arch of parseArchitectures(execFileSync('xcrun',['lipo',path.join(base,'MacOS','Keyboard Cat'),'-archs'],{encoding:'utf8'})))found.add(arch);}
for(const arch of ['arm64','x86_64'])if(!found.has(arch))throw Error(`Missing packaged app architecture: ${arch}`);
const artifacts=fs.readdirSync('release');for(const arch of ['arm64','x64'])for(const ext of ['dmg','zip'])if(!artifacts.some(n=>n.endsWith(`-mac-${arch}.${ext}`)&&fs.statSync(path.join('release',n)).size>0))throw Error(`Missing ${arch} ${ext} artifact`);
// Verify the delivered archives, not only the unpackaged build folders.
const os=require('node:os');
for(const name of artifacts.filter(n=>/-mac-(arm64|x64)\.(zip|dmg)$/.test(n))){
  const file=path.resolve('release',name);
  if(name.endsWith('.dmg')){
    execFileSync('/usr/bin/hdiutil',['verify',file],{stdio:'inherit'});
    continue;
  }
  execFileSync('/usr/bin/unzip',['-t',file],{stdio:'inherit'});
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-archive-'));
  try{
    execFileSync('/usr/bin/ditto',['-x','-k',file,temp],{stdio:'inherit'});
    const contents=path.join(temp,'Keyboard Cat.app','Contents');
    fs.accessSync(path.join(contents,'MacOS','Keyboard Cat'),fs.constants.X_OK);
    checkHelper(path.join(contents,'Resources','KeyCounter-mac'));
    execFileSync('/usr/bin/plutil',['-lint',path.join(contents,'Info.plist')],{stdio:'inherit'});
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
console.log('Both macOS bundles, ZIP extraction and DMG integrity passed. Interactive permission/drag tests remain manual.');
