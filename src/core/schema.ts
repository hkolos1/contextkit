import {object,type Dict} from './model';
export const emptySchema={type:'object',properties:{},additionalProperties:false};
const types=['object','string','boolean','integer','number','array','null'];
const allowed=new Set('type title description default examples properties required additionalProperties items enum const minimum maximum minLength maxLength minItems maxItems'.split(' '));
export interface SchemaIssue {path:string; message:string; unsupported?:boolean}
export function inspectSchema(schema:unknown,path='$'):SchemaIssue[]{
 if(typeof schema==='boolean')return [];
 if(!object(schema))return [{path,message:'A schema must be an object or boolean.'}];
 const issues:SchemaIssue[]=[];
 const issue=(message:string,unsupported=false)=>issues.push({path,message,unsupported});
 for(const key of Object.keys(schema))if(!allowed.has(key))issue('Local validator does not implement '+key+'.',true);
 const {type,properties,required,items,additionalProperties:extras}=schema;
 if(type!==undefined){
  if(Array.isArray(type)&&type.length&&type.every(t=>types.includes(t))&&new Set(type).size===type.length)issue('Union types require a full JSON Schema validator.',true);
  else if(!types.includes(String(type))||typeof type!=='string')issue('Unknown schema type.');
 }
 if(required!==undefined && (!Array.isArray(required)||!required.every(k=>typeof k==='string')||new Set(required).size!==required.length))issue('required must contain unique property names.');
 if(properties!==undefined){
  if(!object(properties))issue('properties must be an object.');
  else for(const [k,s] of Object.entries(properties))issues.push(...inspectSchema(s,path+'.'+k));
 }
 if(items!==undefined)issues.push(...inspectSchema(items,path+'[]'));
 if(extras!==undefined)issues.push(...inspectSchema(extras,path+'.*'));
 if(schema['enum']!==undefined&&(!Array.isArray(schema['enum'])||!schema['enum'].length))issue('enum must contain at least one choice.');
 for(const k of ['minimum','maximum'])if(schema[k]!==undefined && typeof schema[k]!=='number')issue(k+' must be a number.');
 for(const k of ['minLength','maxLength','minItems','maxItems'])if(schema[k]!==undefined && (!Number.isInteger(schema[k])||Number(schema[k])<0))issue(k+' must be a nonnegative integer.');
 for(const k of ['description','title'])if(schema[k]!==undefined&&typeof schema[k]!=='string')issue(k+' must be text.');
 return issues;
}
const equal=(a:unknown,b:unknown):boolean=>{
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
 if(object(a)&&object(b))return Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([k,v])=>Object.hasOwn(b,k)&&equal(v,b[k]));
 return a===b;
};
export function validate(schema:unknown,input:unknown):string[]{
 const errors=inspectSchema(schema).map(i=>i.path+' · '+i.message);
 if(errors.length)return errors;
 if(!object(input))return ['Tool arguments must be a JSON object.'];
 function check(s:unknown,v:unknown,path:string){
  if(s===false){errors.push(path+' is disallowed.');return;}
  if(!object(s))return;
  const actual=v===null?'null':Array.isArray(v)?'array':typeof v;
  if(s['type'] && actual!==s['type'] && !(s['type']==='integer'&&Number.isInteger(v)))errors.push(path+' expects '+s['type']+'.');
  if(Array.isArray(s['enum'])&&!s['enum'].some(choice=>equal(choice,v)))errors.push(path+' is outside the allowed choices.');
  if(Object.hasOwn(s,'const')&&!equal(s['const'],v))errors.push(path+' must match the constant value.');
  if(object(v)){
   for(const k of (s['required']??[]) as string[])if(!Object.hasOwn(v,k))errors.push(path+'.'+k+' is required.');
   const props=object(s['properties'])?s['properties']:{};
   for(const [k,value] of Object.entries(v))check(Object.hasOwn(props,k)?props[k]:s['additionalProperties'],value,path+'.'+k);
  }
  if(Array.isArray(v))v.forEach((item,i)=>check(s['items'],item,path+'['+i+']'));
  const range=(n:number,min:string,max:string)=>{
   if(typeof s[min]==='number'&&n<s[min])errors.push(path+' is below '+min+' '+s[min]+'.');
   if(typeof s[max]==='number'&&n>s[max])errors.push(path+' exceeds '+max+' '+s[max]+'.');
  };
  if(typeof v==='number')range(v,'minimum','maximum');
  if(typeof v==='string')range([...v].length,'minLength','maxLength');
  if(Array.isArray(v))range(v.length,'minItems','maxItems');
 }
 check(schema,input,'$');
 return errors;
}
export function initial(schema:unknown):unknown{
 const s:Dict=object(schema)?schema:{};
 if(Object.hasOwn(s,'default'))return s['default'];
 if(Array.isArray(s['enum']))return s['enum'][0];
 switch(s['type']){
 case 'object':return Object.fromEntries(Object.entries(object(s['properties'])?s['properties']:{}).filter(([k])=>Array.isArray(s['required'])&&s['required'].includes(k)).map(([k,v])=>[k,initial(v)]));
 case 'array':return [];case 'number':case 'integer':return 0;case 'boolean':return false;case 'null':return null;default:return '';
 }
}
