const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const config=path.resolve(__dirname,'../build/mac-distribution.cjs');
const names=['CSC_LINK','CSC_KEY_PASSWORD','APPLE_ID','APPLE_APP_SPECIFIC_PASSWORD','APPLE_TEAM_ID'];
function load(withCredentials){
 const env={...process.env};for(const name of names){delete env[name];if(withCredentials)env[name]='test-placeholder';}
 return spawnSync(process.execPath,['-e','process.stdout.write(JSON.stringify(require(process.argv[1])))',config],{env,encoding:'utf8'});
}
test('distribution refuses missing credentials instead of falling back to ad-hoc signing',()=>{
 const result=load(false);assert.notEqual(result.status,0);assert.match(result.stderr,/Signed macOS build requires/);assert.equal(result.stdout,'');
});
test('distribution enables notarization and required signing without changing development config',()=>{
 const result=load(true);assert.equal(result.status,0,result.stderr);const c=JSON.parse(result.stdout);
 assert.equal(c.forceCodeSigning,true);assert.equal(c.mac.hardenedRuntime,true);assert.equal(c.mac.notarize,true);assert.equal(Object.hasOwn(c.mac,'identity'),false);
 const base=require('../package.json').build;assert.equal(base.mac.identity,'-');assert.equal(base.mac.notarize,false);
});
