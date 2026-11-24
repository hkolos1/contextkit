import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {zipSync} from 'fflate';
const files={};
for(const path of (await readdir('dist',{recursive:true,withFileTypes:true})).filter(p=>p.isFile())){
 const name=path.parentPath+'/'+path.name;
 files[name.slice(name.indexOf('dist/')+5)]=await readFile(name);
}
await mkdir('release',{recursive:true});
await writeFile('release/contextkit-1.0.0.zip',zipSync(files));
