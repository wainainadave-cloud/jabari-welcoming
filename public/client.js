const gifts=[{name:'Baby Stroller',icon:'ic-stroller',price:22000,desc:'A comfortable ride for little adventures.'},{name:'Baby Cot',icon:'ic-crib',price:28000,desc:'A peaceful place for naps and dreams.'},{name:'Baby Clothes',icon:'ic-clothes',price:9000,desc:'Sweet outfits for a growing little one.'},{name:'Feeding Set',icon:'ic-bottle',price:6500,desc:'Feeding essentials for daily routines.'},{name:'Baby Bath Set',icon:'ic-bath',price:7500,desc:'Gentle bathtime essentials.'},{name:'Teddy & Toys',icon:'ic-teddy',price:5500,desc:'Soft companions and playtime joy.'},{name:'Baby Essentials Fund',icon:'ic-gift',price:12000,desc:'Diapers, wipes and other useful supplies.'},{name:'Bless as Led',icon:'ic-heart',price:1000,desc:'Give any amount, from the heart.'}];
const $=id=>document.getElementById(id),money=n=>'KSh '+Number(n).toLocaleString('en-KE');
let guest=null,rsvpId=null,selected=null,payment=null,config={mpesaEnabled:false};
const endpoint=window.JABARI_CONFIG?.appsScriptUrl || '';
$('paymentAvailability').textContent='M-Pesa payments are not enabled. No money will be requested.';
$('pledge').disabled=true;
$('pledge').textContent='M-Pesa unavailable';
if (!endpoint) {
 $('beginRsvp').disabled=true;
 $('beginRsvp').textContent='RSVP opens soon';
}
let retryKey=null,retryPayload=null;
async function api(path,options={}) {
 if(path!=='/api/rsvps') throw Error('Payments are disabled.');
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
 try{const data=await api('/api/rsvps',{method:'POST',body:JSON.stringify(guest)});rsvpId=data.id;modal('rsvpModal',false);
 if(guest.attending==='no'){makeInvite();showPage('invitePage')}else setTimeout(()=>modal('giftPrompt'),160);
 }catch(err){toast('RSVP not saved: '+err.message)}finally{button.disabled=false}
};
$('yesGift').onclick=()=>{modal('giftPrompt',false);showPage('giftPage')};
$('noGift').onclick=()=>{modal('giftPrompt',false);makeInvite();showPage('invitePage')};
$('backToWelcome').onclick=()=>showPage('homePage');
$('skipGifts').onclick=()=>{makeInvite();showPage('invitePage')};
$('inviteHome').onclick=()=>showPage('homePage');
$('giftGrid').innerHTML=gifts.map((g,i)=>`<article class="gift"><div class="cover"><svg><use href="#${g.icon}"></use></svg></div><div class="gift-body"><h3>${g.name}</h3><span class="price">${i===7?'Any amount':money(g.price)}</span><p>${g.desc}</p><button class="btn primary" data-gift="${i}">Choose gift</button></div></article>`).join('');
$('giftGrid').onclick=e=>{const b=e.target.closest('[data-gift]');if(!b)return;selected=gifts[Number(b.dataset.gift)];$('selectedGift').textContent=`${selected.name} · Suggested: ${money(Math.round(selected.price/2))}. You can change the amount.`;$('amount').value=Math.max(100,Math.round(selected.price/2));$('contributor').value=guest?.name||'';modal('contributeModal')};
$('cancelGift').onclick=()=>modal('contributeModal',false);
$('pledge').onclick=async()=>{
 const amount=Number($('amount').value);if(!Number.isInteger(amount)||amount<100){toast('Enter at least KSh 100');return}
 if(!config.mpesaEnabled){toast('M-Pesa is not configured yet; no payment request was sent.');return}
 if(!rsvpId){toast('Please RSVP first.');return}
 $('pledge').disabled=true;
 try{const p=await api('/api/payments/stk',{method:'POST',body:JSON.stringify({rsvpId,gift:selected.name,amount,phone:guest.phone})});payment={...p,gift:selected.name,amount};
 modal('contributeModal',false);$('paymentStatusText').textContent='Check your phone and enter your M-Pesa PIN. Waiting for confirmation…';modal('paymentModal');pollPayment(p.paymentId);
 }catch(err){toast(err.message)}finally{$('pledge').disabled=false}
};
async function pollPayment(id){let attempts=0;const update=async()=>{
 if(!payment||payment.paymentId!==id)return;
 try{const s=await api('/api/payments/'+encodeURIComponent(id)+'/status');
 if(s.status==='paid'){payment.status='paid';$('paymentStatusText').textContent='Payment confirmed. Thank you for supporting Baby Jabari!';$('paymentContinue').hidden=false;return}
 if(['failed','cancelled','initiation_failed','review'].includes(s.status)){$('paymentStatusText').textContent=s.status==='review'?'Payment requires administrator verification. Please do not repeat payment until checked.':'Payment '+s.status+'. No confirmed payment recorded.';$('paymentContinue').hidden=false;return}
 }catch(err){$('paymentStatusText').textContent='Checking payment status…'}
 if(++attempts<45)setTimeout(update,4000);else{$('paymentStatusText').textContent='Still awaiting M-Pesa confirmation. The family dashboard will update if payment is verified.';$('paymentContinue').hidden=false}
 };update();};
$('paymentContinue').onclick=()=>{modal('paymentModal',false);makeInvite();showPage('invitePage')};
function makeInvite(){const n=guest?.name||'Guest';$('inviteMessage').textContent=guest?.attending==='no'?`Dear ${n}, thank you for your kind wishes. We will miss you at the celebration.`:guest?.attending==='maybe'?`Dear ${n}, thank you for responding. We hope you can join us for Jabari's special day.`:`Dear ${n}, we are delighted to welcome you as we celebrate Baby Jabari!`;
 $('giftMessage').textContent=payment?.status==='paid'?`Thank you for your confirmed ${money(payment.amount)} contribution toward ${payment.gift}.`:'Your presence and warm wishes are the greatest blessings.';}
for(let i=0;i<13;i++){let b=document.createElement('span');b.className='bubble';b.style.setProperty('--x',Math.random()*100+'%');b.style.setProperty('--size',(22+Math.random()*70)+'px');b.style.setProperty('--duration',(12+Math.random()*17)+'s');b.style.setProperty('--delay',(-Math.random()*24)+'s');$('bubbles').appendChild(b)}
