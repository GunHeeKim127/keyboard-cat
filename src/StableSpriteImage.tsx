import React,{useRef,useState} from 'react';

type ImageProps=Omit<React.ImgHTMLAttributes<HTMLImageElement>,'src'|'onLoad'|'onError'> & {src:string};
type Request={id:string;props:ImageProps};
// Keep the decoded DOM image on screen until its replacement is decoded too.
// Reusing the pending element's key promotes that same element, without a blank paint.
export const StableSpriteImage=React.memo(function StableSpriteImage({restart=0,...props}:ImageProps & {restart?:string|number}){
 const request:Request={id:props.src+'\0'+restart,props},latest=useRef(request);
 latest.current=request;
 const [shown,setShown]=useState<Request>();
 const visible=shown?.id===request.id?request:shown;
 const pending=shown?.id!==request.id;
 return <>
  {visible&&<img key={visible.id} {...visible.props}/>}
  {pending&&<img key={request.id} {...props} aria-hidden="true" style={{...props.style,position:'absolute',left:0,top:0,visibility:'hidden',pointerEvents:'none'}} onLoad={e=>{
   const image=e.currentTarget,id=request.id;
   void image.decode().then(()=>{if(image.isConnected&&latest.current.id===id)setShown(latest.current);},()=>{/* Keep the previous verified image. */});
  }}/>}
 </>;
});
