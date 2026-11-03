module.exports=function verifyFrames(approved,revision,files,digest){
 if(!approved||approved.format!==1||approved.sourceRevision!==revision||!approved.frames||typeof approved.frames!=='object'||Object.keys(approved.frames).length!==files.length)throw Error('Interaction sources changed: regenerate and review frames before building');
 for(const file of files)if(!Object.hasOwn(approved.frames,file)||approved.frames[file]!==digest(file))throw Error('Unapproved interaction frame: '+file);
};
