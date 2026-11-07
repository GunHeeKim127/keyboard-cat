// Explicit private-certificate build. Never selected by ordinary release jobs.
const path=require('node:path'),base=require('../package.json').build;
require('../scripts/sign-mac-continuity.cjs').signingOptions();
module.exports={...base,directories:{...base.directories,output:'work/mac-signing-app'},afterSign:path.resolve('scripts/sign-mac-continuity.cjs'),mac:{...base.mac,identity:'-',hardenedRuntime:false,notarize:false}};
