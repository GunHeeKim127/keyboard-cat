export const breeds=['chihuahua','jindo','retriever','shiba','husky'] as const;
export type DogBreed=typeof breeds[number];
export type PetKind='cat'|'dog';
export const catBreeds=['original','ragdoll','russian-blue','norwegian-forest','siamese','persian'] as const;
export type CatBreed=typeof catBreeds[number];
export const catBreedNames:Record<CatBreed,string>={original:'Original · 기존 고양이',ragdoll:'랙돌', 'russian-blue':'러시안 블루','norwegian-forest':'노르웨이 숲',siamese:'샴',persian:'페르시안'};
export const catBreedTraits:Record<CatBreed,string>={original:'기존 고양이 모습과 모션 그대로',ragdoll:'파란 눈·흰 얼굴 무늬·풍성한 꼬리 · 느긋한 몸짓','russian-blue':'은회색 짧은 털·초록 눈 · 가볍고 신중한 발걸음','norwegian-forest':'목둘레 갈기·귀 끝 털·큼직한 꼬리 · 힘찬 사다리 오르기',siamese:'크림색 몸·짙은 얼굴과 발·파란 눈 · 날렵하고 장난스러운 움직임',persian:'동그란 얼굴·작은 귀·긴 크림색 털 · 차분한 짧은 발걸음'};
export function isCatBreed(value:unknown):value is CatBreed{return typeof value==='string'&&(catBreeds as readonly string[]).includes(value);}
export const breedNames:Record<DogBreed,string>={chihuahua:'치와와',jindo:'진돗개',retriever:'리트리버',shiba:'시바견',husky:'허스키'};
export const breedTraits:Record<DogBreed,string>={chihuahua:'큰 귀를 쫑긋 · 작고 경쾌한 발걸음',jindo:'또렷한 자세 · 가볍고 날렵한 달리기',retriever:'늘어진 귀와 풍성한 꼬리 · 반가운 손짓',shiba:'돌돌 말린 꼬리 · 장난스러운 웃음과 앞발',husky:'파란 눈과 얼굴 무늬 · 힘찬 달리기'};
export const catFrames:Record<string,number>={IDLE:8,WALK:9,JUMP:7,DASH:6,ATTACK:5,SLEEP:5,FALL:4,LAND:3,CLIMB_UP:4,CLIMB_DOWN:4};
export const dogFrames:Record<string,number>={IDLE:4,WALK:8,JUMP:2,DASH:2,ATTACK:2,SLEEP:2,FALL:1,LAND:1,CLIMB_UP:4,CLIMB_DOWN:4,CARRY:2};
// FPS is a ceiling: short dog cycles need longer holds than the cat artwork.
export function spriteDuration(pet:PetKind,action:string,frames:number,fps:number,catBreed:CatBreed='original'){
 if(pet==='cat'&&catBreed==='original')return frames/(action==='SLEEP'?2.5:fps);
 const hold:Record<string,number>={IDLE:500,WALK:100,JUMP:400,DASH:350,ATTACK:450,SLEEP:1200,CARRY:650,CLIMB_UP:350,CLIMB_DOWN:350,FALL:450,LAND:500};
 const pace=pet==='cat'&&(action==='WALK'||action==='IDLE')?({original:1,ragdoll:1.1,'russian-blue':1,'norwegian-forest':1,siamese:.9,persian:1.2}[catBreed]):1;
 return frames*Math.max(1000/fps,(hold[action]??500)*pace)/1000;
}
export function isDogBreed(value:unknown):value is DogBreed{return typeof value==='string'&&(breeds as readonly string[]).includes(value);}
export function spriteFor(pet:PetKind,breed:DogBreed,action:string,catBreed:CatBreed='original'){
 const selected=isCatBreed(catBreed)?catBreed:'original',isolated=pet==='dog'||selected!=='original';
 const frameCounts=isolated?dogFrames:catFrames;
 const safeAction=Object.hasOwn(frameCounts,action)?action:'IDLE';
 const atlas=safeAction.startsWith('CLIMB_')?'CLIMB':safeAction;
 return {src:`./sprites/${pet==='dog'?`dog-${isDogBreed(breed)?breed:'chihuahua'}-`:selected!=='original'?`cat-${selected}-`:''}${atlas}-atlas.png`,frames:frameCounts[safeAction]};
}
