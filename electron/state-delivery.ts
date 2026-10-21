// The controller does not display per-keystroke or animation state.
const controllerKeys=['buildLabel','diagnosticReport','version','platform','inputReady','options','paused','moving','hookError'] as const;
export class StateDelivery<T extends Record<string,unknown>> {
 private previous:T|undefined;
 constructor(private controller=false){}
 changed(value:T){
  const previous=this.previous;
  const keys=this.controller?controllerKeys:Object.keys(value);
  if(previous&&keys.every(key=>Object.is(previous[key],value[key])))return false;
  this.previous=value;
  return true;
 }
}
