const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {inputBinaryName,inputBinaryPath}=require('../dist-electron/platform.js');
test('selects platform helper and rejects unsupported platforms',()=>{assert.equal(inputBinaryName('win32'),'KeyCounter.exe');assert.equal(inputBinaryName('darwin'),'KeyCounter-mac');assert.throws(()=>inputBinaryName('linux'));});
test('packaged helper is outside asar, development helper is in native',()=>{assert.equal(inputBinaryPath('darwin',true,'resources','app.asar'),path.join('resources','KeyCounter-mac'));assert.equal(inputBinaryPath('win32',false,'resources','project'),path.join('project','native','KeyCounter.exe'));});
