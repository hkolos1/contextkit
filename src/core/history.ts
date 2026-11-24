import type {Entry} from './model';
export function append(entries:Entry[],entry:Entry){
 const next=[entry,...entries].slice(0,100);
 let total=0;
 return next.filter(e=>{total+=JSON.stringify(e).length;return total<=400000;});
}
