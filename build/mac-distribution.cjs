// Distribution builds must never silently fall back to ad-hoc signing.
const base=require('../package.json').build;
const required=['CSC_LINK','CSC_KEY_PASSWORD','APPLE_ID','APPLE_APP_SPECIFIC_PASSWORD','APPLE_TEAM_ID'];
const missing=required.filter(name=>!process.env[name]);
if(missing.length)throw Error(`Signed macOS build requires GitHub Actions secrets: ${missing.join(', ')}. See MACOS-DISTRIBUTION.md.`);
const mac={...base.mac,hardenedRuntime:true,notarize:true};
delete mac.identity; // Let electron-builder select the imported Developer ID Application certificate.
module.exports={...base,forceCodeSigning:true,mac};
