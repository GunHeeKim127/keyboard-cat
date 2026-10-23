// The first Windows portable update must migrate to the managed installation.
// An installed app can inherit the portable wrapper's old environment variable.
export function useSupervisor(platform:string,packaged:boolean,smoke:boolean,portable:boolean,installed:boolean){return ['win32','darwin'].includes(platform)&&packaged&&!smoke&&!(platform==='win32'&&portable&&!installed);}
