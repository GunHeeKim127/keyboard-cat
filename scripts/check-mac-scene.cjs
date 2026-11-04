const {execFileSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {checkHelper}=require('./check-mac-helper.cjs');
const {parseScene}=require('../dist-electron/desktop-world');
if(process.platform!=='darwin')throw Error('Requires macOS');
const helper=path.resolve('native/DesktopScene-mac');checkHelper(helper);
const scenes=[];
for(const folders of [false,true]){
 const raw=execFileSync(helper,[String(process.pid),'--snapshot',...(folders?['--folders']:[])],{encoding:'utf8',timeout:10000,maxBuffer:512*1024});
 const data=JSON.parse(raw);assert(parseScene(data));if(!folders)assert.equal(data.folders.length,0);
 scenes.push({folders,windows:data.windows.length,icons:data.icons?.length??0,accessibilityRequired:data.accessibilityRequired,valid:true});
}
fs.mkdirSync('work/launcher-reports',{recursive:true});fs.writeFileSync(`work/launcher-reports/mac-scene-${process.arch}.json`,JSON.stringify({scenes,interactiveFinderPermissions:'not tested'},null,2));console.log('MAC_SCENE_SNAPSHOT_OK');
