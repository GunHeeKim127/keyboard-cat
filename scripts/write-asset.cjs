const fs=require('node:fs');
// Keep identical generated assets untouched (also avoids unnecessary sync writes).
async function writeAsset(file,buffer){
 for(let attempt=0;;attempt++){
  try{
   try{if((await fs.promises.readFile(file)).equals(buffer))return;}catch(error){if(error.code!=='ENOENT')throw error;}
   await fs.promises.writeFile(file,buffer);return;
  }catch(error){
   if(attempt>=2||!['EBUSY','EPERM','UNKNOWN'].includes(error.code))throw error;
   await new Promise(resolve=>setTimeout(resolve,100*(attempt+1)));
  }
 }
}
module.exports={writeAsset};
