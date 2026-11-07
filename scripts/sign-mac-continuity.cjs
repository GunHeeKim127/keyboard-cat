// Opt-in stable private signing identity. This does not grant OS permissions or
// establish Gatekeeper trust. The certificate/keychain must already exist.
const path=require('node:path'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
function signingOptions(env=process.env){
 const identity=env.KEYBOARD_CAT_MAC_IDENTITY,keychain=env.KEYBOARD_CAT_MAC_KEYCHAIN;
 if(!identity||!/^[a-fA-F0-9]{40}$/.test(identity))throw Error('A fixed Mac signing certificate fingerprint is required');
 if(!keychain||!path.isAbsolute(keychain)||!fs.statSync(keychain).isFile())throw Error('A dedicated signing keychain is required');
 return {identity:identity.toUpperCase(),keychain};
}
function requirement(file){return execFileSync('/usr/bin/codesign',['-d','-r-',file],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000}).trim().replace(/^designated => /,'');}
async function sign(context){
 if(process.platform!=='darwin')throw Error('Mac signing requires macOS');
 const {identity,keychain}=signingOptions(),app=path.join(context.appOutDir,context.packager.appInfo.productFilename+'.app'),contents=path.join(app,'Contents'),input=path.join(contents,'MacOS','KeyCounter-mac'),scene=path.join(contents,'MacOS','DesktopScene-mac');
 await require('@electron/osx-sign').signAsync({app,platform:'darwin',type:'distribution',identity,keychain,identityValidation:false,preAutoEntitlements:false,preEmbedProvisioningProfile:false,gatekeeperAssess:false,strictVerify:true,binaries:[input,scene],optionsForFile:file=>({entitlements:path.resolve('build/entitlements.mac.plist'),hardenedRuntime:false,timestamp:'none',...(file===input?{additionalArguments:['--identifier','local.keyboardcat.pet.input']}:file===scene?{additionalArguments:['--identifier','local.keyboardcat.pet.scene']}:{})})});
 for(const file of [app,input,scene]){
  execFileSync('/usr/bin/codesign',['--verify','--strict',file],{stdio:'pipe',timeout:30000});
  const dr=requirement(file);if(!dr.toLowerCase().includes(identity.toLowerCase())||/^cdhash /.test(dr)||/anchor trusted/.test(dr))throw Error('Signing identity was not pinned to the fixed certificate');
 }
 console.log('MAC_FIXED_IDENTITY_SIGNED');
}
module.exports=sign;module.exports.signingOptions=signingOptions;module.exports.requirement=requirement;
