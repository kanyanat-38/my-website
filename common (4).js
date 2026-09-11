/* ===== shared helpers: used by select.html / detail.html / package.html ===== */

/* ---- trip state <-> URL query string (no localStorage needed) ---- */
function isoDate(d){
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function defaultState(){
  return { destIds:new Set(['tokyo']), hotelId:'h1', transportId:'t1', rangeStart:null, rangeEnd:null,
    season:'all', currency:'THB', travelerCount:1, destView:'card' };
}
function encodeState(state){
  const payload={
    d:[...state.destIds], h:state.hotelId, t:state.transportId,
    rs: state.rangeStart ? isoDate(state.rangeStart) : null,
    re: state.rangeEnd ? isoDate(state.rangeEnd) : null,
    s: state.season, c: state.currency, n: state.travelerCount,
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}
function decodeState(code){
  if(!code) return null;
  try{
    const o=JSON.parse(decodeURIComponent(atob(code)));
    return {
      destIds:new Set(o.d && o.d.length ? o.d : ['tokyo']),
      hotelId:o.h||'h1', transportId:o.t||'t1',
      rangeStart:o.rs?new Date(o.rs+'T00:00:00'):null,
      rangeEnd:o.re?new Date(o.re+'T00:00:00'):null,
      season:o.s||'all', currency:o.c||'THB', travelerCount:o.n||1, destView:'card',
    };
  }catch(e){ return null; }
}
function getParam(name){
  return new URLSearchParams(location.search).get(name);
}
function loadStateFromURL(){
  return decodeState(getParam('t')) || defaultState();
}
function linkWithState(page, state){
  return page + '?t=' + encodeState(state);
}

/* ---- budget math (shared by select.html summary + detail.html budget box) ---- */
const JPY_PER_THB = 4.2; // อัตราแปลงโดยประมาณ ใช้เพื่อการวางแผนเบื้องต้นเท่านั้น
function formatMoney(amountTHB, currency){
  if(currency==='JPY'){
    return '¥'+Math.round(amountTHB*JPY_PER_THB).toLocaleString();
  }
  return '฿'+Math.round(amountTHB).toLocaleString();
}
function nights(state){
  if(state.rangeStart && state.rangeEnd) return Math.max(1,Math.round((state.rangeEnd-state.rangeStart)/86400000));
  return 5;
}
function computeBudget(state){
  const hotel=hotels.find(h=>h.id===state.hotelId);
  const transport=transports.find(t=>t.id===state.transportId);
  const destExtra=[...state.destIds].reduce((sum,id)=>sum+(destinations.find(d=>d.id===id)?.price||0),0);
  const n=nights(state);
  const hotelTotal=hotel.price*n;
  return { hotel, transport, destExtra, n, hotelTotal, total: hotelTotal+transport.price+destExtra };
}
function updatePerPerson(state){
  const b=computeBudget(state);
  const perPerson=Math.round(b.total/Math.max(1,state.travelerCount));
  const text = state.travelerCount>1 ? `หาร ${state.travelerCount} คน · คนละ ${formatMoney(perPerson, state.currency)}` : '';
  const l1=document.getElementById('perPersonLine1'); if(l1) l1.textContent=text;
  const l2=document.getElementById('perPersonLine2'); if(l2) l2.textContent=text;
}

/* ---- weather thermometer ---- */
const THERMO_MIN=-10, THERMO_MAX=30;
function thermoPct(t){ return Math.max(4, Math.min(100, Math.round((t-THERMO_MIN)/(THERMO_MAX-THERMO_MIN)*100))); }

/* ---- scroll reveal (generic, works on any page) ---- */
function runReveal(){
  const items=document.querySelectorAll('.reveal');
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  },{threshold:0.15});
  items.forEach((el,i)=>{ el.style.transitionDelay=(i*40)+'ms'; io.observe(el); });
}

/* ---- generic staggered pop-in animation ---- */
function popInStagger(selector, stepMs){
  document.querySelectorAll(selector).forEach((el,i)=>{
    el.classList.remove('pop-in');
    void el.offsetWidth;
    el.style.animationDelay=(i*(stepMs||55))+'ms';
    el.classList.add('pop-in');
  });
}

/* ---- date formatting ---- */
function fmtDate(d){ return d.getDate()+' '+monthNamesTh[d.getMonth()].slice(0,3); }

/* ---- packing checklist generator (shared logic, used on detail.html) ---- */
function buildPackingItems(chosenDestinations){
  const list = chosenDestinations.length ? chosenDestinations : destinations.slice(0,1);
  const items=new Set(['พาสปอร์ต และเอกสารการเดินทาง','อะแดปเตอร์ปลั๊กไฟ (Type A)','เพาเวอร์แบงค์สำรองไฟ','บัตร IC สำหรับรถไฟ/รถบัส (Suica/Pasmo)']);
  let hasCold=false, hasMild=false, hasSakura=false, hasSnow=false;
  list.forEach(d=>{
    const w=weatherInfo[d.id];
    if(w){ if(w.low<5) hasCold=true; if(w.high>=15) hasMild=true; }
    if((d.seasons||[]).includes('sakura')) hasSakura=true;
    if((d.seasons||[]).includes('snow')) hasSnow=true;
  });
  if(hasCold){ items.add('เสื้อโค้ทกันหนาวหนา'); items.add('ถุงมือและหมวกไหมพรม'); items.add('โลชั่นกันผิวแห้ง'); }
  if(hasMild){ items.add('เสื้อแจ็คเก็ตบางๆ ใส่ตอนเช้า-เย็น'); }
  if(hasSakura){ items.add('ร่มพับกันฝนใบไม้ผลิ'); }
  if(hasSnow){ items.add('รองเท้ากันลื่น/บูทกันหนาว'); items.add('แผ่นแปะกันหนาว (ไคโระ)'); }
  return [...items];
}
