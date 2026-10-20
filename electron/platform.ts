import path from 'node:path';
export function inputBinaryName(platform:string){if(platform==='win32')return 'KeyCounter.exe';if(platform==='darwin')return 'KeyCounter-mac';throw new Error('Windows and macOS only');}
export function inputBinaryPath(platform:string,packaged:boolean,resources:string,appRoot:string){return path.join(packaged?(platform==='darwin'?path.join(resources,'..','MacOS'):resources):path.join(appRoot,'native'),inputBinaryName(platform));}
