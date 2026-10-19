export class Combo {
 count=0; last=0;
 hit(now:number, amount=1) {if(now-this.last>=1500)this.count=0;const before=this.count;this.count+=amount;this.last=now;return [10,30,50].filter(n=>before<n&&this.count>=n);}
 expire(now:number){if(this.count && now-this.last>=1500){this.count=0;return true;}return false;}
 reset(){this.count=0;this.last=0;}
}
