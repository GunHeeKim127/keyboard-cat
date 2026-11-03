import {PetKind,DogBreed,CatBreed} from './pets';
import {ParrotBreed} from './parrots';
import {MonkeyBreed} from './monkeys';
import {PenguinBreed} from './penguins';
export const interactionActions=['ENTER_FOLDER','EXIT_CLOSED_FOLDER','EXIT_WINDOW','PETTED','FALL_GROUND','LAND_GROUND','WINDOW_LOOK','HOP','EDGE_CLIMB'] as const;
export function interactionSprite(pet:PetKind,action:string,dog:DogBreed,cat:CatBreed,parrot:ParrotBreed,monkey:MonkeyBreed,penguin:PenguinBreed){
 if(!(interactionActions as readonly string[]).includes(action))return;
 if((action==='WINDOW_LOOK'||action==='HOP')&&pet!=='penguin')return;
 if(action==='EDGE_CLIMB'&&pet!=='parrot')return;
 const breed=pet==='cat'?cat:pet==='dog'?dog:pet==='parrot'?parrot:pet==='monkey'?monkey:penguin;
 return {src:`./sprites/interaction-${pet}-${breed}-${action}-atlas.png`,frames:action==='EDGE_CLIMB'?16:action==='WINDOW_LOOK'||action==='HOP'?8:action==='LAND_GROUND'?2:4};
}
