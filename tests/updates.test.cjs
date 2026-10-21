const {test}=require('node:test'),assert=require('node:assert/strict');
const {newerVersion,parseRelease,UpdateChecker,releasesURL}=require('../dist-electron/updates');
const asset=(name,tag='v1.3.11')=>({name,state:'uploaded',size:100,browser_download_url:`${releasesURL}/download/${tag}/${encodeURIComponent(name)}`});
const release=(assets=[])=>({draft:false,prerelease:false,tag_name:'v1.3.11',body:'<script>never execute</script>\n업데이트',assets});
test('update versions compare numeric components and reject pre-release, malformed tags and downgrades',()=>{
 assert.equal(newerVersion('v1.3.10','1.3.9'),true);assert.equal(newerVersion('v2.0.0','1.99.99'),true);
 for(const value of ['v1.3.9','v1.3.10','v1.3.11-beta','../1.3.11','1.03.11','1.3.999999999999999999999'])assert.equal(newerVersion(value,'1.3.10'),false);
 assert.equal(parseRelease({...release(),draft:true},'win32','x64',true),null);
 assert.equal(parseRelease({...release(),prerelease:true},'win32','x64',true),null);
});
test('downloads choose portable, installed Windows, Apple Silicon or Intel files from the same release',()=>{
 const names=['Keyboard.Cat.1.3.11.exe','Keyboard.Cat.Setup.1.3.11.exe','Keyboard-Cat-1.3.11-mac-arm64.dmg','Keyboard-Cat-1.3.11-mac-x64.dmg'],r=release(names.map(n=>asset(n)));
 for(const [platform,arch,portable,index]of [['win32','x64',true,0],['win32','x64',false,1],['darwin','arm64',false,2],['darwin','x64',false,3]])assert.equal(parseRelease(r,platform,arch,portable).download,asset(names[index]).browser_download_url);
 assert.equal(parseRelease(r,'linux','x64',false).download,undefined);
 for(const portable of [true,false]){const name=`Keyboard-Cat-1.3.11-${portable?'portable':'setup'}.exe`;assert.equal(parseRelease(release([asset(name)]),'win32','x64',portable).download,asset(name).browser_download_url);}
});
test('release data cannot open another site, repository, tag, local file, query, credentials or executable type',()=>{
 const a=asset('Keyboard Cat 1.3.11.exe');
 for(const url of ['https://evil.example/setup.exe',a.browser_download_url.replace('github.com','github.com.evil.example'),a.browser_download_url.replace('GunHeeKim127','attacker'),a.browser_download_url.replace('/v1.3.11/','/v9.0.0/'),'file:///C:/evil.exe',a.browser_download_url+'?redirect=evil',a.browser_download_url+'#evil',a.browser_download_url.replace('https://','https://user:password@'),'javascript:alert(1)'])assert.equal(parseRelease(release([{...a,browser_download_url:url}]),'win32','x64',true).download,undefined,url);
 assert.equal(parseRelease(release([asset('Keyboard Cat 1.3.11.bat')]),'win32','x64',true).download,undefined);
 assert.equal(parseRelease(release([{...a,state:'new'}]),'win32','x64',true).download,undefined);
 assert.equal(parseRelease(release(), 'win32','x64',true).notes,'<script>never execute</script>\n업데이트');
 assert.equal(parseRelease({...release(),body:'x'.repeat(10000)},'win32','x64',true).notes.length,4000);
});
test('update checking is manual, coalesces requests, caches results, and opens only the stored selected URL',async()=>{
 let requests=0,opens=[];const r=release([asset('Keyboard Cat 1.3.11.exe')]);
 const checker=new UpdateChecker('1.3.10','win32','x64',true,async()=>{requests++;return r;},async url=>{opens.push(url);});
 assert.equal(requests,0);assert.equal(await checker.download(),false);
 const [a,b]=await Promise.all([checker.check(),checker.check()]);assert.equal(a.status,'available');assert.deepEqual(a,b);assert.equal(requests,1);
 await checker.check();assert.equal(requests,1);assert.equal(await checker.download(),true);assert.equal(opens[0],r.assets[0].browser_download_url);
 await checker.openNotes();assert.equal(opens[1],releasesURL+'/tag/v1.3.11');
});
test('offline, absent releases and older releases leave the pet usable without a download action',async()=>{
 for(const [fetch,status]of [[async()=>{throw Error('offline');},'error'],[async()=>null,'empty'],[async()=>release(),'current']]){
  const checker=new UpdateChecker('1.3.12','win32','x64',true,fetch);assert.equal((await checker.check()).status,status);assert.equal(await checker.download(),false);
 }
});
