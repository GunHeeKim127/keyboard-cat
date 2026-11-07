// Isolated cryptographic identity test. Never edits TCC, user trust, or app settings.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
if(process.platform!=='darwin')throw Error('Requires macOS');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'keyboard-cat-signing-')),password=crypto.randomBytes(32).toString('hex'),keychain=path.join(temp,'test.keychain-db');
function run(command,args,extra={}){try{return execFileSync(command,args,{encoding:'utf8',...extra});}catch(e){throw Error(path.basename(command)+' failed: '+String(e.stderr??'').split(password).join('[redacted]'));}}
let previousKeychains=[];
function identity(name){
 const key=path.join(temp,name+'.key'),cert=path.join(temp,name+'.pem'),p12=path.join(temp,name+'.p12'),config=path.join(temp,name+'.cnf');
 fs.writeFileSync(config,'[req]\ndistinguished_name=dn\nx509_extensions=extensions\nprompt=no\n[dn]\nCN=blacktrowell '+name+'\n[extensions]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign\nextendedKeyUsage=codeSigning\n');
 run('/usr/bin/openssl',['req','-new','-x509','-newkey','rsa:3072','-sha256','-nodes','-days','2','-config',config,'-keyout',key,'-out',cert]);
 run('/usr/bin/openssl',['pkcs12','-export','-inkey',key,'-in',cert,'-out',p12,'-name','blacktrowell '+name,'-keypbe','PBE-SHA1-3DES','-certpbe','PBE-SHA1-3DES','-macalg','sha1','-passout','env:KEYBOARD_CAT_TEST_KEY_PASSWORD'],{env:{...process.env,KEYBOARD_CAT_TEST_KEY_PASSWORD:password}});
 run('/usr/bin/security',['import',p12,'-k',keychain,'-P',password,'-T','/usr/bin/codesign']);
 const line=run('/usr/bin/openssl',['x509','-in',cert,'-noout','-fingerprint','-sha1']);const hash=line.split('=').pop().trim().replaceAll(':','');assert(/^[A-F0-9]{40}$/.test(hash));return hash;
}
function sign(file,hash){run('/usr/bin/codesign',['--force','--sign',hash,'--keychain',keychain,'--timestamp=none','--identifier','local.keyboardcat.continuity-test',file]);run('/usr/bin/codesign',['--verify','--strict',file]);}
function requirement(file){const out=execFileSync('/usr/bin/codesign',['-d','-r-',file],{encoding:'utf8',stdio:['ignore','pipe','pipe']});return out.trim().replace(/^designated => /,'');}
try{
 previousKeychains=[...run('/usr/bin/security',['list-keychains','-d','user']).matchAll(/"([^"]+)"/g)].map(m=>m[1]);
 run('/usr/bin/security',['create-keychain','-p',password,keychain]);run('/usr/bin/security',['unlock-keychain','-p',password,keychain]);run('/usr/bin/security',['list-keychains','-d','user','-s',...previousKeychains,keychain]);
 const first=identity('test-A'),second=identity('test-B');run('/usr/bin/security',['set-key-partition-list','-S','apple-tool:,apple:','-s','-k',password,keychain]);
 const files=[];for(let n=0;n<2;n++){const source=path.join(temp,'v'+n+'.c'),file=path.join(temp,'v'+n);fs.writeFileSync(source,'int main(void){return '+n+';}\n');run('/usr/bin/xcrun',['clang',source,'-o',file]);sign(file,first);files.push(file);}
 const a=requirement(files[0]),b=requirement(files[1]);assert(a&&a===b);assert(/certificate|anchor/.test(a));assert(!/^cdhash /.test(a));
 run('/usr/bin/codesign',['--verify','--strict','-R','='+a,files[1]]);
 const other=path.join(temp,'other-key');fs.copyFileSync(files[1],other);sign(other,second);assert.notEqual(requirement(other),a);
 let wrongKeyRejected=false;try{run('/usr/bin/codesign',['--verify','--strict','-R','='+a,other]);}catch{wrongKeyRejected=true;}assert(wrongKeyRejected);
 const report={sameIdentityAcrossChangedCode:true,wrongKeyRejected,requirement:a,arch:process.arch,gatekeeperTrust:'not claimed',actualInputMonitoringPermission:'not tested',tccOrTrustSettingsModified:false};
 fs.mkdirSync('work/mac-signing-reports',{recursive:true});fs.writeFileSync('work/mac-signing-reports/'+process.arch+'.json',JSON.stringify(report,null,2));console.log('MAC_SIGNING_CONTINUITY_OK '+JSON.stringify(report));
}finally{
 if(previousKeychains.length)try{run('/usr/bin/security',['list-keychains','-d','user','-s',...previousKeychains]);}catch{}
 try{run('/usr/bin/security',['delete-keychain',keychain]);}catch{}
 if(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('keyboard-cat-signing-'))fs.rmSync(temp,{recursive:true,force:true});
}

