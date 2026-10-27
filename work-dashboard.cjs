const fs=require('node:fs');
const target=__dirname+'/apps-script/Dashboard.html';
const script=String.raw`
const $=id=>document.getElementById(id);let rows=[];
function render(){
 const q=$('search').value.toLowerCase();
 $('thead').replaceChildren();$('tbody').replaceChildren();
 const headers=['Name','Phone','Attendance','Guests','Message','Submitted'];
 const hr=document.createElement('tr');headers.forEach(t=>{const el=document.createElement('th');el.textContent=t;hr.append(el)});$('thead').append(hr);
 const filtered=rows.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(q)));
 filtered.forEach(r=>{const tr=document.createElement('tr');[r.full_name,r.phone,r.attending,r.guests,r.note,r.created_at].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});$('tbody').append(tr)});
 if(!filtered.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='No matching responses.';tr.append(td);$('tbody').append(tr)}
 const stats=[['Responses',rows.length],['Expected guests',rows.filter(r=>r.attending==='yes').reduce((s,r)=>s+Number(r.guests),0)],['Maybe responses',rows.filter(r=>r.attending==='maybe').length],['Not attending',rows.filter(r=>r.attending==='no').length]];
 $('cards').replaceChildren(...stats.map(([label,n])=>{const el=document.createElement('div');el.className='metric';const b=document.createElement('b'),s=document.createElement('span');b.textContent=n;s.textContent=label;el.append(b,s);return el}));
}
function load(){
 $('refresh').disabled=true;$('tableSub').textContent='Loading private responses…';
 google.script.run.withSuccessHandler(data=>{rows=data;render();$('refresh').disabled=false;$('tableSub').textContent='Updated '+new Date().toLocaleTimeString();})
 .withFailureHandler(()=>{rows=[];render();$('refresh').disabled=false;$('tableSub').textContent='Unable to load. Open from the private Google Sheet and sign in.';}).getDashboardData();
}
$('refresh').onclick=load;$('search').oninput=render;
$('export').onclick=()=>{
 const keys=['full_name','phone','attending','guests','note','created_at'];
 const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 const text=[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='jabari-rsvps.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};load();
`;
fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace(/<script>[\s\S]*?<\/script>/,'<script>__DASHBOARD_SCRIPT__</script>').replace('__DASHBOARD_SCRIPT__',()=>script));
