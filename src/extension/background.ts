import {isCommand,respond,trustedUI,unwrap,errorMessage,type Command,type History,type PageCommand,type PageSnapshot} from '../core/bridge';
import {append} from '../core/history';
import {bounded,type Entry,type Snapshot} from '../core/model';
let queue:Promise<unknown>=Promise.resolve();
function history(change?:(h:History)=>History):Promise<History>{
 const task=queue.then(async()=>{
  const {persistent=false}=await chrome.storage.local.get('persistent');
  const store=persistent?chrome.storage.local:chrome.storage.session;
  const {entries=[]}=await store.get('entries');
  const current:History={persistent:!!persistent,entries:entries as Entry[]};
  if(!change)return current;
  const next=change(current);
  const dest=next.persistent?chrome.storage.local:chrome.storage.session;
  await dest.set({entries:next.entries});
  if(next.persistent!==current.persistent){
   await chrome.storage.local.set({persistent:next.persistent});
   await store.remove('entries');
  }
  return next;
 });
 queue=task.catch(()=>{});
 return task;
}
const log=(entry:Entry)=>history(h=>({...h,entries:append(h.entries,entry)}));
const inventories=new Map<number,{doc:string;signature:string}>();
chrome.tabs.onRemoved.addListener(id=>inventories.delete(id));
async function active(windowId:number){
 const [tab]=await chrome.tabs.query({active:true,windowId});
 if(tab?.id===undefined||!tab.url||!/^https?:\/\//.test(tab.url))throw Error('Open ContextKit from its toolbar icon on an HTTP or HTTPS page to grant access.');
 return {id:tab.id,origin:new URL(tab.url).origin};
}
function page<T>(id:number,doc:string,m:PageCommand){
 return unwrap<T>(chrome.tabs.sendMessage(id,m,{documentId:doc}));
}
async function inspect(windowId:number):Promise<Snapshot>{
 const tab=await active(windowId);
 const [frame]=await chrome.scripting.executeScript({target:{tabId:tab.id,frameIds:[0]},files:['content.js'],world:'ISOLATED'});
 if(!frame?.documentId)throw Error('The active document changed. Refresh to reconnect.');
 const snap=await page<PageSnapshot>(tab.id,frame.documentId,{kind:'discover'});
 if(snap.origin!==tab.origin||(await active(windowId)).id!==tab.id)throw Error('The active tab changed.');
 const signature=JSON.stringify(snap.tools);
 const previous=inventories.get(tab.id);
 if(snap.available && (previous?.doc!==frame.documentId||signature!==previous?.signature)){
  inventories.set(tab.id,{doc:frame.documentId,signature});
  if(inventories.size>12)inventories.delete(inventories.keys().next().value!);
  await log({kind:'Discovery',origin:tab.origin,name:(previous?.doc===frame.documentId?'Inventory changed · ':'Discovered · ')+snap.tools.length+' tools',time:new Date().toISOString(),response:snap.tools.map(t=>t.name).slice(0,150)});
 }
 return {...snap,tab:tab.id,documentId:frame.documentId};
}
async function dispatch(m:Command){
 switch(m.kind){
 case 'inspect':return inspect(m.windowId);
 case 'history':return history();
 case 'clear':return history(h=>({...h,entries:[]}));
 case 'persist':return history(h=>({...h,persistent:m.enabled}));
 case 'run':{
  bounded(m.args,48000);
  const tab=await active(m.windowId);
  if(tab.id!==m.target.tab||tab.origin!==m.target.origin)throw Error('Tab context changed. Refresh before running.');
  const started=performance.now();
  const event:Entry={kind:'Success',name:m.tool.name,origin:tab.origin,time:new Date().toISOString(),request:m.args};
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   event.response=await Promise.race([page(tab.id,m.target.documentId,{kind:'invoke',origin:tab.origin,tool:m.tool,args:m.args,confirmed:m.confirmed}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('No result within 25 seconds. The action may have completed.')),25000);})]);
  }catch(e){event.kind='Error';event.response=errorMessage(e).slice(0,48000);}
  finally{clearTimeout(timer);}
  event.duration=Math.round(performance.now()-started);
  await log(event);
  return event;
 }}
}
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(s.id!==chrome.runtime.id||!trustedUI(s,chrome.runtime.getURL(''))||!isCommand(m))return;
 return respond(dispatch(m),reply);
});
