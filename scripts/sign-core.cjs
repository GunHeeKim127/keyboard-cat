// Explicit local release step. Never print, copy into the repo, or upload the key.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {coreSigningData,fileHash,signedCore}=require('../dist-electron/core-store');
const {CORE_PUBLIC_KEY}=require('../dist-electron/core-trust');
const [directory,keyFile]=process.argv.slice(2);if(!directory||!keyFile)throw Error('Usage: node scripts/sign-core.cjs <artifact-directory> <private-key-file>');
const key=crypto.createPrivateKey(fs.readFileSync(keyFile));
if(crypto.createPublicKey(key).export({type:'spki',format:'pem'})!==CORE_PUBLIC_KEY)throw Error('Release key does not match launcher');
for(const name of fs.readdirSync(directory).filter(n=>/^Keyboard-Cat-\d+\.\d+\.\d+-core-(win32|darwin)-(x64|arm64)\.unsigned\.json$/.test(n))){
 const m=JSON.parse(fs.readFileSync(path.join(directory,name),'utf8')),archive=path.join(directory,name.replace('.unsigned.json','.asar'));
 if(fs.statSync(archive).size!==m.size||fileHash(archive)!==m.sha256)throw Error('Core archive changed');
 m.signature=crypto.sign(null,coreSigningData(m),key).toString('base64');if(!signedCore(m))throw Error('Invalid release manifest');
 const target=path.join(directory,name.replace('.unsigned.json','.json'));fs.writeFileSync(target,JSON.stringify(m,null,2)+'\n');console.log('Signed '+path.basename(target));
}
