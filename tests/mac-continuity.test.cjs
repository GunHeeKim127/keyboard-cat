const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {signingOptions}=require('../scripts/sign-mac-continuity.cjs');
test('fixed Mac identity mode fails closed instead of silently reverting to adhoc signing',()=>{
 for(const identity of [undefined,'-','blacktrowell','identifier-only','a'.repeat(39)])assert.throws(()=>signingOptions({KEYBOARD_CAT_MAC_IDENTITY:identity,KEYBOARD_CAT_MAC_KEYCHAIN:'relative'}));
 assert.throws(()=>signingOptions({KEYBOARD_CAT_MAC_IDENTITY:'a'.repeat(40)}));assert.throws(()=>signingOptions({KEYBOARD_CAT_MAC_IDENTITY:'a'.repeat(40),KEYBOARD_CAT_MAC_KEYCHAIN:'relative'}));
});
test('certificate fingerprint and dedicated keychain are explicit build inputs',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cat-signing-options-')),keychain=path.join(dir,'signing.keychain-db');
 try{fs.writeFileSync(keychain,'fixture');assert.deepEqual(signingOptions({KEYBOARD_CAT_MAC_IDENTITY:'a'.repeat(40),KEYBOARD_CAT_MAC_KEYCHAIN:keychain}),{identity:'A'.repeat(40),keychain});}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
