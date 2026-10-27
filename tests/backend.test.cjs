const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
function harness(){
 const records=[['id','request_id','created_at','full_name','phone','attending','guests','note']];let writes=0,locks=0;
 const sheet={getLastRow:()=>records.length,appendRow:r=>{writes++;records.push(r)},getRange:(row,col,n=1,width=1)=>({getValues:()=>records.slice(row-1,row-1+n).map(r=>r.slice(col-1,col-1+width)),getValue:()=>records[row-1]?.[col-1],createTextFinder:value=>({matchEntireCell(){return this},findNext:()=>{const i=records.findIndex((r,j)=>j>0&&r[col-1]===value);return i<0?null:{getRow:()=>i+1}}})})};
 const cache=new Map();
 const context=vm.createContext({SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'private-sheet'})},LockService:{getScriptLock:()=>({waitLock:()=>locks++,releaseLock:()=>locks--})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},Utilities:{getUuid:()=> 'saved-id'},ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})},Session:{getActiveUser:()=>({getEmail:()=>''})}});
 vm.runInContext(source,context);
 const post=d=>context.doPost({postData:{contents:JSON.stringify(d)}});
 return {context,post,records,get writes(){return writes},get locks(){return locks}};
}
const guest={name:'Test Guest',phone:'0703749652',attending:'yes',guests:'2',note:'Welcome!',consent:'yes',requestId:'11111111-1111-4111-8111-111111111111'};
test('persists normalized RSVP and confirms saved ID',()=>{const h=harness(),r=h.post(guest);assert.equal(r.ok,true);assert.equal(r.id,'saved-id');assert.equal(h.records[1][4],'254703749652');assert.equal(h.records[1][6],2);assert.equal(h.locks,0)});
test('lost-response retries do not create duplicate rows',()=>{const h=harness();h.post(guest);const r=h.post(guest);assert.equal(r.duplicate,true);assert.equal(h.writes,1)});
test('rejects invalid input without writing',()=>{for(const change of [{consent:''},{phone:'123'},{attending:'invalid'},{guests:21},{note:'x'.repeat(1001)},{requestId:'bad'},{website:'spam'}]){const h=harness();assert.equal(h.post({...guest,...change}).ok,false);assert.equal(h.writes,0)}});
test('declines count zero guests and formula input stays text',()=>{const h=harness();h.post({...guest,name:'=HYPERLINK("bad")',attending:'no'});assert.equal(h.records[1][6],0);assert.equal(h.records[1][3][0],"'")});
test('anonymous dashboard access denied, public GET contains no guest records',()=>{const h=harness();assert.throws(()=>h.context.getDashboardData());assert.deepEqual(h.context.doGet(),{ok:true,service:'Jabari RSVP',mpesaEnabled:false})});
test('per-phone throttle rejects sixth unique response',()=>{const h=harness();for(let i=0;i<5;i++)assert.equal(h.post({...guest,requestId:String(i).repeat(8)+'-1111-4111-8111-111111111111'}).ok,true);assert.equal(h.post({...guest,requestId:'66666666-1111-4111-8111-111111111111'}).ok,false);assert.equal(h.writes,5)});
test('Pages uses relative scripts and includes explicit consent',()=>{const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');assert.ok(html.includes('src="./client.js"'));assert.ok(html.includes('name="consent"'));assert.ok(!html.includes('src="/client.js"'))});
test('dashboard script compiles and is excluded from public website',()=>{const html=fs.readFileSync(path.join(__dirname,'../apps-script/Dashboard.html'),'utf8');const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);assert.ok(!script.includes('__DASHBOARD_SCRIPT__'));assert.equal(fs.existsSync(path.join(__dirname,'../public/admin.html')),false)});
