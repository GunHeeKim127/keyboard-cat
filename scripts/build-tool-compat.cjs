// Adapt the two remaining legacy consumers to patched matching/glob APIs.
// Exact replacements fail closed if an upstream update changes the call sites.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const replacements=[
 ['dir-compare/build/src/FilterHandler/defaultFilterHandler.js','const minimatch_1 = __importDefault(require("minimatch"));','const minimatch_1 = { default: require("minimatch").minimatch };'],
 ['rimraf/rimraf.js','var glob = require("glob")','var glob = Object.assign(function(pattern, options, callback) { require("glob").glob(pattern, options).then(function(files) { callback(null, files) }, callback) }, { sync: require("glob").globSync, hasMagic: require("glob").hasMagic })'],
];
for(const [relative,before,after] of replacements){
 const file=path.join(root,'node_modules',relative),source=fs.readFileSync(file,'utf8');
 if(source.includes(after))continue;
 if(source.split(before).length!==2)throw Error('Build-tool compatibility patch needs review: '+relative);
 fs.writeFileSync(file,source.replace(before,after));
}
console.log('Build tool compatibility: patched minimatch callable adapters verified');
