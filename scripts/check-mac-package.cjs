const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
if(process.platform!=='darwin')throw Error('Requires macOS');
const apps=fs.readdirSync('release').filter(n=>/^mac($|-)/.test(n)&&fs.existsSync(path.join('release',n,'Keyboard Cat.app')));
if(apps.length<2)throw Error('Both x64 and arm64 app bundles must be built');
for(const dir of apps){const base=path.join('release',dir,'Keyboard Cat.app','Contents');const helper=path.join(base,'Resources','KeyCounter-mac');fs.accessSync(helper,fs.constants.X_OK);execFileSync(helper,['--self-test'],{stdio:'inherit'});if(fs.existsSync(path.join(base,'Resources','KeyCounter.exe')))throw Error('Windows helper included in Mac app');execFileSync('plutil',['-lint',path.join(base,'Info.plist')],{stdio:'inherit'});}
console.log('Both macOS bundles have executable helpers and valid plists. Interactive permission/drag tests remain manual.');
