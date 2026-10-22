const fs=require('node:fs'),crypto=require('node:crypto');
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function readCache(file){
 try{if(fs.statSync(file).size>65536)return {};const value=JSON.parse(fs.readFileSync(file,'utf8'));return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}
}
function cacheEntry(key,files){return {key,hashes:Object.fromEntries(files.map(file=>[file,digest(fs.readFileSync(file))]))};}
function cacheMatches(entry,key,files){
 try{return !!(entry&&entry.key===key&&entry.hashes&&typeof entry.hashes==='object'&&!Array.isArray(entry.hashes)&&Object.keys(entry.hashes).length===files.length&&files.every(file=>Object.hasOwn(entry.hashes,file)&&entry.hashes[file]===digest(fs.readFileSync(file))));}catch{return false;}
}
module.exports={digest,readCache,cacheEntry,cacheMatches};
