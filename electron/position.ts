export const petRect=(size:number)=>{const side=112*size;return {x:160-side/2,y:248-side,width:side,height:side};};
export function carryPosition(pointer:{x:number;y:number},size:number){return {x:Math.round(pointer.x-160),y:Math.round(pointer.y-80-112*size*.2)};}
export function dropPosition(pointer:{x:number;y:number},size:number,area:{x:number;y:number;width:number;height:number}){
 const carry=carryPosition(pointer,size),pet=petRect(size);
 const x=carry.x,y=carry.y+80-pet.y;
 return {x:Math.round(Math.max(area.x-pet.x,Math.min(x,area.x+area.width-pet.x-pet.width))),y:Math.round(Math.max(area.y-pet.y,Math.min(y,area.y+area.height-pet.y-pet.height)))};
}
export function facingForDelta(previous:number,delta:number){return Math.abs(delta)>=2?(delta<0?-1:1):previous;}
