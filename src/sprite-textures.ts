// Only the application's finite sprite URLs enter this cache. Reuse both the
// decoded texture and its DOM element when revisiting a frame or motion.
const textures=new Map<string,{promise:Promise<HTMLImageElement>;image:HTMLImageElement;ready:boolean}>();
export const TEXTURE_LIMIT=128;
function trim(){
 for(const [url,entry]of textures){
  if(textures.size<=TEXTURE_LIMIT)break;
  // Never release a displayed frame or a request still preparing a transition.
  if(entry.ready&&!entry.image.isConnected)textures.delete(url);
 }
}
export function loadFrame(url:string){
 if(!/^\.\/sprites\/[a-zA-Z0-9_-]+\.png$/.test(url))return Promise.reject(Error('Invalid sprite URL'));
 let loaded=textures.get(url);
 if(loaded){textures.delete(url);textures.set(url,loaded);return loaded.promise;}
 const image=new Image();image.src=url;
 const entry={image,ready:false,promise:Promise.resolve(image)};
 entry.promise=image.decode().then(()=>{entry.ready=true;trim();return image;},error=>{if(textures.get(url)===entry)textures.delete(url);throw error;});
 textures.set(url,entry);trim();return entry.promise;
}
