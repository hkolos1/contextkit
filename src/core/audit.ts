import {object,type Tool,safety} from './model';
import {inspectSchema} from './schema';
export interface Finding {tool:string; category:'Specification'|'Recommendation'|'Heuristic'; severity:'Error'|'Warning'|'Info'; explanation:string; remediation:string}
export function audit(tools:Tool[]):Finding[]{
 const results:Finding[]=[];
 const seen=new Set<string>();
 for(const t of tools){
  const add=(category:Finding['category'],severity:Finding['severity'],explanation:string,remediation:string)=>results.push({tool:t.name,category,severity,explanation,remediation});
  const spec=(e:string,r:string)=>add('Specification','Error',e,r);
  const tip=(e:string,r:string)=>add('Recommendation','Info',e,r);
  const flag=(e:string,r:string)=>add('Heuristic','Warning',e,r);
  const identity=JSON.stringify([t.origin,t.name]);
  if(seen.has(identity))spec('Repeated name in this document inventory.','Give each registration a distinct name.');
  seen.add(identity);
  if(!/^[a-zA-Z0-9_.-]{1,128}$/.test(t.name))spec('Name is outside the WebMCP registration grammar.','Use 1–128 ASCII letters, digits, dots, underscores or hyphens.');
  if(!t.description)spec('Registration is missing its description.','Describe the action and its result.');
  else if(t.description.trim().split(/\s+/).length<4)tip('Description gives little context.','Describe what changes or what data is returned.');
  if(safety(t)==='Unclassified')tip('No affirmative safety classification.','Document side effects and supply accurate safety annotations.');
  if(/ignore (all |any |previous |prior |the )*(instructions|rules)|system prompt|override.*instructions/i.test(t.description))flag('Description resembles instructions to an agent.','Describe only the tool contract and review embedded instructions.');
  if(/\b(anything|arbitrary|any action|all operations)\b/i.test(t.description))flag('Description suggests broad responsibilities.','Split unrelated operations into narrowly scoped tools.');
  if(/[\u202a-\u202e\u2066-\u2069]|<script\b/i.test(t.name+t.description))flag('Metadata contains hidden direction changes or script-like text.','Review the source text and remove misleading markup.');
  if(t.inputSchema!==undefined){
   for(const i of inspectSchema(t.inputSchema))add('Recommendation',i.unsupported?'Info':'Error',i.path+' · '+i.message,i.unsupported?'Inspect with a validator for the declared dialect.':'Correct the JSON Schema definition.');
   function walk(s:unknown,path:string){
    if(!object(s))return;
    for(const [lo,hi] of [['minimum','maximum'],['minLength','maxLength'],['minItems','maxItems']])if(typeof s[lo]==='number'&&typeof s[hi]==='number'&&s[lo]>s[hi])flag(path+' has contradictory bounds.','Ensure the lower bound is at most the upper bound.');
    if(object(s['properties']))for(const [k,p] of Object.entries(s['properties'])){
     const key=path+'.'+k;
     if(!object(p)||!p['description'])tip(key+' has no description.','Explain the expected value and units.');
     if(/password|secret|token|api.?key|credit.?card/i.test(k))flag(key+' may contain sensitive data.','Minimize collection and review handling of this field.');
     walk(p,key);
    }
    walk(s['items'],path+'[]');
   }
   walk(t.inputSchema,'$');
  }
 }
 return results;
}
