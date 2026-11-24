import {bounded,parseTools,safety,type Tool,type Dict,object} from '../core/model';
import {validate,emptySchema} from '../core/schema';
export interface NativeTool extends Tool {source?:Window|null;window?:Window|null}
export interface NativeContext extends EventTarget {
 getTools?:()=>Promise<NativeTool[]>;
 executeTool?:(handle:NativeTool,input:Dict)=>Promise<unknown>;
}
export function adapter(doc:Document){
 const api=(doc as Document & {modelContext?:NativeContext}).modelContext;
 const origin=doc.location.origin;
 async function inventory(){
  const all=await api?.getTools?.()??[];
  const handles=all.filter(h=>(h.source??h.window)===doc.defaultView);
  const tools=parseTools(handles.map(h=>({name:h.name,description:h.description,inputSchema:h.inputSchema??undefined,annotations:h.annotations??undefined,origin})));
  return {handles,tools};
 }
 return {api,async discover(){return {origin,available:typeof api?.getTools==='function',executable:typeof api?.executeTool==='function',tools:(await inventory()).tools};},
 async invoke(expected:Tool,input:unknown,confirmed:boolean){
  if(!api?.executeTool||!api.getTools)throw Error('Native WebMCP execution is unavailable.');
  const {handles,tools}=await inventory();
  const matches=tools.filter(t=>t.name===expected.name);
  if(matches.length!==1||JSON.stringify(matches[0])!==JSON.stringify(expected))throw Error('Registration changed. Refresh before running.');
  const t=matches[0];
  if(safety(t)!=='Read-only'&&!confirmed)throw Error('Explicit confirmation is required.');
  bounded(input);
  const errors=validate(t.inputSchema??emptySchema,input);
  if(!object(input)||errors.length)throw Error(errors[0]??'Expected object arguments.');
  const result=await api.executeTool(handles[tools.indexOf(t)],input);
  bounded(result,48000);
  if(typeof result==='string'){try{return JSON.parse(result);}catch{return result;}}
  return result??null;
 }};
}
