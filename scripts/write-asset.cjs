const fs=require('node:fs');
// Keep identical generated assets untouched (also avoids unnecessary sync writes).
async function writeAsset(file,buffer){
 try{if((await fs.promises.readFile(file)).equals(buffer))return;}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.promises.writeFile(file,buffer);
}
module.exports={writeAsset};
