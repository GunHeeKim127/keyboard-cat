import {contextBridge,ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('cat',{
 snapshot:()=>ipcRenderer.invoke('snapshot'),
 updates:(action:'check'|'download'|'notes')=>ipcRenderer.invoke('updates',action),
 onState:(fn:(s:unknown)=>void)=>{const cb=(_:unknown,s:unknown)=>fn(s);ipcRenderer.on('state',cb);return()=>ipcRenderer.removeListener('state',cb);},
 lock:()=>ipcRenderer.send('command','lock'),
 command:(value:string)=>ipcRenderer.send('command',value),
 options:(value:unknown)=>ipcRenderer.send('options',value),
 hover:(value:boolean)=>ipcRenderer.send('hover',value),
 carry:(value:boolean)=>ipcRenderer.send('carry',value)
});
