export class Combo {
 count=0; last=0;
 hit(now:number, amount=1) {
  if(now-this.last>=1500)this.count=0;
  const before=this.count;this.count+=amount;this.last=now;
  const effects:number[]=[];
  for(let milestone=(Math.floor(before/10)+1)*10;milestone<=this.count;milestone+=10){
   effects.push(milestone%50===0?50:milestone%30===0?30:milestone%20===0?20:10);
  }
  return effects;
 }
 expire(now:number){if(this.count && now-this.last>=1500){this.count=0;return true;}return false;}
 reset(){this.count=0;this.last=0;}
}
