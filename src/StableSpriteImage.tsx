import React,{useLayoutEffect,useRef} from 'react';
import {loadFrame} from './sprite-textures';

type Props={src:string;restart?:string|number;className?:string;draggable?:boolean;style:React.CSSProperties;'data-frame':number;'data-frame-count':number;'data-cycle-duration':number;'data-playing':boolean;'data-reverse':boolean};
const applied=new WeakMap<HTMLImageElement,Props>();
// React owns the empty host; the cache owns its image nodes. A decoded image
// atomically replaces the previous one, so a slow/failed request leaves it intact.
export const StableSpriteImage=React.memo(function StableSpriteImage(props:Props){
 const host=useRef<HTMLSpanElement>(null),previous=useRef<{src:string;restart?:string|number}|undefined>(undefined);
 useLayoutEffect(()=>{
  let active=true;
  void loadFrame(props.src).then(image=>{
   if(!active||!host.current)return;
   const old=applied.get(image);
   if(!old||old.className!==props.className)image.className=props.className??'';
   if(!old||old.draggable!==props.draggable)image.draggable=props.draggable??false;
   if(!old)image.alt='';
   if(!old||old.style.width!==props.style.width||old.style.animation!==props.style.animation)Object.assign(image.style,props.style);
   for(const name of ['data-frame','data-frame-count','data-cycle-duration','data-playing','data-reverse'] as const)if(!old||old[name]!==props[name])image.setAttribute(name,String(props[name]));
   applied.set(image,props);
   if(host.current.firstChild!==image)host.current.replaceChildren(image);
   else if(previous.current?.restart!==props.restart)for(const animation of image.getAnimations())animation.currentTime=0;
   previous.current={src:props.src,restart:props.restart};
  },()=>{/* Keep the last decoded frame when a replacement fails. */});
  return()=>{active=false;};
 },[props]);
 return <span ref={host} style={{display:'contents'}}/>;
});
