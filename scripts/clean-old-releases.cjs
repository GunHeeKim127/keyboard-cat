const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../release'),version=require('../package.json').version;
const platform=process.argv[2];
if(!['win','mac'].includes(platform))throw Error('Specify win or mac');
const expected=platform==='win'?[[`Keyboard-Cat-${version}-portable.exe`,`Keyboard Cat ${version}.exe`],[`Keyboard-Cat-${version}-setup.exe`,`Keyboard Cat Setup ${version}.exe`]]:['arm64','x64'].flatMap(a=>['dmg','zip'].map(ext=>[`Keyboard-Cat-${version}-mac-${a}.${ext}`]));
for(const names of expected)if(!names.some(name=>{try{const s=fs.lstatSync(path.join(root,name));return s.isFile()&&!s.isSymbolicLink()&&s.size>0;}catch{return false;}}))throw Error(`Keep previous releases until new build completes: ${names[0]}`);
const pattern=platform==='win'?/^(?:Keyboard Cat (?:Setup )?(\d+\.\d+\.\d+)|Keyboard-Cat-(\d+\.\d+\.\d+)-(?:setup|portable))\.exe(?:\.blockmap)?$/:/^Keyboard-Cat-(\d+\.\d+\.\d+)-mac-(?:arm64|x64)\.(?:dmg|zip)$/;
for(const entry of fs.readdirSync(root,{withFileTypes:true})){
 const match=entry.name.match(pattern);
 if(entry.isFile()&&match&&(match[1]||match[2])!==version){fs.unlinkSync(path.join(root,entry.name));console.log(`Removed previous release: ${entry.name}`);}
}
