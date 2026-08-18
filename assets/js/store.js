/* ============================================================
   A.R. ABI TRADERS — storefront logic
   ============================================================ */
const SHOP = {
  name:"A.R. ABI Traders",
  phone:"+919566561558", phone2:"+916381958057",
  wa:"919566561558",
  addr:"No.16-A, Angalamman Koil Street, Manjakuppam, Cuddalore – 607001",
  freeOver:500, deliveryFee:40,
};

const PAGE_SIZE = 60;
const S = { cart:{}, lang:"en", theme:"light", cat:"", q:"", sort:"pop", order:null, shown:PAGE_SIZE };
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const P  = window.PRODUCTS || [];

/* ---- safe storage ---- */
const store = {
  get(k,d){ try{ const v=localStorage.getItem("arabi_"+k); return v?JSON.parse(v):d; }catch{ return d; } },
  set(k,v){ try{ localStorage.setItem("arabi_"+k, JSON.stringify(v)); }catch{} },
};
const t = k => (I18N[S.lang][k] ?? I18N.en[k] ?? k);
const money = n => "₹"+Number(n).toLocaleString("en-IN",{minimumFractionDigits:(n%1?2:0),maximumFractionDigits:2});
const meta = c => CATMETA[c] || CATMETA["General Store"];
const catName = c => S.lang==="ta" ? meta(c).ta : c;
function catBg(c){ const [l,d]=meta(c).c.split(","); return S.theme==="dark"?d:l; }
const nameOf = p => S.lang==="ta" && p.ta ? p.ta : p.name;
const discount = p => p.mrp>p.price ? Math.round((1-p.price/p.mrp)*100) : 0;

/* weight/volume products (rice, oil, dal, spices...) can be bought in decimal quantities
   (0.5 kg, 0.25 L etc.); piece/pack products (Strip, Box, Bottle...) stay whole-number only */
const WEIGHT_UNIT_RE = /^\d+(\.\d+)?\s*(kg|g|l|ml)$/i;
const isWeighable = p => WEIGHT_UNIT_RE.test((p.unit||"").trim());
const qtyStep = p => isWeighable(p) ? 0.5 : 1;
const round2 = n => Math.round(n*100)/100;
const fmtQty = q => String(round2(q));

function desc(p){
  if(S.lang==="ta"){
    return `${p.ta||p.name} — ${catName(p.cat)} வகையைச் சேர்ந்த தரமான பொருள். அளவு: ${p.unit}. A.R. ஆபி ட்ரேடர்ஸில் நேர்மையான விலையில் கிடைக்கிறது.`;
  }
  return `${p.name} is a quality ${p.cat.toLowerCase()} product available at A.R. Abi Traders. Sold per ${p.unit.toLowerCase()} at honest, everyday pricing — fresh stock, ready for same-day delivery across Cuddalore.`;
}

/* deterministic "popularity" so featured lists stay stable */
const hash = id => { let h=0,s=""+id; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; };
const inStock = p => p.stock>0 && p.price>0;

/* ============================================================ PRODUCT OVERRIDES (live price/stock from admin) */
let productsUnsub=null;
function applyProductOverrides(map){
  P.forEach(p=>{
    const o=map[p.id]; if(!o) return;
    if(o.price!=null) p.price=o.price;
    if(o.mrp!=null) p.mrp=o.mrp;
    if(o.stock!=null) p.stock=o.stock;
    if(o.avail===false) p.stock=0;
    if(o.photo) p.photo=o.photo;
  });
}
function subscribeProductOverrides(){
  if(!(window.ARFire && window.ARFire.ready)) return;
  const {db,collection,onSnapshot}=window.ARFire;
  if(productsUnsub) productsUnsub();
  productsUnsub=onSnapshot(collection(db,"productOverrides"), snap=>{
    const map={}; snap.docs.forEach(d=>map[d.id]=d.data());
    applyProductOverrides(map);
    renderCategories(); renderRail(); renderFeatured(); renderAll(); refreshCount();
  }, err=>console.warn("[A.R. Abi] product overrides listener error:",err));
}

