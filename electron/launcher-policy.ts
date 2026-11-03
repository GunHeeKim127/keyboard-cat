// The first Windows portable update must migrate to the managed installation.
import path from 'node:path';
export function coreWorkerArguments(profile:string){if(typeof profile!=='string'||!path.isAbsolute(profile)||profile.includes('\0'))throw Error('Invalid worker profile');return ['--keyboard-cat-core-worker','--user-data-dir='+profile];}
// An installed app can inherit the portable wrapper's old environment variable.
export function useSupervisor(platform:string,packaged:boolean,smoke:boolean,portable:boolean,installed:boolean){return ['win32','darwin'].includes(platform)&&packaged&&!smoke&&!(platform==='win32'&&portable&&!installed);}
