const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map(),stored=new Map();
const element=id=>{if(!nodes.has(id))nodes.set(id,{value:'',style:{},classList:{toggle(){}},addEventListener(){},hidden:false,open:false});return nodes.get(id)};
const context=vm.createContext({document:{getElementById:element},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},window:{addEventListener(){}},setTimeout(){},structuredClone,alert(){},confirm:()=>true,console});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'),context);
(async()=>{
 assert.equal(vm.runInContext('valid({version:1,posts:[],codes:[]})',context),true);
 assert.equal(await vm.runInContext('persist({version:1,posts:[],codes:[{id:"test",name:"תמה",definition:"הגדרה"}]})',context),true);
 assert.equal(JSON.parse([...stored.values()][0]).codes.length,1);
 vm.runInContext('cloud={save:async()=>{throw Error("offline")}}',context);
 assert.equal(await vm.runInContext('persist({version:1,posts:[],codes:[]})',context),false);
 assert.equal(vm.runInContext('data.codes.length',context),1,'failed cloud save must preserve current data');
 vm.runInContext('cloud={save:async()=>{const e=Error();e.code="conflict";throw e}}',context);
 assert.equal(await vm.runInContext('persist({version:1,posts:[],codes:[]})',context),false);
 assert.equal(vm.runInContext('cloudLocked',context),true,'stale client must lock writes');
 assert.equal(await vm.runInContext('persist({version:1,posts:[],codes:[]})',context),false);
 console.log('PASS: local persistence, cloud failure preservation, conflict lock');
})().catch(e=>{console.error(e);process.exitCode=1});
