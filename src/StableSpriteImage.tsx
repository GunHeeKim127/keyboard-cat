import React,{useLayoutEffect,useRef} from 'react';
import {loadFrame} from './sprite-textures';

type Props={src:string;restart?:string|number;className?:string;draggable?:boolean;style:React.CSSProperties;'data-frame':number;'data-frame-count':number;'data-cycle-duration':number;'data-playing':boolean;'data-reverse':boolean};
// React owns the empty host; the cache owns its image nodes. A decoded image
// atomically replaces the previous one, so a slow/failed request leaves it intact.
export const StableSpriteImage=React.memo(function StableSpriteImage(props:Props){
 const host=useRef<HTMLSpanElement>(null),previous=useRef<{src:string;restart?:string|number}|undefined>(undefined);
 useLayoutEffect(()=>{
  let active=true;
  void loadFrame(props.src).then(image=>{
   if(!active||!host.current)return;
   image.className=props.className??'';image.draggable=props.draggable??false;image.alt='';
   image.removeAttribute('style');Object.assign(image.style,props.style);
   for(const name of ['data-frame','data-frame-count','data-cycle-duration','data-playing','data-reverse'] as const)image.setAttribute(name,String(props[name]));
   if(host.current.firstChild!==image)host.current.replaceChildren(image);
   else if(previous.current?.restart!==props.restart)for(const animation of image.getAnimations())animation.currentTime=0;
   previous.current={src:props.src,restart:props.restart};
  },()=>{/* Keep the last decoded frame when a replacement fails. */});
  return()=>{active=false;};
 },[props]);
 return <span ref={host} style={{display:'contents'}}/>;
});
