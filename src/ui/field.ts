import {Component,computed,input,output} from '@angular/core';
import {object,pretty} from '../core/model';
import {initial} from '../core/schema';
@Component({selector:'ck-field',template:`
@if (choices().length) {
 <select [attr.aria-label]="label()" (change)="changed.emit(choices()[+$any($event.target).value])">
 @for (v of choices();track $index){<option [value]="$index" [selected]="pretty(v)===pretty(value())">{{pretty(v)}}</option>}
 </select>
} @else { @switch (type()){
 @case ('object'){
 @for (pair of fields();track pair[0]){
 <div class="field"><div class="line"><strong>{{pair[0]}}</strong><small>{{required(pair[0])?'required':'optional'}}</small>
 @if(!required(pair[0])){<button (click)="toggle(pair)" [attr.aria-label]="(has(pair[0])?'Remove ':'Include ')+pair[0]">{{has(pair[0])?'Remove':'Include'}}</button>}</div>
 @if(has(pair[0])||required(pair[0])){
 <small>{{description(pair[1])}}</small><ck-field [schema]="pair[1]" [label]="pair[0]" [value]="record()[pair[0]]" (changed)="put(pair[0],$event)"/>
 }</div>}
 @if(!fields().length){<p class="muted">No named fields. Use JSON to enter additional arguments.</p>}
 }
 @case ('array'){
 @for(item of list();track $index;let i=$index){<div class="field"><div class="line"><strong>Item {{i+1}}</strong><button (click)="remove(i)">Remove</button></div><ck-field [schema]="definition()['items']" [value]="item" [label]="label()+' item '+(i+1)" (changed)="replace(i,$event)"/></div>}
 <button (click)="add()">Add item</button>
 }
 @case ('boolean'){<label><input type="checkbox" [checked]="value()===true" (change)="changed.emit($any($event.target).checked)"> {{label()}}</label>}
 @case ('null'){<code>null</code>}
 @default{<input [attr.aria-label]="label()" [type]="numeric()?'number':'text'" [value]="value()??''" (input)="edit($any($event.target))">}
 }}
`})
export class Field{
 schema=input.required<unknown>();value=input.required<unknown>();label=input('Arguments');changed=output<unknown>();pretty=pretty;
 definition=computed(()=>{const s=this.schema();return object(s)?s:{};});
 type=computed(()=>this.definition()['type']??(this.definition()['properties']?'object':'string'));
 numeric=computed(()=>['number','integer'].includes(String(this.type())));
 fields=computed(()=>{const props=this.definition()['properties'];return object(props)?Object.entries(props):[];});
 choices=computed(()=>{const choices=this.definition()['enum'];return Array.isArray(choices)?choices:[];});
 record=computed(()=>{const v=this.value();return object(v)?v:{};});
 list=computed(()=>{const v=this.value();return Array.isArray(v)?v:[];});
 has(k:string){return Object.hasOwn(this.record(),k);}
 required(k:string){const r=this.definition()['required'];return Array.isArray(r)&&r.includes(k);}
 description(s:unknown){return object(s)?String(s['description']??''):'';}
 put(k:string,v:unknown){this.changed.emit({...this.record(),[k]:v});}
 toggle([k,s]:[string,unknown]){if(!this.has(k))this.put(k,initial(s));else{const next={...this.record()};delete next[k];this.changed.emit(next);}}
 edit(el:HTMLInputElement){this.changed.emit(this.numeric()?(el.value===''?null:el.valueAsNumber):el.value);}
 replace(i:number,v:unknown){this.changed.emit(this.list().map((x,j)=>i===j?v:x));}
 remove(i:number){this.changed.emit(this.list().filter((_,j)=>i!==j));}
 add(){this.changed.emit([...this.list(),initial(this.definition()['items'])]);}
}
