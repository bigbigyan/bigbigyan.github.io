import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMPTY, validate, update, merge, rowFor, equal, statistics } from '../study/core.mjs';
const set=(d,id,f,v)=>update(d,id,f,v);
test('source includes all 44 scheduled weeks, links and 504 hours',()=>{
  const p=JSON.parse(readFileSync(new URL('../study/plan.json',import.meta.url)));
  assert.equal(p.weeks.length,44);assert.equal(p.courses.length,18);assert.equal(p.guide.length,21);
  assert.equal(p.weeks[0].start,'2026-10-26');assert.equal(p.weeks.at(-1).end,'2027-08-29');assert.equal(statistics(p,EMPTY).planned,504);
  p.weeks.forEach((w,i)=>{assert.equal(w.number,i+1);assert.match(w.courseURL,/^https:\/\//);for(const k of ['practice','algorithm','acceptance','chapters'])assert.ok(w[k]);});
});
test('passing requires all tasks and evidence; unchecking reopens acceptance',()=>{
  let d=set(EMPTY,'w01','practice',true);assert.equal(rowFor(d,'w01').status,'进行中');
  assert.throws(()=>set(d,'w01','status','通过'));
  d=set(set(d,'w01','algorithm',true),'w01','acceptance',true);assert.throws(()=>set(d,'w01','status','通过'));
  d=set(set(d,'w01','record','代码与独立验收结果'),'w01','status','通过');
  assert.equal(rowFor(d,'w01').status,'通过');assert.equal(rowFor(set(d,'w01','practice',false),'w01').status,'待复测');
  assert.equal(rowFor(set(d,'w01','record',''),'w01').status,'待复测');
});
test('two computers merge independent fields and different weeks',()=>{
  const l=set(set(EMPTY,'w01','practice',true),'w02','record','本地记录');
  const r=set(EMPTY,'w01','hours','2.5'),result=merge(EMPTY,l,r);
  assert.deepEqual(result.conflicts,[]);assert.equal(rowFor(result.document,'w01').practice,true);assert.equal(rowFor(result.document,'w01').hours,'2.5');assert.equal(rowFor(result.document,'w02').record,'本地记录');
});
test('conflicting records are reported without changing either original',()=>{
  const l=set(EMPTY,'w01','record','电脑A'),r=set(EMPTY,'w01','record','电脑B'),result=merge(EMPTY,l,r);
  assert.equal(result.conflicts.length,1);assert.equal(result.conflicts[0].field,'record');assert.equal(rowFor(result.document,'w01').record,'电脑A');assert.equal(rowFor(r,'w01').record,'电脑B');
});
test('cleared evidence and remote acceptance cannot silently remain passed',()=>{
  let b=EMPTY;for(const f of ['practice','algorithm','acceptance'])b=set(b,'w01',f,true);b=set(b,'w01','record','已有记录');
  const result=merge(b,set(b,'w01','record',''),set(b,'w01','status','通过'));
  assert.equal(rowFor(result.document,'w01').status,'待复测');assert.equal(rowFor(result.document,'w01').record,'');
});
test('invalid imported types, dates, hours, week IDs and oversized records rejected',()=>{
  for(const row of [{hours:'-1'},{hours:'NaN'},{hours:'1001'},{hours:'2.001'},{reviewDate:'2027-02-30'},{practice:'true'},{record:'a'.repeat(20001)},{status:'已完成'}])assert.throws(()=>validate({version:1,weeks:{w01:row}}));
  assert.throws(()=>validate({version:1,weeks:{w45:{}}}));assert.throws(()=>validate({version:2,weeks:{}}));
  assert.equal(rowFor(set(EMPTY,'w01','hours','0'),'w01').hours,'0');
});
test('equality ignores key insertion order and explicit blank defaults',()=>{
  const a=set(set(EMPTY,'w01','record','A'),'w02','record','B'),b=set(set(EMPTY,'w02','record','B'),'w01','record','A');assert.ok(equal(a,b));assert.ok(equal(EMPTY,{version:1,weeks:{w01:{}}}));
});
