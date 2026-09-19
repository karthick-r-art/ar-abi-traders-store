/* ============================================================
   A.R. ABI TRADERS — storefront logic
   ============================================================ */
const SHOP = {
  name:"A.R. ABI Traders",
  phone:"+919566561558", phone2:"+916381958057",
  wa:"919566561558",
  addr:"No.54/41C, Angalamman Koil Street, Manjakuppam, Cuddalore – 607001",
  freeOver:500, deliveryFee:40,
};

const PAGE_SIZE = 24;
const S = { cart:{}, lang:"en", theme:"light", cat:"", q:"", sort:"pop", order:null, shown:PAGE_SIZE, inStockOnly:false, onOffer:false, pdq:0 };
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

/* Loose items sold by the kilo (ledger names like "BADAM KG", "JEERAGAM KG" — "KG" with no pack
   size in front) can be bought in half-kilo steps (0.5, 1.5 …). Everything else is a sealed pack,
   bottle or piece — "TIDE 1KG", "COKE 1L" — and is sold in whole numbers only. */
const LOOSE_RE = /(^|[^\d])KG\b/i, PACKSIZE_KG_RE = /\d\s*KG\b/i;
const isWeighable = p => LOOSE_RE.test(p.name||"") && !PACKSIZE_KG_RE.test(p.name||"");
const qtyStep = p => isWeighable(p) ? 0.5 : 1;
const round2 = n => Math.round(n*100)/100;
const fmtQty = q => String(round2(q));

