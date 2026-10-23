const fs=require('node:fs'),path=require('node:path'),asar=require('@electron/asar');
const {fileHash}=require('../dist-electron/core-store');
const {coreRuntime}=require('../dist-electron/core-runtime');
// Run after code signing/packaging so the runtime hashes describe delivered files.
module.exports=async context=>{
 const root=context.outDir,version=require('../package.json').version,result=[];
 for(const [folder,platform,arch]of [['win-unpacked','win32','x64'],['win-arm64-unpacked','win32','arm64'],['mac','darwin','x64'],['mac-arm64','darwin','arm64']]){
  const app=path.join(root,folder),resources=platform==='darwin'?path.join(app,'Keyboard Cat.app','Contents','Resources'):path.join(app,'resources');
  const archive=path.join(resources,'app.asar');if(!fs.existsSync(archive))continue;
  if(JSON.parse(asar.extractFile(archive,'package.json')).version!==version)continue;
  if(fs.existsSync(archive+'.unpacked')&&fs.readdirSync(archive+'.unpacked').length)throw Error('Core updates cannot deliver unpacked native dependencies');
  const executable=platform==='darwin'?path.join(resources,'..','MacOS','Keyboard Cat'):path.join(app,'Keyboard Cat.exe');
  const runtime=coreRuntime(executable,resources,platform,arch,require('electron/package.json').version);
  const name=`Keyboard-Cat-${version}-core-${platform}-${arch}`,file=path.join(root,name+'.asar');
  fs.copyFileSync(archive,file);
  const manifest={format:1,version,runtime,sha256:fileHash(file),size:fs.statSync(file).size};
  const metadata=path.join(root,name+'.unsigned.json');fs.writeFileSync(metadata,JSON.stringify(manifest,null,2)+'\n');result.push(file,metadata);
 }
 return result;
};