/* ============================================================ RENDER: product card */
window.PRODUCT_PHOTOS = window.PRODUCT_PHOTOS || new Set();  // add ids here when real photos exist
function productImg(p){
  if(p.photo) return `<img class="pimg" src="${p.photo}" alt="${p.name}" loading="lazy">`;
  if(window.PRODUCT_PHOTOS.has(p.id))
    return `<img class="pimg" src="assets/img/products/${p.id}.jpg" alt="${p.name}" loading="lazy">`;
  return window.artFor ? window.artFor(p.type) : "";
}
function tile(p, size){
  return `<div class="thumb" style="background:${catBg(p.cat)}" data-open="${p.id}">
      ${discount(p)?`<span class="badge">${discount(p)}% ${t('off')}</span>`:""}
      ${productImg(p)}
      ${p.stock<=0?`<span class="oos">${t('outStock')}</span>`:""}
    </div>`;
}
function qtySpan(p,q,extraAttrs=""){
  return isWeighable(p)
    ? `<span class="qty-val" data-qty-edit="${p.id}" title="${t('tapToEdit')}" ${extraAttrs}>${fmtQty(q)}<i>✎</i></span>`
    : `<span ${extraAttrs}>${fmtQty(q)}</span>`;
}
function cardCtrl(p){
  const q = S.cart[p.id]||0;
  if(p.stock<=0) return `<span class="add" style="opacity:.35;pointer-events:none">+</span>`;
  if(q>0) return `<div class="stepper" role="group">
      <button data-dec="${p.id}" aria-label="decrease">−</button>${qtySpan(p,q)}
      <button data-inc="${p.id}" aria-label="increase">+</button></div>`;
  return `<button class="add" data-add="${p.id}" aria-label="${t('addCart')}">+</button>`;
}
function productCard(p){
  return `<article class="card">
    ${tile(p)}
    <div class="body">
      <span class="cat">${catName(p.cat)}</span>
      <h3 data-open="${p.id}" style="cursor:pointer">${p.name}</h3>
      ${p.ta?`<span class="tam">${p.ta}</span>`:`<span class="tam"></span>`}
      <span class="unit">${p.unit}${p.pack?` · pack of ${p.pack}`:""}</span>
      <div class="foot">
        <span class="price"><span class="now">${money(p.price)}</span>${p.mrp>p.price?`<span class="was">${money(p.mrp)}</span>`:""}</span>
        ${cardCtrl(p)}
      </div>
    </div>
  </article>`;
}
function renderGrid(list, el){
  if(!list.length){ el.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div>
    <h3>${t('noResults')}</h3><p>${t('noResultsSub')}</p></div>`; wireDynamic(); return; }
  el.innerHTML = list.map(productCard).join("");
  wireDynamic();
}

/* ============================================================ RENDER: categories & rail */
function renderCategories(){
  const counts = {};
  P.forEach(p=>counts[p.cat]=(counts[p.cat]||0)+1);
  const order = Object.keys(CATMETA).filter(c=>counts[c]);
  $("#cats").innerHTML = order.map(c=>`
    <button class="catcard" data-cat="${c}" style="background:${catBg(c)}">
      <span class="cem">${meta(c).em}</span>
      <b>${catName(c)}</b><small>${counts[c]} ${t('items')}</small>
    </button>`).join("");
  wireDynamic();
}
function renderRail(){
  const counts = {};
  P.forEach(p=>counts[p.cat]=(counts[p.cat]||0)+1);
  const order = Object.keys(CATMETA).filter(c=>counts[c]);
  $("#rail").innerHTML = `<button class="chip ${S.cat===''?'on':''}" data-cat=""><span class="em">🏠</span>${t('all')}</button>`+
    order.map(c=>`<button class="chip ${S.cat===c?'on':''}" data-cat="${c}"><span class="em">${meta(c).em}</span>${catName(c)}</button>`).join("");
  wireDynamic();
}

/* ============================================================ RENDER: home sections */
function renderFeatured(){
  const offers = P.filter(p=>inStock(p)&&discount(p)>0).sort((a,b)=>discount(b)-discount(a)).slice(0,10);
  renderGrid(offers, $("#offers"));
  const pop = P.filter(inStock).sort((a,b)=>hash(b.id)-hash(a.id)).slice(0,10);
  renderGrid(pop, $("#popular"));
}

/* ============================================================ RENDER: all-products (filtered) */
function filtered(){
  let list = P.slice();
  if(S.cat) list = list.filter(p=>p.cat===S.cat);
  if(S.q){
    const q=S.q.toLowerCase();
    list = list.filter(p=>p.name.toLowerCase().includes(q)||(p.ta&&p.ta.includes(S.q))||p.cat.toLowerCase().includes(q));
  }
  const s=S.sort;
  if(s==="low") list.sort((a,b)=>a.price-b.price);
  else if(s==="high") list.sort((a,b)=>b.price-a.price);
  else if(s==="name") list.sort((a,b)=>a.name.localeCompare(b.name));
  else list.sort((a,b)=>(inStock(b)-inStock(a))||(hash(b.id)-hash(a.id)));
  return list;
}
function renderAll(){
  const list = filtered();
  const slice = list.slice(0, S.shown);
  $("#allcount").textContent = list.length>slice.length
    ? `${t('showing')} ${slice.length.toLocaleString('en-IN')} ${t('of')} ${list.length.toLocaleString('en-IN')} ${t('products').toLowerCase()}`
    : `${t('showing')} ${list.length.toLocaleString('en-IN')} ${t('products').toLowerCase()}`;
  const title = S.cat ? catName(S.cat) : (S.q ? `"${S.q}"` : t('all'));
  $("#allTitle").textContent = title;
  renderGrid(slice, $("#all"));
  const more=$("#loadMore");
  if(more) more.style.display = list.length>slice.length ? "flex" : "none";
}

/* ============================================================ CART */
function cartArr(){ return Object.entries(S.cart).map(([id,q])=>({p:P.find(x=>x.id==id),q})).filter(x=>x.p); }
function subtotal(){ return cartArr().reduce((s,{p,q})=>s+p.price*q,0); }
function cartQty(){ return Object.values(S.cart).reduce((a,b)=>a+b,0); }
function deliveryFee(){ const s=subtotal(); return s>0 && s<SHOP.freeOver ? SHOP.deliveryFee : 0; }
function saveCart(){ store.set("cart",S.cart); refreshCount(); }
function refreshCount(){ const n=cartQty(); const b=$("#cartCount"); b.textContent=n; b.style.display=n?"grid":"none"; }

function addToCart(id){ const p=P.find(x=>x.id==id); if(!p||p.stock<=0) return;
  S.cart[id]=Math.min(round2((S.cart[id]||0)+qtyStep(p)), p.stock); saveCart(); syncControls(id); renderCart();
  toast(`${t('added')} ✓`,"🛒"); }
function incCart(id){ const p=P.find(x=>x.id==id); if(!p) return;
  S.cart[id]=Math.min(round2((S.cart[id]||0)+qtyStep(p)),p.stock); saveCart(); syncControls(id); renderCart(); }
function decCart(id){ const p=P.find(x=>x.id==id); if(!p) return;
  S.cart[id]=round2((S.cart[id]||0)-qtyStep(p)); if(S.cart[id]<=0) delete S.cart[id]; saveCart(); syncControls(id); renderCart(); }
function removeCart(id){ delete S.cart[id]; saveCart(); syncControls(id); renderCart(); }
/* direct decimal entry — tap the qty number (weighable products only) */
function setCartQty(id, qty){
  const p=P.find(x=>x.id==id); if(!p) return;
  qty=round2(qty);
  if(!(qty>0)){ removeCart(id); return; }
  S.cart[id]=Math.min(qty,p.stock); saveCart(); syncControls(id); renderCart();
}

/* update just the affected card controls (cheap) without full re-render */
function syncControls(id){
  ["#offers","#popular","#all"].forEach(sel=>{
    const grid=$(sel); if(!grid) return;
    $$(".card",grid).forEach(card=>{
      const open=$("[data-open]",card); if(!open) return;
      const pid=open.dataset.open; if(pid!=id) return;
      const p=P.find(x=>x.id==pid); const foot=$(".foot",card);
      if(foot) foot.querySelector(".add,.stepper").outerHTML=cardCtrl(p);
    });
  });
  wireDynamic();
  // modal control
  const mc=$("#modalCtrl"); if(mc && mc.dataset.pid==id) renderModalCtrl(P.find(x=>x.id==id));
}

function renderCart(){
  const arr=cartArr(), box=$("#ditems");
  if(!arr.length){ box.innerHTML=`<div class="empty"><div class="big">🧺</div><h3>${t('emptyCart')}</h3>
    <p>${t('emptyCartSub')}</p><button class="btn btn-primary" data-close-cart style="margin-top:16px">${t('startShop')}</button></div>`;
    $("#dfoot").style.display="none"; wireDynamic(); return; }
  $("#dfoot").style.display="block";
  box.innerHTML=arr.map(({p,q})=>`<div class="crow">
    <div class="cim" style="background:${catBg(p.cat)}">${productImg(p)}</div>
    <div class="cmeta"><b>${p.name}</b>${p.ta?`<span class="tam">${p.ta}</span>`:""}
      <span class="p">${money(p.price)} × ${fmtQty(q)} = <b style="color:var(--ink)">${money(p.price*q)}</b></span></div>
    <div class="cright">
      <button class="rm" data-rm="${p.id}">${t('remove')}</button>
      <div class="mini"><button data-dec="${p.id}">−</button>${qtySpan(p,q)}<button data-inc="${p.id}">+</button></div>
    </div></div>`).join("");
  const s=subtotal(), d=deliveryFee();
  $("#dfoot").innerHTML=`
    <div class="drow"><span>${t('subtotal')}</span><span>${money(s)}</span></div>
    <div class="drow"><span>${t('deliveryFee')}</span><span>${d?money(d):`<b style="color:var(--ok)">${t('free')}</b>`}</span></div>
    <div class="drow total"><span>${t('total')}</span><span>${money(s+d)}</span></div>
    <button class="btn btn-primary" style="width:100%;justify-content:center" data-checkout>${t('checkout')} →</button>`;
  wireDynamic();
}
function openCart(){ $("#scrim").classList.add("show"); $("#drawer").classList.add("show"); renderCart(); document.body.style.overflow="hidden"; }
function closeCart(){ $("#scrim").classList.remove("show"); $("#drawer").classList.remove("show"); document.body.style.overflow=""; }

/* ============================================================ PRODUCT MODAL */
function renderModalCtrl(p){
  const box=$("#modalCtrl"); box.dataset.pid=p.id; const q=S.cart[p.id]||0;
  if(p.stock<=0){ box.innerHTML=`<button class="btn btn-primary" disabled style="opacity:.4;width:100%;justify-content:center">${t('outStock')}</button>`; return; }
  if(q>0){ box.innerHTML=`<div class="stepper" style="height:48px"><button data-dec="${p.id}" style="width:52px">−</button>
    ${qtySpan(p,q,'style="min-width:40px;font-size:16px"')}<button data-inc="${p.id}" style="width:52px">+</button></div>
    <button class="btn btn-ghost" data-close-modal>${t('keepShopping')}</button>`; }
  else box.innerHTML=`<button class="btn btn-primary" data-add="${p.id}" style="flex:1;justify-content:center">${t('addCart')} +</button>`;
  wireDynamic();
}
function openProduct(id){
  const p=P.find(x=>x.id==id); if(!p) return;
  const off=discount(p);
  $("#modalBody").innerHTML=`
    <div class="mgrid">
      <div class="mim" style="background:${catBg(p.cat)}">${productImg(p)}</div>
      <div class="mbody">
        <span class="cat">${catName(p.cat)}</span>
        <h2>${p.name}</h2>
        ${p.ta?`<div class="tam">${p.ta}</div>`:""}
        <div class="mprice"><span class="now">${money(p.price)}</span>
          ${p.mrp>p.price?`<span class="was">${money(p.mrp)}</span><span class="off">${off}% ${t('off')}</span>`:""}</div>
        <div class="metarow">
          <div><b>${p.unit}</b><span>${t('unit')}</span></div>
          <div><b class="${p.stock>0?'stock-ok':'stock-no'}">${p.stock>0?`${t('inStock')}`:t('outStock')}</b><span>${p.stock>0?`${p.stock} ${t('left')}`:'—'}</span></div>
        </div>
        <p class="desc">${desc(p)}</p>
        <div id="modalCtrl" style="display:flex;gap:10px;margin-top:8px"></div>
      </div>
    </div>`;
  renderModalCtrl(p);
  $("#modal").classList.add("show"); document.body.style.overflow="hidden";
}
function closeModal(){ $("#modal").classList.remove("show"); if(!$("#drawer").classList.contains("show")) document.body.style.overflow=""; }

/* ============================================================ VIEWS: checkout / confirm */
function show(view){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $("#view-"+view).classList.add("active");
  $("#catrail").style.display = view==="shop" ? "block" : "none";
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderCheckout(){
  const arr=cartArr(); if(!arr.length){ show("shop"); return; }
  const s=subtotal(), d=deliveryFee();
  $("#coSummary").innerHTML=`<h3>${t('orderSummary')}</h3>
    <div style="max-height:230px;overflow-y:auto;margin-bottom:12px">
    ${arr.map(({p,q})=>`<div class="drow" style="align-items:center">
      <span>${meta(p.cat).em} ${p.name} <b style="color:var(--ink)">×${fmtQty(q)}</b></span>
      <span style="color:var(--ink);font-weight:600">${money(p.price*q)}</span></div>`).join("")}</div>
    <div class="drow"><span>${t('subtotal')}</span><span>${money(s)}</span></div>
    <div class="drow"><span>${t('deliveryFee')}</span><span>${d?money(d):`<b style="color:var(--ok)">${t('free')}</b>`}</span></div>
    <div class="drow total"><span>${t('total')}</span><span>${money(s+d)}</span></div>`;
  show("checkout");
}
function validCheckout(){
  let ok=true;
  const nm=$("#f-name"), mb=$("#f-mobile"), ad=$("#f-address");
  const set=(el,bad)=>{ el.closest(".field").classList.toggle("bad",bad); if(bad)ok=false; };
  set(nm, !nm.value.trim());
  set(mb, !/^[6-9]\d{9}$/.test(mb.value.trim().replace(/\s/g,"")));
  set(ad, !ad.value.trim());
  return ok;
}
async function placeOrder(){
  if(!validCheckout()) return;
  const arr=cartArr(), s=subtotal(), d=deliveryFee();
  const num = "AB"+Date.now().toString().slice(-6);
  const order = {
    num, at:Date.now(), status:"received",
    name:$("#f-name").value.trim(), mobile:$("#f-mobile").value.trim(),
    address:$("#f-address").value.trim(), notes:$("#f-notes").value.trim(),
    pay:S.pay||"cod", items:arr.map(({p,q})=>({name:p.name,ta:p.ta,q,price:p.price,line:p.price*q})),
    subtotal:s, delivery:d, total:s+d,
  };
  S.order=order;
  const orders=store.get("orders",[]); orders.unshift(order); store.set("orders",orders);
  S.cart={}; saveCart();
  renderConfirm(order);
  if(window.ARFire && window.ARFire.ready){
    try{
      const {db,doc,setDoc,serverTimestamp}=window.ARFire;
      await setDoc(doc(db,"orders",num), {...order, createdAt:serverTimestamp()});
    }catch(err){ console.warn("[A.R. Abi] could not sync order to Firestore:",err); }
  }
}
function waMessage(o){
  let m=`*New Order ${o.num}* — A.R. Abi Traders\n\n`;
  m+=`*Name:* ${o.name}\n*Mobile:* ${o.mobile}\n*Address:* ${o.address}\n`;
  if(o.notes) m+=`*Note:* ${o.notes}\n`;
  m+=`*Payment:* ${o.pay==="upi"?"UPI":"Cash on Delivery"}\n\n*Items:*\n`;
  o.items.forEach(i=>{ m+=`• ${i.name} ×${fmtQty(i.q)} — ₹${i.line}\n`; });
  m+=`\n*Subtotal:* ₹${o.subtotal}\n*Delivery:* ${o.delivery?"₹"+o.delivery:"FREE"}\n*Total:* ₹${o.total}`;
  return encodeURIComponent(m);
}
const STATUS_ORDER=["received","confirmed","preparing","out","delivered"];
function trackerHTML(o){
  if(o.status==="cancelled"){
    return `<div class="tick" style="background:color-mix(in srgb,var(--kumkum) 16%,transparent)">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="var(--kumkum)" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </div>
      <h2 style="font-size:24px">${t('st_cancelled')}</h2>
      <p style="color:var(--muted);max-width:42ch;margin:8px auto 0">${t('st_cancelled_s')}</p>`;
  }
  const idx=Math.max(0,STATUS_ORDER.indexOf(o.status||"received"));
  const live = window.ARFire && window.ARFire.ready;
  return `<div class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
    <h2 style="font-size:24px">${t('st_'+(o.status||"received"))}</h2>
    <p style="color:var(--muted);font-size:12.5px;margin-top:4px">
      ${live?`<span style="color:var(--ok)">●</span> ${t('liveNote')}`:t('offlineNote')}</p>
    <div class="steps">${STATUS_ORDER.map((k,i)=>`
      <div class="step ${i<idx?'done':i===idx?'done cur':'pending'}">
        <div class="dot">${i<=idx?'✓':i+1}</div>
        <div><b>${t('st_'+k)}</b><small>${t('st_'+k+'_s')}</small></div>
      </div>`).join("")}</div>`;
}
function stopTracking(){ if(S.unsub){ S.unsub(); S.unsub=null; } }
function renderConfirm(o){
  stopTracking();
  $("#confirm").innerHTML=`<div class="track">
    <p style="color:var(--muted);margin:0 0 2px">${t('orderThanks')}, <b style="color:var(--ink)">${o.name}</b> 🙏</p>
    <p style="color:var(--muted);font-size:13px;margin-bottom:14px">${t('orderNum')} <b style="color:var(--green)">#${o.num}</b></p>
    <div id="trackBody"></div>
    <p style="color:var(--muted);max-width:42ch;margin:14px auto 0">${t('orderMsg')}</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">
      <a class="btn btn-primary" href="https://wa.me/${SHOP.wa}?text=${waMessage(o)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1s-.5-.2-.7.1-.8 1-.9 1.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5v-.5L8.9 6.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3A3 3 0 0 0 6 9.1c0 1.3.9 2.6 1.1 2.8a10.7 10.7 0 0 0 4.1 3.6c2 .8 2 .6 2.4.5a2.6 2.6 0 0 0 1.7-1.2c.2-.5.2-.9.1-1zM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2z"/></svg>
        ${t('waOrder')}</a>
      <button class="btn btn-ghost" data-home>${t('keepShopping')}</button>
    </div>
  </div>`;
  $("#trackBody").innerHTML=trackerHTML(o);
  show("confirm"); wireDynamic();
  if(window.ARFire && window.ARFire.ready){
    const {db,doc,onSnapshot}=window.ARFire;
    S.unsub=onSnapshot(doc(db,"orders",o.num),snap=>{
      if(!snap.exists()) return;
      const fresh=snap.data(); S.order={...S.order,...fresh};
      const body=$("#trackBody"); if(body) body.innerHTML=trackerHTML(S.order);
    },err=>console.warn("[A.R. Abi] tracker listener error:",err));
  }
}

/* ============================================================ TRACK MY ORDER (returning / other device) */
function renderTrack(){
  $("#view-track .wrap").innerHTML = trackFormHTML();
  wireTrackForm();
}
function trackFormHTML(){
  return `<button class="btn btn-ghost" id="tkBack" style="margin-bottom:20px">← <span>${t('back')}</span></button>
    <h2 style="font-size:26px;margin-bottom:6px">${t('trackTitle')}</h2>
    <p style="color:var(--muted);margin-bottom:20px;max-width:48ch">${t('trackDesc')}</p>
    <div style="max-width:380px">
      <div class="field"><label>${t('orderNum')}</label><input id="tk-num" type="text" placeholder="AB123456" autocomplete="off"></div>
      <div class="field"><label>${t('mobile')}</label><input id="tk-mobile" type="tel" inputmode="numeric" maxlength="10" placeholder="9876543210"></div>
      <button class="btn btn-primary" id="tk-go" style="width:100%;justify-content:center">${t('trackBtn')}</button>
      <p class="err" id="tk-err" style="display:none;margin-top:10px"></p>
    </div>
    <div id="tk-result" style="margin-top:24px"></div>`;
}
function wireTrackForm(){
  $("#tkBack").onclick=()=>{ stopTracking(); show("shop"); };
  $("#tk-go").onclick=doTrackLookup;
  [$("#tk-num"),$("#tk-mobile")].forEach(el=>el.addEventListener("keydown",e=>{ if(e.key==="Enter") doTrackLookup(); }));
}
function tkError(msg){ const e=$("#tk-err"); e.textContent=msg; e.style.display="block"; $("#tk-result").innerHTML=""; }
async function doTrackLookup(){
  const num=$("#tk-num").value.trim().toUpperCase();
  const mobile=$("#tk-mobile").value.trim();
  $("#tk-err").style.display="none";
  if(!num){ tkError(t('trackErrNum')); return; }
  if(!/^[6-9]\d{9}$/.test(mobile)){ tkError(t('mobileErr')); return; }
  stopTracking();
  $("#tk-go").disabled=true; $("#tk-go").textContent=t('trackBtn')+"…";
  try{
    let found=null;
    if(window.ARFire && window.ARFire.ready){
      const {db,doc,getDoc}=window.ARFire;
      const snap=await getDoc(doc(db,"orders",num));
      if(snap.exists()) found=snap.data();
    }
    if(!found){
      found=(store.get("orders",[])).find(o=>o.num===num);
    }
    if(!found){ tkError(t('trackNotFound')); return; }
    if(String(found.mobile).replace(/\s/g,"")!==mobile){ tkError(t('trackMismatch')); return; }
    $("#tk-result").innerHTML=`<div class="track" style="padding-top:4px">
      <p style="color:var(--muted);font-size:13px">${t('orderNum')} <b style="color:var(--green)">#${found.num}</b></p>
      <div id="trackBody"></div></div>`;
    $("#trackBody").innerHTML=trackerHTML(found);
    if(window.ARFire && window.ARFire.ready){
      const {db,doc,onSnapshot}=window.ARFire;
      S.unsub=onSnapshot(doc(db,"orders",num),snap=>{
        if(!snap.exists()) return;
        const fresh=snap.data(); const body=$("#trackBody"); if(body) body.innerHTML=trackerHTML(fresh);
      },err=>console.warn("[A.R. Abi] tracker listener error:",err));
    }
  }finally{
    $("#tk-go").disabled=false; $("#tk-go").textContent=t('trackBtn');
  }
}
function openTrack(){ show("track"); renderTrack(); }

/* ============================================================ VOICE SEARCH (mic) */
let voiceRec=null;
function initVoiceSearch(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = $("#micBtn");
  if(!SR || !micBtn) return; // unsupported browser — button stays hidden (no .has-mic class added)
  $(".search").classList.add("has-mic");
  voiceRec = new SR();
  voiceRec.continuous = false;
  voiceRec.interimResults = false;
  voiceRec.maxAlternatives = 1;
  let listening = false;
  micBtn.onclick = () => {
    if(listening){ voiceRec.stop(); return; }
    voiceRec.lang = S.lang==="ta" ? "ta-IN" : "en-IN";
    try{ voiceRec.start(); }catch{ /* already starting */ }
  };
  voiceRec.onstart = () => { listening=true; micBtn.classList.add("listening"); };
  voiceRec.onend = () => { listening=false; micBtn.classList.remove("listening"); };
  voiceRec.onerror = e => {
    listening=false; micBtn.classList.remove("listening");
    if(e.error==="no-speech") toast(t('micNoSpeech'),"🎤");
    else if(e.error==="not-allowed" || e.error==="service-not-allowed") toast(t('micDenied'),"🎤");
  };
  voiceRec.onresult = e => {
    const text = e.results[0][0].transcript.trim();
    if(!text) return;
    $("#searchInput").value = text;
    S.q = text; S.cat = ""; S.shown = PAGE_SIZE;
    renderRail(); renderAll();
    $("#allSection").scrollIntoView({behavior:"smooth"});
    toast(`${t('micHeard')} "${text}"`,"🎤");
  };
}

/* ============================================================ TOAST */
let toastT;
function toast(msg,em="✓"){ const el=$("#toast"); el.innerHTML=`<span class="em">${em}</span>${msg}`;
  el.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("show"),1800); }

/* ============================================================ LANG / THEME */
function applyStaticText(){
  document.documentElement.lang = S.lang;
  const set=(id,key)=>{ const e=$(id); if(e) e.textContent=t(key); };
  $("#brandTag").textContent=t('tagline');
  $("#tick1").innerHTML=t('ticker1'); $("#tick2").textContent=t('ticker2');
  $("#searchInput").placeholder=t('search');
  const mic=$("#micBtn"); if(mic){ mic.setAttribute("aria-label",t('micLabel')); mic.title=t('micLabel'); }
  set("#heroEyebrow","heroEyebrow"); $("#heroTitle").innerHTML=`${t('heroTitle')} <em>${t('heroTitleEm')}</em>`;
  set("#heroLede","heroLede"); set("#btnShop","shopNow"); set("#btnCall","callUs");
  set("#hwT1","hwT1"); set("#hwS1","hwS1"); set("#hwT2","hwT2"); set("#hwS2","hwS2"); set("#hwT3","hwT3"); set("#hwS3","hwS3");
  set("#trustProducts","products"); set("#trustBrands","brands"); set("#trustDelivery","delivery");
  set("#hCats","categories"); set("#hCatsSub","categories");
  set("#hOffers","offers"); set("#hPopular","popular");
  set("#moreOffers","viewall"); set("#morePopular","viewall");
  set("#btnLoadMore","loadMore");
  set("#drawerTitle","cart");
  set("#coTitle","checkoutTitle"); set("#coDetails","yourDetails"); set("#coPayTitle","payment");
  $("#lbl-name").textContent=t('name'); $("#lbl-mobile").textContent=t('mobile');
  $("#lbl-address").textContent=t('address'); $("#lbl-notes").textContent=t('instructions');
  $("#err-name").textContent=t('nameErr'); $("#err-mobile").textContent=t('mobileErr'); $("#err-address").textContent=t('addrErr');
  $("#pay-cod-t").textContent=t('cod'); $("#pay-cod-s").textContent=t('codSub');
  $("#pay-upi-t").textContent=t('upi'); $("#pay-upi-s").textContent=t('upiSub');
  set("#btnPlace","placeOrder");
  $("#sortSel").innerHTML=`<option value="pop">${t('sortPop')}</option><option value="low">${t('sortLow')}</option>
    <option value="high">${t('sortHigh')}</option><option value="name">${t('sortName')}</option>`;
  $("#sortSel").value=S.sort;
  set("#waFloatLbl","waSupport");
  // footer
  $("#footAbout").textContent=t('footAbout'); set("#fLinks","quickLinks"); set("#fContact","contact");
  $("#fHours").textContent=t('hours');
  set("#hFaq","faqTitle");
  [1,2,3,4,5].forEach(n=>{ set(`#faqQ${n}`,`faqQ${n}`); set(`#faqA${n}`,`faqA${n}`); });
  $$(".lang-toggle button").forEach(b=>b.classList.toggle("on",b.dataset.lang===S.lang));
}
function setLang(l){ S.lang=l; store.set("lang",l); applyStaticText(); renderCategories(); renderRail(); renderFeatured(); renderAll(); }
function setTheme(th){ S.theme=th; store.set("theme",th); document.documentElement.setAttribute("data-theme",th);
  $("#themeIcon").textContent = th==="dark"?"☀️":"🌙";
  renderCategories(); renderRail(); renderFeatured(); renderAll(); }

/* tap the qty number on a weighable product to type an exact amount (0.5, 0.75...) */
function startQtyEdit(el){
  const id=el.dataset.qtyEdit; const cur=S.cart[id]||0;
  const input=document.createElement("input");
  input.type="number"; input.inputMode="decimal"; input.step="0.25"; input.min="0.25";
  input.value=cur; input.className="qty-input";
  if(el.getAttribute("style")) input.setAttribute("style",el.getAttribute("style"));
  el.replaceWith(input); input.focus(); input.select();
  let cancelled=false;
  input.addEventListener("keydown",e=>{
    e.stopPropagation();
    if(e.key==="Enter"){ e.preventDefault(); input.blur(); }
    else if(e.key==="Escape"){ cancelled=true; input.blur(); }
  });
  input.addEventListener("blur",()=>{
    if(cancelled){ syncControls(id); renderCart(); return; }
    const v=parseFloat(input.value);
    setCartQty(id, isNaN(v)?cur:v);
  });
}

/* ============================================================ EVENT WIRING */
function wireDynamic(){
  $$("[data-add]").forEach(b=>b.onclick=e=>{e.stopPropagation();addToCart(b.dataset.add);});
  $$("[data-inc]").forEach(b=>b.onclick=e=>{e.stopPropagation();incCart(b.dataset.inc);});
  $$("[data-dec]").forEach(b=>b.onclick=e=>{e.stopPropagation();decCart(b.dataset.dec);});
  $$("[data-rm]").forEach(b=>b.onclick=e=>{e.stopPropagation();removeCart(b.dataset.rm);});
  $$("[data-qty-edit]").forEach(el=>el.onclick=e=>{e.stopPropagation();startQtyEdit(el);});
  $$("[data-open]").forEach(b=>b.onclick=()=>openProduct(b.dataset.open));
  $$("[data-checkout]").forEach(b=>b.onclick=()=>{closeCart();renderCheckout();});
  $$("[data-close-cart]").forEach(b=>b.onclick=closeCart);
  $$("[data-close-modal]").forEach(b=>b.onclick=closeModal);
  $$("[data-home]").forEach(b=>b.onclick=()=>{ stopTracking(); show("shop"); });
  $$("[data-cat]").forEach(b=>b.onclick=()=>{ S.cat=b.dataset.cat; S.q=""; S.shown=PAGE_SIZE; $("#searchInput").value="";
    renderRail(); renderAll(); show("shop"); $("#allSection").scrollIntoView({behavior:"smooth"}); });
  const loadMoreBtn=$("#btnLoadMore");
  if(loadMoreBtn) loadMoreBtn.onclick=()=>{ S.shown+=PAGE_SIZE; renderAll(); };
}
function init(){
  // restore state
  S.cart=store.get("cart",{}); S.lang=store.get("lang","en"); S.theme=store.get("theme","light");
  document.documentElement.setAttribute("data-theme",S.theme);
  $("#themeIcon").textContent=S.theme==="dark"?"☀️":"🌙";
  // header trust numbers
  $("#trustProductsN").textContent = P.length.toLocaleString("en-IN")+"+";
  applyStaticText();
  renderCategories(); renderRail(); renderFeatured(); renderAll(); refreshCount();
  // Firebase loads async so it never blocks the initial render — attach live
  // price/stock sync as soon as it's ready, whether that's now or a moment later.
  if(window.ARFire) subscribeProductOverrides();
  else window.addEventListener("arfire-ready", subscribeProductOverrides, {once:true});

  // search (debounced)
  let dq; $("#searchInput").addEventListener("input",e=>{ clearTimeout(dq);
    dq=setTimeout(()=>{ S.q=e.target.value.trim(); S.cat=""; S.shown=PAGE_SIZE; renderRail(); renderAll();
      if(S.q) $("#allSection").scrollIntoView({behavior:"smooth"}); },220); });
  $("#sortSel").addEventListener("change",e=>{ S.sort=e.target.value; S.shown=PAGE_SIZE; renderAll(); });
  initVoiceSearch();

  // header buttons
  $("#cartBtn").onclick=openCart;
  $("#themeBtn").onclick=()=>setTheme(S.theme==="dark"?"light":"dark");
  $$(".lang-toggle button").forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
  $("#scrim").onclick=closeCart;
  $("#modal").addEventListener("click",e=>{ if(e.target===$("#modal")) closeModal(); });
  $("#btnShop").onclick=()=>$("#allSection").scrollIntoView({behavior:"smooth"});
  $$("[data-track]").forEach(b=>b.onclick=e=>{ e.preventDefault(); openTrack(); });

  // payment select
  $$(".pay").forEach(p=>p.onclick=()=>{ S.pay=p.dataset.pay; $$(".pay").forEach(x=>x.classList.remove("on")); p.classList.add("on"); });
  S.pay="cod"; $('.pay[data-pay="cod"]').classList.add("on");
  $("#btnPlace").onclick=placeOrder;
  $("#coBack").onclick=()=>show("shop");
  // live-clear field errors
  ["f-name","f-mobile","f-address"].forEach(id=>$("#"+id).addEventListener("input",()=>$("#"+id).closest(".field").classList.remove("bad")));

  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeCart(); closeModal(); } });
  wireDynamic();
}
document.addEventListener("DOMContentLoaded",init);
