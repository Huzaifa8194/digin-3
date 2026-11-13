import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/scroll-policy.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { ScrollIntent, normalizeWheel, transitionDuration } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('one wheel notch is one complete intent', () => {
  const input = new ScrollIntent();
  assert.deepEqual(input.feed(100, 0), {direction:1, continuation:false});
  assert.equal(input.feed(80, 30), null);
});
test('fine trackpad movement accumulates, jitter does not trigger', () => {
  const input = new ScrollIntent();
  for(let i=0;i<2;i++) assert.equal(input.feed(1.5, i*15), null);
  assert.equal(input.feed(1.5, 30).direction, 1);
});
test('decaying trackpad momentum cannot skip chapters', () => {
  const input = new ScrollIntent();
  input.feed(100,0);
  let moves=0;
  for(let t=16;t<1500;t+=16) if(input.feed(80*Math.exp(-t/100),t))moves++;
  assert.equal(moves,0);
});
test('a fresh gesture advances again after silence', () => {
  const input = new ScrollIntent(); input.feed(100,0);
  assert.equal(input.feed(100,500).direction,1);
});
test('a reversal is immediately a new intent', () => {
  const input = new ScrollIntent();input.feed(100,0);
  assert.deepEqual(input.feed(-50,50),{direction:-1,continuation:false});
});
test('a sustained strong gesture never advances twice', () => {
  const input = new ScrollIntent();const actions=[];
  for(let t=0;t<3000;t+=30){const action=input.feed(60,t);if(action)actions.push(action);}
  assert.equal(actions.length,1);
});
test('reset discards partial input and permits a new gesture', () => {
  const input=new ScrollIntent();input.feed(3,0);input.reset();
  assert.equal(input.feed(3,30),null);
  assert.equal(input.feed(1,60).direction,1);
});
test('invalid deltas are ignored',()=>{
 const input=new ScrollIntent();for(const delta of [NaN,Infinity,0,.1])assert.equal(input.feed(delta,0),null);
});
test('wheel line and page units normalize before thresholding',()=>{
 assert.equal(normalizeWheel(3,1,800),48);
 assert.equal(normalizeWheel(1,2,800),800);
 assert.equal(normalizeWheel(40,0,800),40);
});
test('transitions have equal timing in both directions and stay within bounds', () => {
 for (const direction of [-1, 1]) {
  assert.equal(transitionDuration(direction,800),.38);
  assert.equal(transitionDuration(direction * 100000,800),.63);
 }
 assert.equal(transitionDuration(-1600,800),transitionDuration(1600,800));
});

test('minor opposite-direction trackpad noise cannot reverse a transition',()=>{
 const input=new ScrollIntent();input.feed(100,0);
 for(let t=10;t<200;t+=20){assert.equal(input.feed(-4,t),null);assert.equal(input.feed(20,t+10),null);}
 assert.equal(input.feed(-12,210),null);
 assert.equal(input.feed(-4,230).direction,-1);
});


test('a delayed momentum burst is still the same gesture',()=>{
 const input=new ScrollIntent();
 assert.equal(input.feed(100,0).direction,1);
 assert.equal(input.feed(80,100),null);
 assert.equal(input.feed(60,230),null);
 assert.equal(input.feed(100,400).direction,1);
});

test('feedback reflects partial gesture and resets after cancellation',()=>{const input=new ScrollIntent();assert.equal(input.progress,0);input.feed(2,0);assert.equal(input.progress,.5);input.feed(2,20);assert.equal(input.progress,1);input.reset();assert.equal(input.progress,0);});

test('light movement triggers equally and its momentum stays consumed in both directions', () => {
  for (const direction of [-1, 1]) {
    const input = new ScrollIntent();
    assert.equal(input.feed(direction * 2, 0), null);
    assert.equal(input.progress, .5);
    assert.equal(input.feed(direction * 2, 15).direction, direction);
    for (let time = 30; time <= 700; time += 15) assert.equal(input.feed(direction * 8, time), null);
    assert.equal(input.feed(direction * 10, 850).direction, direction);
  }
});

test('fractional wheel deltas accumulate during a single gesture', () => {
  const input = new ScrollIntent();
  for (let frame = 0; frame < 15; frame++) assert.equal(input.feed(.25, frame * 12), null);
  assert.equal(input.feed(.25, 180).direction, 1);
});
