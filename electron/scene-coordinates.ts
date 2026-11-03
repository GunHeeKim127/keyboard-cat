import type {Scene,Rect} from './desktop-world';
export class SceneCoordinates{
 private previous=new Map<string,Rect>();
 constructor(private convert:(r:Rect)=>Rect){}
 invalidate(){this.previous.clear();}
 map(scene:Scene):Scene{
  const next=new Map<string,Rect>();
  const rect=(r:Rect)=>{const key=[r.x,r.y,r.width,r.height].join(',');const mapped=next.get(key)??this.previous.get(key)??this.convert(r);next.set(key,mapped);return mapped;};
  const mapped={...scene,windows:scene.windows.map(w=>({...w,rect:rect(w.rect)})),folders:scene.folders.map(f=>({...f,rect:rect(f.rect)})),icons:scene.icons?.map(i=>({...i,rect:rect(i.rect)}))};
  this.previous=next;return mapped;
 }
}
