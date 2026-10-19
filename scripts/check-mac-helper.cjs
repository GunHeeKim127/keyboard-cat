const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
function parseArchitectures(output){return String(output).trim().split(/\s+/).filter(Boolean);}
function checkHelper(helper,run=execFileSync){
 fs.accessSync(helper,fs.constants.X_OK);
 // Query mode takes a single input file and avoids -verify_arch's variadic argument pitfall.
 const architectures=parseArchitectures(run('xcrun',['lipo',helper,'-archs'],{encoding:'utf8'}));
 for(const arch of ['arm64','x86_64'])if(!architectures.includes(arch))throw Error(`Missing ${arch} in ${helper}: ${architectures.join(' ')}`);
 run('codesign',['--verify','--strict',helper],{stdio:'inherit'});
 run(helper,['--self-test'],{stdio:'inherit'});
 return architectures;
}
if(require.main===module){if(process.platform!=='darwin')throw Error('Requires macOS');const helper=path.resolve('native/KeyCounter-mac');console.log('MAC_HELPER_OK',checkHelper(helper).join(' '));}
module.exports={parseArchitectures,checkHelper};
