import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/nested-scroll.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {nestedCanScroll}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
class ElementStub {
 constructor(parent=null,options={}){Object.assign(this,{parentElement:parent,scrollHeight:2000,clientHeight:700,scrollTop:100,overflowY:'auto',form:false},options);}
 closest(selector){return selector.includes('input') && this.form?this:null;}
}
globalThis.Element=ElementStub;
const root=new ElementStub();
const body=new ElementStub(root);
globalThis.document={documentElement:root,body,scrollingElement:root};
globalThis.getComputedStyle=element=>({overflowY:element.overflowY});
test('wheel over the orb/page root stays under chapter control',()=>{
 assert.equal(nestedCanScroll(root,100),false);
 assert.equal(nestedCanScroll(root,-100),false);
 assert.equal(nestedCanScroll(body,100),false);
 assert.equal(nestedCanScroll(new ElementStub(root,{overflowY:'visible'}),100),false);
});
test('genuinely nested scroll areas retain scrolling until their edge',()=>{
 const nested=new ElementStub(body);
 assert.equal(nestedCanScroll(nested,100),true);
 nested.scrollTop=1300;
 assert.equal(nestedCanScroll(nested,100),false);
 assert.equal(nestedCanScroll(nested,-100),true);
 nested.scrollTop=0;
 assert.equal(nestedCanScroll(nested,-100),false);
});
test('form fields retain their native wheel behavior',()=>{
 assert.equal(nestedCanScroll(new ElementStub(body,{form:true}),100),true);
});

test('guided chapters advance the page over nested content and fields',()=>{const nested=new ElementStub(body);assert.equal(nestedCanScroll(nested,100,true),false);assert.equal(nestedCanScroll(nested,-100,true),false);assert.equal(nestedCanScroll(new ElementStub(body,{form:true}),100,true),false);});
