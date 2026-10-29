const $=id=>document.getElementById(id);
let guest=null;
const endpoint=window.JABARI_CONFIG?.appsScriptUrl || '';
if (!endpoint) {
 $('beginRsvp').disabled=true;
 $('beginRsvp').textContent='RSVP opens soon';
}
let retryKey=null,retryPayload=null;
async function api(path,options={}) {
 if(path!=='/api/rsvps') throw Error('Unsupported request.');
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint)) throw Error('RSVP is not configured yet. Please contact 0703 749 652.');
 const payload=JSON.parse(options.body);
 const fingerprint=JSON.stringify(payload);
 if(fingerprint!==retryPayload){retryKey=crypto.randomUUID();retryPayload=fingerprint;}
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),30000);
 try {
  const response=await fetch(endpoint,{method:'POST',redirect:'follow',credentials:'omit',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...payload,requestId:retryKey}),signal:controller.signal});
  if(!response.ok) throw Error('The RSVP service is unavailable. Please retry.');
  const result=await response.json();
  if(!result.ok || !result.id) throw Error(result.error || 'Save was not confirmed. Please retry.');
  retryKey=null;retryPayload=null;
  return result;
 } catch(err) {
  if(err.name==='AbortError' || err instanceof TypeError) throw Error('Save could not be confirmed. Please retry the same response or contact the family.');
  throw err;
 } finally {clearTimeout(timer);}
}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$(id).classList.add('active');window.scrollTo(0,0)}
function modal(id,on=true){$(id).classList.toggle('open',on);$(id).setAttribute('aria-hidden',String(!on));document.body.style.overflow=on?'hidden':''}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
document.querySelectorAll('.modal').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)modal(el.id,false)}));
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),4000)}
$('beginRsvp').onclick=()=>modal('rsvpModal');
$('rsvpForm').onsubmit=async e=>{
 e.preventDefault();const button=e.submitter;button.disabled=true;guest=Object.fromEntries(new FormData(e.currentTarget).entries());
 try{const data=await api('/api/rsvps',{method:'POST',body:JSON.stringify(guest)});modal('rsvpModal',false);
 makeInvite();showPage('invitePage');
 }catch(err){toast('RSVP not saved: '+err.message)}finally{button.disabled=false}
};
$('inviteHome').onclick=()=>showPage('homePage');
function makeInvite(){const n=guest?.name||'Guest';$('inviteMessage').textContent=guest?.attending==='no'?`Dear ${n}, thank you for your kind wishes. We will miss you at the celebration.`:guest?.attending==='maybe'?`Dear ${n}, thank you for responding. We hope you can join us for Jabari's special day.`:`Dear ${n}, we are delighted to welcome you as we celebrate Baby Jabari!`;
 $('warmMessage').textContent='Your presence and warm wishes are the greatest blessings.';}
for(let i=0;i<13;i++){let b=document.createElement('span');b.className='bubble';b.style.setProperty('--x',Math.random()*100+'%');b.style.setProperty('--size',(22+Math.random()*70)+'px');b.style.setProperty('--duration',(12+Math.random()*17)+'s');b.style.setProperty('--delay',(-Math.random()*24)+'s');$('bubbles').appendChild(b)}