function desc(p){
  if(S.lang==="ta"){
    return `${p.ta||p.name} — ${catName(p.cat)} வகையைச் சேர்ந்த தரமான பொருள். அளவு: ${unitOf(p)}. ஏ.ஆர். அபி டிரேடர்ஸில் நேர்மையான விலையில் கிடைக்கிறது.`;
  }
  return `${prettyName(p.name)} is a quality ${p.cat.toLowerCase()} product available at A.R. Abi Traders. Sold per ${p.unit.toLowerCase()} at honest, everyday pricing — fresh stock, ready for same-day delivery across Cuddalore.`;
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


/* ============================================================ DISPLAY HELPERS */
/* Product names in the data are shop-ledger style ("AACHI SAMBAR 10RS [20]"). For display we
   turn them into readable titles ("Aachi Sambar ₹10 (20)") — the raw name is still what's
   searched, saved on orders, sent on WhatsApp and shown in admin, so nothing downstream changes. */
const KEEP_UPPER = new Set(["AVT","LED","ATM","OK","AA","AAA","IFF","A4","SVS","TRC","VVD","SF","DS","CRM","XL","XXL","XXXL","UB","TV","MRP","A2B","7UP","ORS","N.S","R.S","SMS","USB","MDH","GRB","KPL","OB","B","G","K","M","W","R","S"]);
function prettyName(n){
  if(!n) return "";
  let s=String(n).replace(/\[/g,"(").replace(/\]/g,")").replace(/\s{2,}/g," ").trim();
  s=s.replace(/\bRS\.?\s*(\d+(?:\.\d+)?)/gi,"₹$1").replace(/(\d+(?:\.\d+)?)\s*RS\b/gi,"₹$1");
  s=s.replace(/(\d)\s*(GRAMS?|GRM|GM)\b/gi,"$1g").replace(/(\d)\s*(LTR|LITRE|LITER|LIT)\b/gi,"$1L")
       .replace(/\bLTR\b/gi,"L").replace(/(\S)\(/g,"$1 (");
  const UNIT={KG:"kg",ML:"ml",PCS:"pcs",PKT:"Pkt",LTR:"L"}, SHORT={G:"g",L:"L",GM:"g"};
  const ws=s.split(" ");
  return ws.map((w,i)=>{
    const U=w.toUpperCase();
    if(UNIT[U]) return UNIT[U];
    if(SHORT[U] && i>0 && /\d$/.test(ws[i-1])) return SHORT[U];
    const bare=w.replace(/[()]/g,"");
    if(KEEP_UPPER.has(bare.toUpperCase()) || (/^[A-Z]{2,4}$/.test(bare) && !/[AEIOU]/.test(bare))) return w.toUpperCase();
    if(/^\(?\d/.test(w)){ // numbers with units: 500G -> 500g, 1LTR -> 1L, 3ROSES -> 3Roses
      return w.toLowerCase().replace(/(\d)(ltr|l)\b/,"$1L").replace(/(\d)([a-z]{3,})/,(m,d,r)=>d+r[0].toUpperCase()+r.slice(1));
    }
    return w.toLowerCase().replace(/(^|[(\-&\/.])([a-z])/g,(m,a,b)=>a+b.toUpperCase());
  }).join(" ");
}
const UNIT_TA={Bundle:"கட்டு",Strip:"சரம்",Case:"கேஸ்",Piece:"எண்",Box:"பெட்டி",Bag:"பை",Jar:"ஜாடி",Packet:"பாக்கெட்",Bottle:"பாட்டில்",Cup:"கப்",Pouch:"பவுச்"};
function unitOf(p){
  if(isWeighable(p)) return S.lang==="ta" ? "1 கிலோ" : "per kg";
  const u=String(p.unit||"").trim(); if(S.lang!=="ta") return u;
  if(UNIT_TA[u]) return UNIT_TA[u];
  const m=u.match(/^(\d+(?:\.\d+)?)\s*(unit|pc|kg|g|ml|L)$/i);
  if(!m) return u;
  const k=m[2].toLowerCase(); const map={unit:"எண்",pc:"எண்",kg:"கிலோ",g:"கிராம்",ml:"மி.லி",l:"லிட்டர்"};
  return `${m[1]} ${map[k]}`;
}
const titleOf = p => (S.lang==="ta" && p.ta) ? p.ta : prettyName(p.name);
const subOf   = p => (S.lang==="ta" && p.ta) ? prettyName(p.name) : (p.ta||"");
const CART_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.3"/><circle cx="19" cy="21" r="1.3"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>`;
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tpl = (k,vars) => t(k).replace(/\{(\w+)\}/g,(m,v)=>vars[v]??"");
/* category display order: staples first, the way a customer walks a grocery shop */
const CAT_ORDER = ["Rice & Atta","Dal & Pulses","Oils","Masala & Spices","Snacks & Biscuits","Beverages","Dairy & Ghee",
  "Home Care","Personal Care","General Store","Chocolates & Candy","Baby Care","Stationery & General","Tobacco & Pan"];
let CAT_COUNTS={};
function countCats(){ CAT_COUNTS={}; P.forEach(p=>CAT_COUNTS[p.cat]=(CAT_COUNTS[p.cat]||0)+1); }
function catsInOrder(){
  const known=CAT_ORDER.filter(c=>CAT_COUNTS[c]);
  const extra=Object.keys(CAT_COUNTS).filter(c=>!known.includes(c) && CATMETA[c]);
  return known.concat(extra);
}

/* ============================================================ RENDER: product card */
window.PRODUCT_PHOTOS = window.PRODUCT_PHOTOS || new Set();  // add ids here when real photos exist
const packImg = p => window.packFor ? window.packFor(p) : (window.artFor ? window.artFor(p.type) : "");
window.imgFallback = (el, id) => { const p=P.find(x=>x.id==id); el.outerHTML = p ? packImg(p) : ""; };
function productImg(p){
  if(p.photo) return `<img class="pimg" src="${esc(p.photo)}" alt="${esc(prettyName(p.name))}" loading="lazy" decoding="async" onerror="window.imgFallback(this,${Number(p.id)})">`;
  if(window.PRODUCT_PHOTOS.has(p.id))
    return `<img class="pimg" src="assets/img/products/${p.id}.jpg" alt="${esc(prettyName(p.name))}" loading="lazy" decoding="async" onerror="window.imgFallback(this,${Number(p.id)})">`;
  return packImg(p);
}
const hasRealPhoto = p => !!(p.photo || window.PRODUCT_PHOTOS.has(p.id));
function tile(p){
  return `<div class="thumb${hasRealPhoto(p)?' has-photo':''}" style="background:${catBg(p.cat)}" data-open="${p.id}" role="button" tabindex="0" aria-label="${esc(titleOf(p))}">
      ${discount(p)?`<span class="badge">${discount(p)}% ${t('off')}</span>`:""}
      ${productImg(p)}
      ${!inStock(p)?`<span class="oos">${t('outStock')}</span>`:""}
    </div>`;
}
function qtySpan(p,q,extraAttrs=""){
  return isWeighable(p)
    ? `<span class="qty-val" data-qty-edit="${p.id}" title="${t('tapToEdit')}" ${extraAttrs}>${fmtQty(q)}<i>${window.icon('pencil')}</i></span>`
    : `<span ${extraAttrs}>${fmtQty(q)}</span>`;
}
function cardCtrl(p){
  const q = S.cart[p.id]||0;
  if(!inStock(p)) return `<button class="btn-add" disabled>${t('outStock')}</button>`;
  if(q>0) return `<div class="stepper" role="group" aria-label="${t('qty')}">
      <button data-dec="${p.id}" aria-label="decrease">−</button>${qtySpan(p,q)}
      <button data-inc="${p.id}" aria-label="increase">+</button></div>`;
  return `<button class="btn-add" data-add="${p.id}" aria-label="${t('addCart')}: ${esc(titleOf(p))}">${CART_SVG}<span>${t('add')}</span></button>`;
}
function productCard(p){
  return `<article class="card">
    ${tile(p)}
    <div class="body">
      <h3 data-open="${p.id}" style="cursor:pointer">${esc(titleOf(p))}</h3>
      <span class="tam">${esc(subOf(p))}</span>
      <span class="unit">${esc(unitOf(p))}${p.pack?` · ${t('pack')} ${p.pack}`:""}</span>
      <span class="price"><span class="now">${money(p.price)}</span>${p.mrp>p.price?`<span class="was">${money(p.mrp)}</span>`:""}</span>
      <div class="foot">${cardCtrl(p)}</div>
    </div>
  </article>`;
}
function renderGrid(list, el){
  if(!el) return;
  if(!list.length){ el.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="big">${window.icon('search')}</div>
    <h3>${t('noResults')}</h3><p>${t('noResultsSub')}</p></div>`; wireDynamic(); return; }
  el.innerHTML = list.map(productCard).join("");
  wireDynamic();
}

/* ============================================================ RENDER: categories, nav, sidebar */
function catVisual(c){
  const img = window.CATPHOTO && window.CATPHOTO[c];
  return `<span class="cc-icon">${window.catIcon(c)}</span>`+(img?`<img src="${img}" alt="" loading="lazy" onerror="this.remove()">`:"");
}
function renderCategories(){
  countCats();
  $("#cats").innerHTML = catsInOrder().map(c=>`
    <button class="catcard" data-cat="${esc(c)}">
      <span class="cc-img" style="background:${catBg(c)}">${catVisual(c)}</span>
      <b>${esc(catName(c))}</b><small>${CAT_COUNTS[c]} ${t('items')}</small>
    </button>`).join("");
  wireDynamic();
}
function renderRail(){
  countCats();
  const order=catsInOrder();
  const navCats=order.filter(c=>c!=="Tobacco & Pan").slice(0,8);
  $("#rail").innerHTML = navCats.map(c=>`<button class="cn-link ${S.cat===c?'on':''}" data-cat="${esc(c)}">${esc(catName(c))}</button>`).join("");
  $("#megaGrid").innerHTML = `<button data-cat=""><span class="mg-ic" style="background:var(--line-2)">${window.icon('basket')}</span>${t('all')}<small>${P.length}</small></button>`+
    order.map(c=>`<button data-cat="${esc(c)}"><span class="mg-ic" style="background:${catBg(c)}">${window.catIcon(c)}</span>${esc(catName(c))}<small>${CAT_COUNTS[c]}</small></button>`).join("");
  $("#sideCats").innerHTML = `<button class="${S.cat===''?'on':''}" data-cat="">${t('all')}<small>${P.length}</small></button>`+
    order.map(c=>`<button class="${S.cat===c?'on':''}" data-cat="${esc(c)}">${esc(catName(c))}<small>${CAT_COUNTS[c]}</small></button>`).join("");
  $("#mobileChips").innerHTML = `<button class="chip ${S.cat===''?'on':''}" data-cat="">${t('all')}</button>`+
    order.map(c=>`<button class="chip ${S.cat===c?'on':''}" data-cat="${esc(c)}"><span class="em">${window.catIcon(c)}</span>${esc(catName(c))}</button>`).join("");
  wireDynamic();
}

/* ============================================================ RENDER: home sections */
const FEATURE_CATS=["Rice & Atta","Oils","Dal & Pulses","Masala & Spices","Beverages","Snacks & Biscuits","Dairy & Ghee","Home Care","Personal Care"];
function roundRobin(list,n){
  const by={}; list.forEach(p=>(by[p.cat]=by[p.cat]||[]).push(p));
  const keys=FEATURE_CATS.filter(c=>by[c]); const out=[];
  for(let i=0;out.length<n && keys.some(k=>by[k][i]);i++) keys.forEach(k=>{ if(by[k][i] && out.length<n) out.push(by[k][i]); });
  return out;
}
function renderFeatured(){
  const staples=P.filter(p=>inStock(p) && FEATURE_CATS.includes(p.cat) && p.price>=20).sort((a,b)=>hash(b.id)-hash(a.id));
  renderGrid(roundRobin(staples,12), $("#popular"));
  const deals=P.filter(p=>inStock(p) && FEATURE_CATS.includes(p.cat) && discount(p)>0).sort((a,b)=>discount(b)-discount(a));
  renderGrid(roundRobin(deals,12), $("#offers"));
}

/* ============================================================ RENDER: browse (filtered) */
function filtered(){
  let list = P.slice();
  if(S.cat) list = list.filter(p=>p.cat===S.cat);
  if(S.inStockOnly) list = list.filter(inStock);
  if(S.onOffer) list = list.filter(p=>discount(p)>0);
  if(S.q){
    const q=S.q.toLowerCase();
    list = list.filter(p=>p.name.toLowerCase().includes(q)||(p.ta&&p.ta.includes(S.q))||p.cat.toLowerCase().includes(q)||
      prettyName(p.name).toLowerCase().includes(q)||(CATMETA[p.cat]&&CATMETA[p.cat].ta.includes(S.q)));
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
  const n = v => v.toLocaleString('en-IN');
  $("#allcount").textContent = list.length>slice.length ? tpl('showingOf',{x:n(slice.length),y:n(list.length)}) : tpl('showingAll',{y:n(list.length)});
  const title = S.cat ? catName(S.cat) : (S.q ? `“${S.q}”` : t('all'));
  $("#allTitle").textContent = title;
  $("#crumbCur").textContent = title;
  renderGrid(slice, $("#all"));
  const more=$("#loadMore");
  if(more) more.style.display = list.length>slice.length ? "flex" : "none";
  $("#fInStock").checked=!!S.inStockOnly; $("#fOffer").checked=!!S.onOffer;
  $$("#rail .cn-link, #sideCats button, #mobileChips .chip").forEach(b=>b.classList.toggle("on",b.dataset.cat===S.cat));
}
function goCategory(cat){
  S.cat=cat; S.q=""; S.shown=PAGE_SIZE; $("#searchInput").value="";
  closeMega(); renderAll(); show("shop",true);
  requestAnimationFrame(()=>$("#allSection").scrollIntoView({behavior:"smooth"}));
}
function openMega(){ const m=$("#megaMenu"); m.hidden=false; $("#allCatsBtn").setAttribute("aria-expanded","true"); }
function closeMega(){ const m=$("#megaMenu"); if(m) m.hidden=true; const b=$("#allCatsBtn"); if(b) b.setAttribute("aria-expanded","false"); }


/* ============================================================ CART */
function cartArr(){ return Object.entries(S.cart).map(([id,q])=>({p:P.find(x=>x.id==id),q})).filter(x=>x.p); }
function subtotal(){ return cartArr().reduce((s,{p,q})=>s+p.price*q,0); }
function cartQty(){ return Object.values(S.cart).reduce((a,b)=>a+b,0); }
function deliveryFee(){ const s=subtotal(); return s>0 && s<SHOP.freeOver ? SHOP.deliveryFee : 0; }
function saveCart(){ store.set("cart",S.cart); refreshCount(); }
function refreshCount(){
  const n=Object.keys(S.cart).length, show=n?"grid":"none";
  [["#cartCount"],["#mnCount"]].forEach(([id])=>{ const b=$(id); if(b){ b.textContent=n; b.style.display=show; } });
  const tot=$("#cartTotal"); if(tot) tot.textContent=money(round2(subtotal()));
}

function addToCart(id){ const p=P.find(x=>x.id==id); if(!p||!inStock(p)) return;
  S.cart[id]=Math.min(round2((S.cart[id]||0)+qtyStep(p)), p.stock); saveCart(); syncControls(id); renderCart();
  bumpCart(); toast(t('added'),window.icon('cart')); }
function incCart(id){ const p=P.find(x=>x.id==id); if(!p) return;
  S.cart[id]=Math.min(round2((S.cart[id]||0)+qtyStep(p)),p.stock); saveCart(); syncControls(id); renderCart(); }
function decCart(id){ const p=P.find(x=>x.id==id); if(!p) return;
  S.cart[id]=round2((S.cart[id]||0)-qtyStep(p)); if(S.cart[id]<=0) delete S.cart[id]; saveCart(); syncControls(id); renderCart(); }
function removeCart(id){ delete S.cart[id]; saveCart(); syncControls(id); renderCart(); }
function clearCart(){
  const ids=Object.keys(S.cart);
  if(!ids.length) return;
  if(!confirm(t('clearCartConfirm'))) return;
  S.cart={}; saveCart(); renderCart();
  ids.forEach(id=>syncControls(id));
}
/* direct decimal entry — tap the qty number (weighable products only) */
function setCartQty(id, qty){
  const p=P.find(x=>x.id==id); if(!p) return;
  qty=round2(qty);
  if(!(qty>0)){ removeCart(id); return; }
  S.cart[id]=Math.min(qty,p.stock); saveCart(); syncControls(id); renderCart();
}


/* update just the affected controls (cheap) without a full re-render */
function syncControls(id){
  ["#offers","#popular","#all"].forEach(sel=>{
    const grid=$(sel); if(!grid) return;
    $$(".card",grid).forEach(card=>{
      const open=$("[data-open]",card); if(!open) return;
      if(open.dataset.open!=id) return;
      const p=P.find(x=>x.id==id); const ctl=$(".foot .btn-add, .foot .stepper",card);
      if(p && ctl) ctl.outerHTML=cardCtrl(p);
    });
  });
  const mc=$("#modalCtrl"); if(mc && mc.dataset.pid==id) renderModalCtrl(P.find(x=>x.id==id));
  if($("#view-checkout").classList.contains("active")){
    if(!cartArr().length) show("shop"); else renderCheckoutBody();
  }
  wireDynamic();
}

function renderCart(){
  const arr=cartArr(), box=$("#ditems"), prog=$("#dprog");
  if(!arr.length){
    prog.innerHTML=""; prog.className="dprog";
    box.innerHTML=`<div class="empty"><div class="big">${window.icon('basket')}</div><h3>${t('emptyCart')}</h3>
    <p>${t('emptyCartSub')}</p><button class="btn btn-primary" data-close-cart style="margin-top:16px">${t('startShop')}</button></div>`;
    $("#dfoot").style.display="none"; $("#clearCartBtn").style.display="none"; wireDynamic(); return; }
  $("#dfoot").style.display="block";
  $("#clearCartBtn").style.display="flex";
  const s=subtotal(), d=deliveryFee();
  if(s>=SHOP.freeOver){ prog.className="dprog done"; prog.innerHTML=`✓ ${t('freeDelivDone')}`; }
  else{
    prog.className="dprog";
    prog.innerHTML=`${tpl('freeDelivHint',{x:money(round2(SHOP.freeOver-s))})}<div class="bar-o"><div class="bar-i" style="width:${Math.min(100,Math.round(s/SHOP.freeOver*100))}%"></div></div>`;
  }
  const inCart=new Set(arr.map(x=>String(x.p.id)));
  const cats=new Set(arr.map(x=>x.p.cat));
  const sugg=P.filter(p=>inStock(p)&&!inCart.has(String(p.id))&&cats.has(p.cat)).sort((a,b)=>hash(b.id)-hash(a.id)).slice(0,8);
  box.innerHTML=arr.map(({p,q})=>`<div class="crow">
    <div class="cim" style="background:${catBg(p.cat)}" data-open="${p.id}">${productImg(p)}</div>
    <div class="cmeta"><b>${esc(titleOf(p))}</b>${subOf(p)?`<span class="tam">${esc(subOf(p))}</span>`:""}
      <span class="p">${money(p.price)} × ${fmtQty(q)} = <b style="color:var(--ink)">${money(round2(p.price*q))}</b></span></div>
    <div class="cright">
      <button class="rm" data-rm="${p.id}">${window.icon('trash')}<span>${t('remove')}</span></button>
      <div class="mini"><button data-dec="${p.id}" aria-label="decrease">−</button>${qtySpan(p,q)}<button data-inc="${p.id}" aria-label="increase">+</button></div>
    </div></div>`).join("")+
    (sugg.length?`<div class="d-sugg"><h4>${t('youMayLike')}</h4><div class="d-sugg-row">${sugg.map(p=>`
      <div class="sg"><div class="sg-im" style="background:${catBg(p.cat)}" data-open="${p.id}">${productImg(p)}</div>
        <b>${esc(titleOf(p))}</b>
        <div class="sg-f"><span>${money(p.price)}</span><button class="add" data-add="${p.id}" aria-label="${t('addCart')}">+</button></div></div>`).join("")}
      </div></div>`:"");
  $("#dfoot").innerHTML=`
    <div class="drow"><span>${t('subtotal')} (${arr.length} ${arr.length===1?t('item'):t('items')})</span><span>${money(round2(s))}</span></div>
    <div class="drow"><span>${t('deliveryFee')}</span><span>${d?money(d):`<b style="color:var(--ok)">${t('free')}</b>`}</span></div>
    <div class="drow total"><span>${t('total')}</span><span>${money(round2(s+d))}</span></div>
    <button class="btn btn-gold btn-block" data-checkout>${t('checkout')}</button>`;
  wireDynamic();
}
function openCart(){ closeMega(); $("#scrim").classList.add("show"); const d=$("#drawer"); d.classList.add("show"); d.setAttribute("aria-hidden","false");
  renderCart(); document.body.style.overflow="hidden"; document.body.classList.add("ovl"); }
function closeCart(){ $("#scrim").classList.remove("show"); const d=$("#drawer"); d.classList.remove("show"); d.setAttribute("aria-hidden","true");
  if(!$("#modal").classList.contains("show")){ document.body.style.overflow=""; document.body.classList.remove("ovl"); } }

/* ============================================================ PRODUCT DETAIL (modal) */
function renderModalCtrl(p){
  const box=$("#modalCtrl"); if(!box||!p) return; box.dataset.pid=p.id; const q=S.cart[p.id]||0;
  if(!inStock(p)){ box.innerHTML=`<button class="btn-add pd-add" disabled>${t('outStock')}</button>`; return; }
  if(q>0){
    box.innerHTML=`<div class="pd-incart"><div class="stepper"><button data-dec="${p.id}" aria-label="decrease">−</button>
      ${qtySpan(p,q,'style="min-width:40px;font-size:16px"')}<button data-inc="${p.id}" aria-label="increase">+</button></div>
      <button class="btn btn-ghost" data-go-cart>${t('cart')} →</button></div>`;
  } else {
    const step=qtyStep(p); if(!(S.pdq>0)) S.pdq=step;
    box.innerHTML=`<div class="pd-q"><button data-pdq="-1" aria-label="decrease">−</button><span>${fmtQty(S.pdq)}</span><button data-pdq="1" aria-label="increase">+</button></div>
      <button class="btn btn-gold pd-add" data-pd-add="${p.id}">${CART_SVG}${t('addCart')}</button>`;
  }
  wireDynamic();
}
const FEAT_ICONS={
  q:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z"/><path d="M6.3 17.7C9 15 12 12 17 7"/></svg>`,
  f:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>`,
  d:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="14" height="12" rx="1"/><path d="M15 8h4l3 3.5V16h-7z"/><circle cx="5.5" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/></svg>`,
  b:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/></svg>`,
  doc:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></svg>`,
};
function openProduct(id){
  const p=P.find(x=>x.id==id); if(!p) return;
  S.pdq=Math.min(1,p.stock||1);
  const off=discount(p);
  const bulk = p.wprice && p.wprice>0 && p.wprice<p.price;
  const rel = P.filter(x=>x.cat===p.cat && x.id!==p.id && inStock(x)).sort((a,b)=>hash(b.id)-hash(a.id)).slice(0,6);
  $("#modalBody").innerHTML=`
    <div class="pd">
      <div class="pd-img" style="background:${catBg(p.cat)}">${off?`<span class="badge">${off}% ${t('off')}</span>`:""}${productImg(p)}</div>
      <div class="pd-info">
        <span class="cat">${esc(catName(p.cat))}</span>
        <h2>${esc(titleOf(p))}</h2>
        ${subOf(p)?`<div class="tam">${esc(subOf(p))}</div>`:""}
        <div class="pd-feats"><span>${FEAT_ICONS.q}${t('featQuality')}</span><span>${FEAT_ICONS.f}${t('featFresh')}</span><span>${FEAT_ICONS.d}${t('featDelivery')}</span></div>
        <div class="pd-price"><span class="now">${money(p.price)}</span>
          ${p.mrp>p.price?`<span class="was">${t('mrp')} ${money(p.mrp)}</span><span class="off">${off}% ${t('off')}</span>`:""}</div>
        ${p.mrp>p.price?`<div class="pd-save">${t('youSave')} ${money(round2(p.mrp-p.price))}</div>`:""}
        <div class="pd-stock ${inStock(p)?'':'no'}"><i></i>${inStock(p)?t('inStock'):t('outStock')}</div>
        ${inStock(p)?`<div class="pd-stock-s">${t('readyDispatch')}</div>`:""}
        <div class="pd-qlbl">${t('qty')}</div>
        <div id="modalCtrl" class="pd-ctrl"></div>
        ${bulk?`<div class="pd-bulk"><div class="pd-bulk-h">${FEAT_ICONS.b}${t('bulkPrice')}</div>
          <div class="pd-bulk-b"><b>${money(p.wprice)}</b><span>${t('bulkPer')}</span>
          <a href="https://ar-abi-traders-cuddalore.netlify.app/" target="_blank" rel="noopener">${t('bulkEnquiry')} →</a>
          <small>${t('bulkNote')}</small></div></div>`:""}
        <div class="pd-det"><h4>${FEAT_ICONS.doc}${t('productDetails')}</h4>
          <dl><dt>${t('category')}</dt><dd>${esc(catName(p.cat))}</dd>
          <dt>${t('unit')}</dt><dd>${esc(unitOf(p))}</dd>
          ${p.pack?`<dt>${t('pack')}</dt><dd>${p.pack}</dd>`:""}
          <dt>${t('stock')}</dt><dd>${inStock(p)?`${t('inStock')} · ${p.stock} ${t('left')}`:t('outStock')}</dd></dl>
          <p class="pd-desc">${esc(desc(p))}</p>
        </div>
      </div>
    </div>
    ${rel.length?`<div class="pd-rel"><h4>${t('related')}</h4><div class="pd-rel-row">${rel.map(r=>`
      <div class="rel"><div class="rel-im" style="background:${catBg(r.cat)}" data-open="${r.id}">${productImg(r)}</div>
        <div class="rel-m" data-open="${r.id}"><b>${esc(titleOf(r))}</b><small>${esc(unitOf(r))}</small><span>${money(r.price)}</span></div>
        <button class="add" data-add="${r.id}" aria-label="${t('addCart')}">+</button></div>`).join("")}</div></div>`:""}`;
  renderModalCtrl(p);
  const m=$("#modal"); m.classList.add("show"); $(".sheet",m).scrollTop=0;
  document.body.style.overflow="hidden"; document.body.classList.add("ovl");
}
function closeModal(){ $("#modal").classList.remove("show"); if(!$("#drawer").classList.contains("show")){ document.body.style.overflow=""; document.body.classList.remove("ovl"); } }

/* ============================================================ VIEWS: checkout */
function show(view, keepScroll){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $("#view-"+view).classList.add("active");
  $$("#mnav button").forEach(b=>b.classList.remove("on"));
  const mn = view==="track" ? $('#mnav [data-track]') : view==="shop" ? $('#mnav [data-home]') : null;
  if(mn) mn.classList.add("on");
  if(!keepScroll) window.scrollTo({top:0,behavior:"smooth"});
}
function renderCheckoutBody(){
  const arr=cartArr(); const s=subtotal(), d=deliveryFee();
  $("#coCart").innerHTML=`<h3>${t('cart')} (${arr.length} ${arr.length===1?t('item'):t('items')})</h3>`+arr.map(({p,q})=>`
    <div class="co-item"><div class="cim" style="background:${catBg(p.cat)}">${productImg(p)}</div>
      <div class="ci-m"><b>${esc(titleOf(p))}</b><small>${esc(unitOf(p))} · ${money(p.price)}</small>
        <div class="mini" style="margin-top:6px;width:max-content"><button data-dec="${p.id}" aria-label="decrease">−</button>${qtySpan(p,q)}<button data-inc="${p.id}" aria-label="increase">+</button></div></div>
      <div class="ci-r"><strong>${money(round2(p.price*q))}</strong><button class="rm" data-rm="${p.id}">${window.icon('trash')}<span>${t('remove')}</span></button></div>
    </div>`).join("")+`<button class="co-empty-link" data-home>← ${t('continueShopping')}</button>`;
  $("#coSummary").innerHTML=`<h3>${t('orderSummary')}</h3>
    <div class="drow"><span>${t('subtotal')} (${arr.length} ${arr.length===1?t('item'):t('items')})</span><span>${money(round2(s))}</span></div>
    <div class="drow"><span>${t('deliveryFee')}</span><span>${d?money(d):`<b style="color:var(--ok)">${t('free')}</b>`}</span></div>
    <div class="drow total"><span>${t('total')}</span><span>${money(round2(s+d))}</span></div>`;
  wireDynamic();
}
function renderCheckout(){
  if(!cartArr().length){ show("shop"); return; }
  renderCheckoutBody();
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
  const num = "AB"+Date.now().toString().slice(-6)+Math.floor(10+Math.random()*90);
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
  renderFeatured(); renderAll(); refreshTrackDot();   // clear the old quantities off the product cards
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
    <p style="color:var(--muted);margin:0 0 2px">${t('orderThanks')}, <b style="color:var(--ink)">${esc(o.name)}</b> ${window.icon('praying')}</p>
    <p style="color:var(--muted);font-size:13px;margin-bottom:14px">${t('orderNum')} <b style="color:var(--green)">#${o.num}</b></p>
    <div id="trackBody"></div>
    <p style="color:var(--muted);max-width:42ch;margin:14px auto 0">${t('orderMsg')}</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">
      <a class="btn btn-primary" href="https://wa.me/${SHOP.wa}?text=${waMessage(o)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1s-.5-.2-.7.1-.8 1-.9 1.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5v-.5L8.9 6.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3A3 3 0 0 0 6 9.1c0 1.3.9 2.6 1.1 2.8a10.7 10.7 0 0 0 4.1 3.6c2 .8 2 .6 2.4.5a2.6 2.6 0 0 0 1.7-1.2c.2-.5.2-.9.1-1zM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2z"/></svg>
        ${t('waOrder')}</a>
      <button class="btn btn-ghost" data-track-this="${esc(o.num)}">${t('trackThis')}</button>
      <button class="btn btn-ghost" data-copy-num="${esc(o.num)}">${t('copyNum')}</button>
      <button class="btn btn-ghost" data-home>${t('keepShopping')}</button>
    </div>
    <p class="tk-note" style="text-align:center;margin-top:14px">${t('saveNumHint')}</p>
  </div>`;
  $("#confirm #trackBody").innerHTML=trackerHTML(o);
  show("confirm"); wireDynamic();
  if(window.ARFire && window.ARFire.ready){
    const {db,doc,onSnapshot}=window.ARFire;
    S.unsub=onSnapshot(doc(db,"orders",o.num),snap=>{
      if(!snap.exists()) return;
      const fresh=snap.data(); S.order={...S.order,...fresh};
      const body=$("#confirm #trackBody"); if(body) body.innerHTML=trackerHTML(S.order);
    },err=>console.warn("[A.R. Abi] tracker listener error:",err));
  }
}


/* ============================================================ TRACK MY ORDER (returning / other device) */
function renderTrack(prefill){
  $("#view-track .wrap").innerHTML = trackFormHTML(prefill);
  wireTrackForm();
}
function recentOrders(){ return (store.get("orders",[])||[]).filter(o=>o&&o.num).slice(0,6); }
const isActiveOrder = o => o && !["delivered","cancelled"].includes(o.status||"received") && (Date.now()-(o.at||0)) < 4*864e5;
function trackFormHTML(prefill){
  const recent=recentOrders();
  const fmtDate=ts=>{ try{ return new Date(ts).toLocaleDateString(S.lang==="ta"?"ta-IN":"en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}); }catch{ return ""; } };
  return `<button class="btn btn-ghost btn-sm" id="tkBack" style="margin-bottom:18px">← <span>${t('back')}</span></button>
    <h2 class="co-title" style="margin-bottom:6px">${t('trackTitle')}</h2>
    <p style="color:var(--muted);margin:0 0 20px;max-width:52ch">${t('trackDesc')}</p>
    <div class="tk-grid">
      <div class="co-card">
        <div class="field"><label for="tk-num">${t('orderNum')}</label><input id="tk-num" type="text" placeholder="AB12345678" autocomplete="off" value="${esc(prefill||"")}"></div>
        <div class="field"><label for="tk-mobile">${t('mobile')}</label><input id="tk-mobile" type="tel" inputmode="numeric" maxlength="10" placeholder="9876543210"></div>
        <button class="btn btn-primary btn-block" id="tk-go">${t('trackBtn')}</button>
        <p class="err" id="tk-err" style="display:none;margin-top:10px"></p>
      </div>
      <div class="co-card">
        <h3>${t('recentOrders')}</h3>
        <p class="tk-note">${t('recentNote')}</p>
        ${recent.length?recent.map(o=>`<button class="tk-row" data-track-num="${esc(o.num)}" data-track-mob="${esc(o.mobile||"")}">
            <span class="tk-dot ${isActiveOrder(o)?'on':''}"></span>
            <span class="tk-m"><b>#${esc(o.num)}</b><small>${fmtDate(o.at)} · ${(o.items||[]).length} ${(o.items||[]).length===1?t('item'):t('items')} · ${money(o.total||0)}</small></span>
            <span class="tk-go">${t('trackBtn')} →</span></button>`).join(""):`<p class="tk-empty">${t('noRecent')}</p>`}
      </div>
    </div>
    <div id="tk-result" style="margin-top:24px"></div>`;
}
function wireTrackForm(){
  $("#tkBack").onclick=()=>{ stopTracking(); show("shop"); };
  $$("[data-track-num]").forEach(b=>b.onclick=()=>{ $("#tk-num").value=b.dataset.trackNum; $("#tk-mobile").value=b.dataset.trackMob; doTrackLookup();
    requestAnimationFrame(()=>$("#tk-result").scrollIntoView({behavior:"smooth",block:"start"})); });
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
      <div class="tk-body"></div></div>`;
    $("#tk-result .tk-body").innerHTML=trackerHTML(found);
    { const list=store.get("orders",[]); const i=list.findIndex(o=>o.num===found.num); if(i>=0 && found.status){ list[i].status=found.status; store.set("orders",list); refreshTrackDot(); } }
    if(window.ARFire && window.ARFire.ready){
      const {db,doc,onSnapshot}=window.ARFire;
      S.unsub=onSnapshot(doc(db,"orders",num),snap=>{
        if(!snap.exists()) return;
        const fresh=snap.data(); const body=$("#tk-result .tk-body"); if(body) body.innerHTML=trackerHTML(fresh);
      },err=>console.warn("[A.R. Abi] tracker listener error:",err));
    }
  }finally{
    $("#tk-go").disabled=false; $("#tk-go").textContent=t('trackBtn');
  }
}
function refreshTrackDot(){ const on=recentOrders().some(isActiveOrder); $$('[data-track]').forEach(b=>b.classList.toggle('has-active',on)); }
function openTrack(prefill){ show("track"); renderTrack(typeof prefill==="string"?prefill:""); }


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
    if(e.error==="no-speech") toast(t('micNoSpeech'),window.icon('mic'));
    else if(e.error==="not-allowed" || e.error==="service-not-allowed") toast(t('micDenied'),window.icon('mic'));
  };
  voiceRec.onresult = e => {
    const text = e.results[0][0].transcript.trim();
    if(!text) return;
    $("#searchInput").value = text;
    S.q = text; S.cat = ""; S.shown = PAGE_SIZE;
    renderRail(); renderAll();
    $("#allSection").scrollIntoView({behavior:"smooth"});
    toast(`${t('micHeard')} "${text}"`,window.icon('mic'));
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
  set("#lblTrack","trackOrder"); set("#lblCart","cartLabel"); set("#lblAllCats","allCategories"); set("#navOffers","offersNav");
  set("#mnHome","navHome"); set("#mnCats","navCategories"); set("#mnCart","navCart"); set("#mnTrack","navTrack");
  set("#heroEyebrow","heroEyebrow"); $("#heroTitle").innerHTML=`${esc(t('heroTitle'))} <em>${esc(t('heroTitleEm'))}</em>`;
  set("#heroLede","heroLede"); set("#btnShop","shopNow"); set("#btnCall","bulkEnquiry");
  set("#trustProducts","heroTrust1"); set("#trustBrands","heroTrust2"); set("#trustDelivery","heroTrust3");
  set("#hCats","categories"); set("#lblViewAllCats","viewAllCats");
  set("#hPopular","bestSellers"); set("#hPopularSub","bestSub");
  set("#hOffers","offers"); set("#hOffersSub","offersSub");
  set("#lblViewAll1","viewAllProducts"); set("#lblViewAll2","viewAllProducts");
  set("#btnLoadMore","loadMore");
  set("#crumbHome","home"); set("#sbCatTitle","filterCat"); set("#sbAvailTitle","availability");
  set("#lblInStock","inStockOnly"); set("#lblOnOffer","onOffer"); set("#clearFilters","clearFilters"); set("#lblSort","sortBy");
  set("#wbEyebrow","wbEyebrow"); set("#wbTitle","wbTitle"); set("#wbNote","wbNote");
  ["#wbCheck1","#wbCheck2","#wbCheck3"].forEach(id=>{ const e=$(id); if(e) e.innerHTML=window.icon('check'); });
  set("#wbP1","wbP1"); set("#wbP2","wbP2"); set("#wbP3","wbP3"); set("#wbCta","wbCta");
  ["1","2","3","4"].forEach(n=>{ set(`#f${n}T`,`f${n}T`); set(`#f${n}S`,`f${n}S`); });
  set("#drawerTitle","cart");
  $("#clearCartBtn").innerHTML=`${window.icon('trash')}<span>${t('clearCart')}</span>`;
  set("#coTitle","checkoutTitle"); set("#coDetails","yourDetails"); set("#coPayTitle","payment"); set("#coBackLbl","continueShopping");
  set("#stepCart","stepCart"); set("#stepDelivery","stepDelivery"); set("#stepPlace","stepPlace"); set("#secureNote","secureNote");
  $("#lbl-name").textContent=t('name'); $("#lbl-mobile").textContent=t('mobile');
  $("#lbl-address").textContent=t('address'); $("#lbl-notes").textContent=t('instructions');
  $("#f-name").placeholder=t('namePh'); $("#f-mobile").placeholder=t('mobilePh');
  $("#f-address").placeholder=t('addressPh'); $("#f-notes").placeholder=t('notesPh');
  $("#err-name").textContent=t('nameErr'); $("#err-mobile").textContent=t('mobileErr'); $("#err-address").textContent=t('addrErr');
  $("#pay-cod-t").textContent=t('cod'); $("#pay-cod-s").textContent=t('codSub');
  $("#pay-upi-t").textContent=t('upi'); $("#pay-upi-s").textContent=t('upiSub');
  set("#btnPlace","placeOrder");
  $("#sortSel").innerHTML=`<option value="pop">${t('sortPop')}</option><option value="low">${t('sortLow')}</option>
    <option value="high">${t('sortHigh')}</option><option value="name">${t('sortName')}</option>`;
  $("#sortSel").value=S.sort;
  set("#waFloatLbl","waSupport");
  set("#footTag","footTag"); $("#footAbout").textContent=t('footAbout'); set("#fLinks","quickLinks"); set("#fContact","contact");
  set("#fChat","chatWith"); $("#fHours").textContent=t('hours'); set("#lblRights","rights"); set("#lblProud","proudLocal");
  set("#flHome","home"); set("#flAll","all"); set("#flTrack","trackTitle"); set("#flBulk","bulkEnquiry");
  set("#hFaq","faqTitle");
  [1,2,3,4,5].forEach(n=>{ set(`#faqQ${n}`,`faqQ${n}`); set(`#faqA${n}`,`faqA${n}`); });
  $$(".lang-toggle button").forEach(b=>{ b.classList.toggle("on",b.dataset.lang===S.lang); b.setAttribute("aria-pressed",b.dataset.lang===S.lang); });
}
function rerenderAll(){
  renderCategories(); renderRail(); renderFeatured(); renderAll(); refreshCount();
  if($("#drawer").classList.contains("show")) renderCart();
  if($("#view-checkout").classList.contains("active")) renderCheckoutBody();
  const mc=$("#modalCtrl"); if($("#modal").classList.contains("show") && mc && mc.dataset.pid) openProduct(mc.dataset.pid);
}
function setLang(l){ S.lang=l; store.set("lang",l); applyStaticText(); rerenderAll(); }
function setTheme(th){ S.theme=th; store.set("theme",th); document.documentElement.setAttribute("data-theme",th);
  $("#themeIcon").innerHTML = th==="dark"?window.icon('sun'):window.icon('moon');
  rerenderAll(); }


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
  $$("[data-clear-cart]").forEach(b=>b.onclick=clearCart);
  $$("[data-qty-edit]").forEach(el=>el.onclick=e=>{e.stopPropagation();startQtyEdit(el);});
  $$("[data-open]").forEach(b=>{
    b.onclick=()=>openProduct(b.dataset.open);
    if(b.getAttribute("tabindex")==="0") b.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openProduct(b.dataset.open); } };
  });
  $$("[data-checkout]").forEach(b=>b.onclick=()=>{closeCart();renderCheckout();});
  $$("[data-close-cart]").forEach(b=>b.onclick=closeCart);
  $$("[data-close-modal]").forEach(b=>b.onclick=closeModal);
  $$("[data-go-cart]").forEach(b=>b.onclick=()=>{ closeModal(); openCart(); });
  $$("[data-home]").forEach(b=>b.onclick=e=>{ e.preventDefault(); stopTracking(); closeMega(); show("shop"); });
  $$("[data-view-all]").forEach(b=>b.onclick=e=>{ e.preventDefault(); goCategory(""); });
  $$("[data-cat]").forEach(b=>b.onclick=()=>goCategory(b.dataset.cat));
  $$("[data-track-this]").forEach(b=>b.onclick=()=>{ openTrack(b.dataset.trackThis);
    const o=recentOrders().find(x=>x.num===b.dataset.trackThis); if(o){ $("#tk-mobile").value=o.mobile||""; doTrackLookup(); } });
  $$("[data-copy-num]").forEach(b=>b.onclick=async()=>{ try{ await navigator.clipboard.writeText(b.dataset.copyNum); toast(t('copied'),"✓"); }catch{ toast("#"+b.dataset.copyNum,"✓"); } });
  $$("[data-pdq]").forEach(b=>b.onclick=()=>{
    const p=P.find(x=>x.id==$("#modalCtrl").dataset.pid); if(!p) return;
    const step=qtyStep(p); S.pdq=round2(Math.min(p.stock,Math.max(step,(S.pdq||step)+step*Number(b.dataset.pdq))));
    renderModalCtrl(p);
  });
  $$("[data-pd-add]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.pdAdd; const p=P.find(x=>x.id==id); if(!p||!inStock(p)) return;
    S.cart[id]=Math.min(round2((S.cart[id]||0)+(S.pdq||qtyStep(p))),p.stock); saveCart(); syncControls(id); renderCart();
    bumpCart(); toast(t('added'),window.icon('cart'));
  });
  const loadMoreBtn=$("#btnLoadMore");
  if(loadMoreBtn) loadMoreBtn.onclick=()=>{ S.shown+=PAGE_SIZE; renderAll(); };
}
function bumpCart(){
  ["#cartCount","#mnCount"].forEach(id=>{ const el=$(id); if(!el) return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); });
}
function initReveal(){
  const els=$$(".reveal");
  if(!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches){ els.forEach(e=>e.classList.add("in")); return; }
  const io=new IntersectionObserver(entries=>entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } }),{rootMargin:"0px 0px -8% 0px",threshold:.05});
  els.forEach(e=>io.observe(e));
}
function init(){
  // restore state
  S.cart=store.get("cart",{}); S.lang=store.get("lang","en"); S.theme=store.get("theme","light");
  // drop cart entries for products that no longer exist (keeps the badge/total honest)
  Object.keys(S.cart).forEach(id=>{
    const p=P.find(x=>String(x.id)===String(id));
    if(!p || !(S.cart[id]>0)){ delete S.cart[id]; return; }
    if(!isWeighable(p) && S.cart[id]%1) S.cart[id]=Math.ceil(S.cart[id]);  // half packs left over from the old rule
  });
  store.set("cart",S.cart);
  document.documentElement.setAttribute("data-theme",S.theme);
  $("#themeIcon").innerHTML=S.theme==="dark"?window.icon('sun'):window.icon('moon');
  const tn=$("#trustProductsN"); if(tn) tn.textContent = P.length.toLocaleString("en-IN")+"+";
  applyStaticText();
  renderCategories(); renderRail(); renderFeatured(); renderAll(); refreshCount();
  initReveal(); refreshTrackDot();
  const deepTrack=()=>{ const hm=location.hash.match(/^#track=([A-Za-z0-9]+)/); if(hm) openTrack(hm[1].toUpperCase()); };
  setTimeout(deepTrack,0); window.addEventListener("hashchange",deepTrack);
  // Firebase loads async so it never blocks the initial render — attach live
  // price/stock sync as soon as it's ready, whether that's now or a moment later.
  if(window.ARFire) subscribeProductOverrides();
  else window.addEventListener("arfire-ready", subscribeProductOverrides, {once:true});

  // search (debounced) + explicit submit
  const runSearch=(scroll)=>{ S.q=$("#searchInput").value.trim(); S.cat=""; S.shown=PAGE_SIZE; renderAll(); show("shop",true);
    if(scroll && S.q) $("#allSection").scrollIntoView({behavior:"smooth"}); };
  let dq; $("#searchInput").addEventListener("input",()=>{ clearTimeout(dq); dq=setTimeout(()=>runSearch(true),260); });
  $("#searchForm").addEventListener("submit",e=>{ e.preventDefault(); clearTimeout(dq); runSearch(true); $("#searchInput").blur(); });
  $("#sortSel").addEventListener("change",e=>{ S.sort=e.target.value; S.shown=PAGE_SIZE; renderAll(); });
  $("#fInStock").addEventListener("change",e=>{ S.inStockOnly=e.target.checked; S.shown=PAGE_SIZE; renderAll(); });
  $("#fOffer").addEventListener("change",e=>{ S.onOffer=e.target.checked; S.shown=PAGE_SIZE; renderAll(); });
  $("#clearFilters").onclick=()=>{ S.inStockOnly=false; S.onOffer=false; S.cat=""; S.q=""; $("#searchInput").value=""; S.shown=PAGE_SIZE; renderAll(); };
  initVoiceSearch();

  // header
  $("#cartBtn").onclick=openCart; $("#mnCartBtn").onclick=openCart;
  $("#themeBtn").onclick=()=>setTheme(S.theme==="dark"?"light":"dark");
  $$(".lang-toggle button").forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
  $("#allCatsBtn").onclick=e=>{ e.stopPropagation(); $("#megaMenu").hidden?openMega():closeMega(); };
  document.addEventListener("click",e=>{ if(!$("#megaMenu").hidden && !e.target.closest("#megaMenu")) closeMega(); });
  $("#navOffers").onclick=()=>{ closeMega(); show("shop",true); $("#offersSection").scrollIntoView({behavior:"smooth"}); };
  $("#moreCats").onclick=()=>goCategory("");
  const hdr=$("#siteHeader"); let ticking=false;
  window.addEventListener("scroll",()=>{ if(ticking) return; ticking=true;
    requestAnimationFrame(()=>{ hdr.classList.toggle("scrolled",window.scrollY>8); ticking=false; }); },{passive:true});

  $("#scrim").onclick=closeCart;
  $("#modal").addEventListener("click",e=>{ if(e.target===$("#modal")) closeModal(); });
  $("#btnShop").onclick=()=>goCategory("");
  $$("[data-track]").forEach(b=>b.onclick=e=>{ e.preventDefault(); closeMega(); openTrack(); });

  // payment select (mouse + keyboard)
  const pick=p=>{ S.pay=p.dataset.pay; $$(".pay").forEach(x=>{ x.classList.remove("on"); x.setAttribute("aria-checked","false"); }); p.classList.add("on"); p.setAttribute("aria-checked","true"); };
  $$(".pay").forEach(p=>{ p.onclick=()=>pick(p); p.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pick(p); } }; });
  pick($('.pay[data-pay="cod"]'));
  $("#btnPlace").onclick=placeOrder;
  $("#coBack").onclick=()=>show("shop");
  // live-clear field errors
  ["f-name","f-mobile","f-address"].forEach(id=>$("#"+id).addEventListener("input",()=>$("#"+id).closest(".field").classList.remove("bad")));

  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeCart(); closeModal(); closeMega(); } });
  wireDynamic();
}
document.addEventListener("DOMContentLoaded",init);
