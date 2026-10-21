const {test}=require('node:test');
const assert=require('node:assert/strict');
const {StateDelivery}=require('../dist-electron/state-delivery');
test('typing updates pet but does not re-render an unchanged controller',()=>{
 const pet=new StateDelivery(),panel=new StateDelivery(true),options={fps:5};
 const base={options,combo:0,lastHit:0,action:'IDLE',effect:0};
 let petMessages=0,panelMessages=0;
 for(let i=0;i<=100;i++){
  const value={...base,combo:i,lastHit:i,action:i?'ATTACK':'IDLE'};
  if(pet.changed(value))petMessages++;
  if(panel.changed(value))panelMessages++;
 }
 assert.equal(petMessages,101);assert.equal(panelMessages,1);
 assert.equal(panel.changed({...base,options:{fps:8}}),true);
});
test('all controller settings and connection changes are delivered; idle state is deduplicated',()=>{
 const delivery=new StateDelivery(true),base={options:{},paused:false,moving:false,hookError:'',inputReady:false,diagnosticReport:'',version:'1.3.6',platform:'win32',buildLabel:''};
 assert.equal(delivery.changed(base),true);
 assert.equal(delivery.changed({...base}),false);
 for(const [key,value] of Object.entries({paused:true,moving:true,hookError:'error',inputReady:true,diagnosticReport:'report',version:'next',platform:'darwin',buildLabel:'updated'})){
  assert.equal(delivery.changed({...base,[key]:value}),true,key);
  assert.equal(delivery.changed(base),true,key+' restore');
 }
});
test('pet delivers animation boundaries, direction and carry state without serializing',()=>{
 const delivery=new StateDelivery(),options={};
 const base={options,action:'IDLE',animate:false,carried:false,facing:1};
 assert.equal(delivery.changed(base),true);assert.equal(delivery.changed({...base}),false);
 for(const patch of [{action:'SLEEP'},{animate:true},{carried:true},{facing:-1}]){
  assert.equal(delivery.changed({...base,...patch}),true);
  assert.equal(delivery.changed(base),true);
 }
});
