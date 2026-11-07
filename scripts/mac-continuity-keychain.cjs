// CI-only import of an encrypted signing identity. No trust or privacy DB writes.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const pin=require('../build/mac-signing-identity.json');
if(process.platform!=='darwin'||process.env.GITHUB_ACTIONS!=='true')throw Error('This helper is restricted to the Mac CI runner');
function run(args,secrets=[]){try{return execFileSync('/usr/bin/security',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});}catch(e){let text=String(e.stderr??'Keychain operation failed');for(const secret of secrets)if(secret)text=text.split(secret).join('[redacted]');throw Error(text);}}
function cleanup(dir){
 if(!dir||path.dirname(dir)!==os.tmpdir()||!path.basename(dir).startsWith('keyboard-cat-fixed-signing-'))throw Error('Unexpected signing temporary path');
 const file=path.join(dir,'previous-keychains.json');if(fs.existsSync(file)){const previous=JSON.parse(fs.readFileSync(file));if(!Array.isArray(previous)||previous.some(p=>typeof p!=='string'||!path.isAbsolute(p)))throw Error('Invalid previous keychain list');run(['list-keychains','-d','user','-s',...previous]);}
 try{run(['delete-keychain',path.join(dir,'signing.keychain-db')]);}catch{}
 fs.rmSync(dir,{recursive:true,force:true});
}
if(process.argv.includes('--cleanup')){if(process.env.KEYBOARD_CAT_MAC_SIGNING_TEMP)cleanup(process.env.KEYBOARD_CAT_MAC_SIGNING_TEMP);}
else{
 const encoded=process.env.KEYBOARD_CAT_MAC_P12_BASE64,password=process.env.KEYBOARD_CAT_MAC_P12_PASSWORD;
 if(!encoded||encoded.length>131072||!/^[A-Za-z0-9+/=\r\n]+$/.test(encoded)||!password||password.length<32)throw Error('Fixed signing secrets are not configured');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-fixed-signing-')),keychain=path.join(dir,'signing.keychain-db'),p12=path.join(dir,'identity.p12'),localPassword=crypto.randomBytes(32).toString('hex');
 try{
  const previous=[...run(['list-keychains','-d','user']).matchAll(/"([^"]+)"/g)].map(m=>m[1]);fs.writeFileSync(path.join(dir,'previous-keychains.json'),JSON.stringify(previous),{mode:0o600});
  fs.writeFileSync(p12,Buffer.from(encoded,'base64'),{mode:0o600});
  run(['create-keychain','-p',localPassword,keychain],[localPassword]);run(['unlock-keychain','-p',localPassword,keychain],[localPassword]);run(['set-keychain-settings','-lut','7200',keychain]);
  run(['list-keychains','-d','user','-s',...previous,keychain]);run(['import',p12,'-k',keychain,'-P',password,'-T','/usr/bin/codesign'],[password]);fs.unlinkSync(p12);
  run(['set-key-partition-list','-S','apple-tool:,apple:','-s','-k',localPassword,keychain],[localPassword]);
  const pem=run(['find-certificate','-a','-p',keychain]),certs=pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g)??[],certificate=certs.map(c=>new crypto.X509Certificate(c)).find(c=>c.fingerprint.replaceAll(':','')===pin.sha1);
  if(!certificate||certificate.subject!=='CN='+pin.subject||Date.parse(certificate.validTo)<=Date.now()||Date.parse(certificate.validFrom)>Date.now())throw Error('Fixed certificate fingerprint, identity or validity does not match');
  if(!process.env.GITHUB_ENV)throw Error('CI environment file unavailable');
  fs.appendFileSync(process.env.GITHUB_ENV,`KEYBOARD_CAT_MAC_IDENTITY=${pin.sha1}\nKEYBOARD_CAT_MAC_KEYCHAIN=${keychain}\nKEYBOARD_CAT_MAC_SIGNING_TEMP=${dir}\n`);
  console.log('FIXED_MAC_SIGNING_IDENTITY_READY '+pin.sha1);
 }catch(error){try{cleanup(dir);}catch{}throw error;}
}
