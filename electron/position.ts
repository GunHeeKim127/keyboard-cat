export const petRect=(size:number)=>{const side=112*size;return {x:160-side/2,y:248-side,width:side,height:side};};
export function carryPosition(pointer:{x:number;y:number},size:number){return {x:Math.round(pointer.x-160),y:Math.round(pointer.y-80-112*size*.2)};}
export function dropPosition(pointer:{x:number;y:number},size:number,area:{x:number;y:number;width:number;height:number}){
 const carry=carryPosition(pointer,size),pet=petRect(size);
 const x=carry.x,y=carry.y+80-pet.y;
 return {x:Math.round(Math.max(area.x-pet.x,Math.min(x,area.x+area.width-pet.x-pet.width))),y:Math.round(Math.max(area.y-pet.y,Math.min(y,area.y+area.height-pet.y-pet.height)))};
}
export function facingForDelta(previous:number,delta:number){return Math.abs(delta)>=2?(delta<0?-1:1):previous;}
// Electron coordinates are signed 32-bit integers, unlike TypeScript's number.
export function nativePosition(x:unknown,y:unknown){
 if(typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y))return;
 const point={x:Math.round(x),y:Math.round(y)};
 if(point.x< -2147483648||point.x>2147483647||point.y< -2147483648||point.y>2147483647)return;
 return point;
}
export function limitToArea(point:{x:number;y:number},size:number,area:{x:number;y:number;width:number;height:number},carried=false){
 const pet=petRect(size),rect=carried?{...pet,y:80}:pet;
 const minX=Math.ceil(area.x-rect.x),minY=Math.ceil(area.y-rect.y);
 const maxX=Math.max(minX,Math.floor(area.x+area.width-rect.x-rect.width)),maxY=Math.max(minY,Math.floor(area.y+area.height-rect.y-rect.height));
 return {x:Math.max(minX,Math.min(Math.round(point.x),maxX)),y:Math.max(minY,Math.min(Math.round(point.y),maxY))};
}
