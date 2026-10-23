// Only the application's finite sprite URLs enter this cache. Reuse both the
// decoded texture and its DOM element when revisiting a frame or motion.
const textures=new Map<string,Promise<HTMLImageElement>>();
export function loadFrame(url:string){
 let loaded=textures.get(url);
 if(!loaded){const image=new Image();image.src=url;loaded=image.decode().then(()=>image);textures.set(url,loaded);loaded.catch(()=>textures.delete(url));}
 return loaded;
}
