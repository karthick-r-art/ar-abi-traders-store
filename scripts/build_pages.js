#!/usr/bin/env node
/* ============================================================
   A.R. ABI TRADERS — static page builder (SEO)

   The storefront renders products with JavaScript, so a crawler that
   doesn't run JS sees empty sections. This script writes real HTML:

     index.html                    home — head/schema + pre-rendered categories & products
     category/<slug>/index.html    one page per category, with a full price list
     delivery/<area>/index.html    one landing page per delivery locality
     wholesale/index.html          bulk / wholesale enquiry (replaces the old Netlify site)
     sitemap.xml, robots.txt

   Every page is the full working store (cart, checkout, tracking) —
   index.html is the template; the generator only fills the
   <!--ssr:name-->…<!--/ssr:name--> regions in it.

   Run after editing index.html, products (assets/js/data.js) or the
   settings below:      node scripts/build_pages.js

   MOVING TO A NEW DOMAIN: change SITE.url below, run the script, deploy.
   ============================================================ */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SITE = {
  url: process.env.SITE_URL || "https://ar-abi-traders-store.vercel.app/",   // ← e.g. "https://arabitraders.in/" once the domain is connected
  name: "A.R. Abi Traders",
  nameTa: "ஏ.ஆர். அபி டிரேடர்ஸ்",                    // one Tamil spelling, used everywhere
  phone: "+919566561558", phoneShow: "+91 95665 61558",
  phone2: "+916381958057", phone2Show: "+91 63819 58057",
  wa: "919566561558",
  street: "No.54/41C, Angalamman Koil Street, Manjakuppam",
  locality: "Cuddalore", region: "Tamil Nadu", postal: "607001",
  geo: null,   // ← { lat: 11.xxxxx, lng: 79.xxxxx } — copy from the shop's Google Maps pin
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=A.R.+Abi+Traders+Angalamman+Koil+Street+Manjakuppam+Cuddalore",
  hours: [   // keep identical to the Google Business Profile
    { days: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], opens: "09:00", closes: "22:00" },
    { days: ["Sunday"], opens: "09:00", closes: "14:00" },
  ],
  hoursText: "Mon–Sat 9am–10pm · Sun 9am–2pm",
  ogImage: "assets/img/hero-bg.jpg",
};

/* Delivery localities — each gets /delivery/<slug>/. `near:true` = inside Cuddalore town (same-day
   promise applies); outer towns get softer wording. Edit/add freely. */
const AREAS = [
  { slug: "manjakuppam", name: "Manjakuppam", ta: "மஞ்சக்குப்பம்", near: true,
    intro: "Our shop is right here on Angalamman Koil Street, Manjakuppam — so this is our quickest delivery area. Order online and we bring it to your door, or walk in and pick it up yourself.",
    extra: "Manjakuppam is our closest delivery area — orders go out the same day during shop hours." },
  { slug: "thirupapuliyur", name: "Thirupapuliyur", ta: "திருப்பாதிரிப்புலியூர்", near: true,
    intro: "We deliver groceries across Thirupapuliyur (Tiruppadiripuliyur) — the old town area, the bus-stand side and the streets around the Padaleeswarar temple — straight from our store in Manjakuppam.",
    extra: "Thirupapuliyur is a short ride from our shop, so same-day delivery is standard." },
  { slug: "semmandalam", name: "Semmandalam", ta: "செம்மண்டலம்", near: true,
    intro: "Families and offices in Semmandalam order rice, oil, dal, masala and daily essentials from us online and get them delivered the same day.",
    extra: "Semmandalam is within our regular Cuddalore delivery route." },
  { slug: "nellikuppam", name: "Nellikuppam", ta: "நெல்லிக்குப்பம்", near: false,
    intro: "Shops, hotels and households in Nellikuppam buy groceries from A.R. Abi Traders at retail and wholesale prices. Place your order online or on WhatsApp and we'll confirm the delivery slot with you.",
    extra: "For Nellikuppam we confirm the delivery time and any delivery charge when we confirm your order." },
  { slug: "panruti", name: "Panruti", ta: "பண்ருட்டி", near: false,
    intro: "We supply groceries to customers and businesses in Panruti — from monthly household lists to bulk orders for shops and caterers. Order online or on WhatsApp and we'll confirm the delivery slot with you.",
    extra: "For Panruti we confirm the delivery time and any delivery charge when we confirm your order. Bulk orders are our speciality here." },
];

/* A short, specific intro per category — unique text for each page. */
const CAT_COPY = {   // only name products/brands that are actually in assets/js/data.js
  "Rice & Atta": "Ponni rice and pacharisi, wheat atta from Aashirvaad, Fortune, 7 O'Clock and Elite, maida, rava, semiya and ragi, rice and kozhukattai flours.",
  "Dal & Pulses": "Toor dal, ulundhu (urad), vella and karuppu kadalai, varukadalai, payir and kadalai maavu — loose by the kilo or in small packs.",
  "Oils": "Groundnut, gingelly (nallennai) and palm oil, VVD and Idhayam oils and Dalda — in sachets, pouches and bottles.",
  "Masala & Spices": "Sambar, rasam, chilli, malli and manjal powders from Aachi and Sakthi, plus pickles, salt and whole spices.",
  "Snacks & Biscuits": "Good Day and other biscuits, mixtures, chips, murukku, cakes, rusk and nuts — single packs to family packs.",
  "Beverages": "3 Roses tea, Bru coffee, Horlicks and Boost, Maaza, Sprite, Pepsi and other soft drinks, juices and drinking water.",
  "Dairy & Ghee": "GRB and Udhaya Krishna ghee, Nandhini, Milkmaid, milk powder and other dairy products.",
  "Home Care": "Surf, Vim, Harpic and Lizol, mosquito coils and liquids, agarbatti, sambrani and cleaning essentials.",
  "Personal Care": "Lux, Santoor and Mysore Sandal soaps, Clinic Plus and other shampoos, hair oils and grooming essentials.",
  "General Store": "Sugar, cashews, gift boxes and the everyday general-store items you'd pick up at the counter.",
  "Chocolates & Candy": "Dairy Milk, KitKat, Munch, Milky Bar, Eclairs, jellies and toffees.",
  "Baby Care": "Pampers and Huggies diapers, Himalaya baby soap, powder and shampoo, and baby food.",
  "Stationery & General": "Pens and gel pens, notebooks, batteries, bulbs, lighters and balloons.",
  "Tobacco & Pan": "",
};
/* not indexed, not in the sitemap (tobacco advertising rules) — page still exists so links work */
const NOINDEX_CATS = new Set(["Tobacco & Pan"]);

/* Migrated from the old Netlify wholesale site. */
const WHOLESALE = {
  ranges: [
    { cat: "Rice", items: "Basmati (India Gate), Ponni, Sona Masoori, raw rice, boiled rice (Rajabhogam)" },
    { cat: "Pulses", items: "Toor dal, moong dal, urad dal (Roller brand), chana dal, black channa" },
    { cat: "Spices", items: "Turmeric, red chilli & coriander powder, cumin, garam masala (Aachi / Sakthi)" },
    { cat: "Oils", items: "Sunflower (Freedom, Saffola), groundnut, mustard, soybean, olive oil" },
    { cat: "Beverages", items: "Tata & Brooke Bond tea, Nescafé & Bru coffee, soft drinks, juices, energy drinks" },
    { cat: "FMCG", items: "Toothpaste, soaps, shampoo, detergents (Surf, Ariel, Tide), Britannia & Parle biscuits" },
  ],
  brands: ["Nestlé","Hindustan Unilever","P&G","Cadbury","Coca-Cola","PepsiCo","Parle Agro","Godrej","Britannia","ITC","Dabur","Amul","Tata Consumer","MDH","Everest"],
};

/* ------------------------------------------------------------ load the site's own data + helpers */
const ROOTDIR = path.resolve(__dirname, "..");
const rd = f => fs.readFileSync(path.join(ROOTDIR, f), "utf8");

// 0. apply data/category_fixes.json to the product data (idempotent) so the live store and these pages agree
(function applyCategoryFixes() {
  const fixFile = path.join(ROOTDIR, "data/category_fixes.json");
  if (!fs.existsSync(fixFile)) return;
  const fixes = JSON.parse(fs.readFileSync(fixFile, "utf8"));
  for (const f of ["assets/js/data.js", "data/products.json"]) {
    const file = path.join(ROOTDIR, f);
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    const m = src.match(/^(window\.PRODUCTS=)?(\[[\s\S]*\])(;?\s*)$/);
    if (!m) throw new Error(`${f}: unexpected format, not touching it`);
    const arr = JSON.parse(m[2]);
    if (JSON.stringify(arr) !== m[2]) throw new Error(`${f}: would not round-trip exactly, not touching it`);
    let n = 0;
    for (const p of arr) {
      const fx = fixes[p.id]; if (!fx) continue;
      if (fx.cat && p.cat !== fx.cat) { p.cat = fx.cat; n++; }
      if (fx.type && p.type !== fx.type) { p.type = fx.type; n++; }
    }
    if (n) { fs.writeFileSync(file, (m[1] || "") + JSON.stringify(arr) + m[3]); console.log(`${f}: applied ${n} category/type fixes`); }
  }
})();
const ctx = { window: {}, document: { currentScript: null }, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ["assets/js/i18n.js", "assets/js/icons.js", "assets/js/data.js"]) vm.runInContext(rd(f), ctx, { filename: f });
const W = ctx.window;
const P = W.PRODUCTS, CATMETA = W.CATMETA, catIcon = W.catIcon;
// category photos — only ones whose file really exists (a listed-but-missing photo = a 404 per visitor)
const CATPHOTO = {};
for (const [c, src] of Object.entries(W.CATPHOTO || {})) {
  const rel = String(src).replace(/^.*?(assets\/)/, "$1");
  if (fs.existsSync(path.join(ROOTDIR, rel))) CATPHOTO[c] = rel;
  else console.warn(`warning: CATPHOTO for "${c}" points at missing ${rel} — remove it from assets/js/i18n.js`);
}
if (!Array.isArray(P) || !P.length) throw new Error("no products loaded from assets/js/data.js");

// reuse store.js's display helpers verbatim so pre-rendered names match the live page exactly
const storeJs = rd("assets/js/store.js");
function cut(startRe, endRe) {
  const a = storeJs.search(startRe); if (a < 0) throw new Error("store.js: not found " + startRe);
  const rest = storeJs.slice(a); const b = rest.search(endRe); if (b < 0) throw new Error("store.js: no end " + endRe);
  return rest.slice(0, b);
}
const helperSrc = [
  cut(/^const KEEP_UPPER/m, /^const UNIT_TA/m),
  cut(/^const LOOSE_RE/m, /^const qtyStep/m),
  cut(/^const hash = /m, /^\/\* =+ PRODUCT OVERRIDES/m),
  cut(/^const CAT_ORDER/m, /^let CAT_COUNTS/m),
  cut(/^const FEATURE_CATS/m, /^function renderFeatured/m),
  cut(/^const discount/m, /\n/),
].join("\n") + "\n;({prettyName, isWeighable, hash, inStock, CAT_ORDER, FEATURE_CATS, roundRobin, discount})";
const H = vm.runInContext(helperSrc, ctx, { filename: "store.js(helpers)" });
const { prettyName, isWeighable, hash, inStock, CAT_ORDER, FEATURE_CATS, roundRobin, discount } = H;

/* ------------------------------------------------------------ small helpers */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: (n % 1 ? 2 : 0), maximumFractionDigits: 2 });
const catSlug = c => String(c).toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const catBg = c => (CATMETA[c] || CATMETA["General Store"]).c.split(",")[0];
const catTa = c => (CATMETA[c] || {}).ta || "";
const abs = p => SITE.url + p;                       // site-absolute URL for canonical / schema / sitemap
const unitOf = p => isWeighable(p) ? "per kg" : String(p.unit || "").trim();
const popSort = (a, b) => (inStock(b) - inStock(a)) || (hash(b.id) - hash(a.id));
const today = new Date().toISOString().slice(0, 10);

const COUNTS = {}; P.forEach(p => COUNTS[p.cat] = (COUNTS[p.cat] || 0) + 1);
const CATS = CAT_ORDER.filter(c => COUNTS[c]).concat(Object.keys(COUNTS).filter(c => !CAT_ORDER.includes(c) && CATMETA[c]));
const LIST_CATS = CATS.filter(c => !NOINDEX_CATS.has(c));
const catPath = c => `category/${catSlug(c)}/`;

/* ------------------------------------------------------------ HTML fragments */
function card(p) {
  const off = discount(p);
  return `<article class="card"><div class="thumb" style="background:${catBg(p.cat)}">${off ? `<span class="badge">${off}% off</span>` : ""}</div>` +
    `<div class="body"><h3>${esc(prettyName(p.name))}</h3><span class="tam">${esc(p.ta || "")}</span>` +
    `<span class="unit">${esc(unitOf(p))}${p.pack ? ` · Pack ${esc(p.pack)}` : ""}</span>` +
    `<span class="price"><span class="now">${money(p.price)}</span>${p.mrp > p.price ? `<span class="was">${money(p.mrp)}</span>` : ""}</span>` +
    `${inStock(p) ? "" : `<div class="foot"><button class="btn-add" disabled>Out of stock</button></div>`}</div></article>`;
}
const cards = list => "\n" + list.map(card).join("\n") + "\n";
function catCards() {
  return "\n" + CATS.map(c => {
    const img = CATPHOTO[c] ? `<img src="${esc(String(CATPHOTO[c]).replace(/^.*?(assets\/)/, "$1"))}" alt="" loading="lazy">` : "";
    return `<a class="catcard" href="${catPath(c)}"><span class="cc-img" style="background:${catBg(c)}"><span class="cc-icon">${catIcon(c)}</span>${img}</span><b>${esc(c)}</b><small>${COUNTS[c]} items</small></a>`;
  }).join("\n") + "\n";
}
function featured() {
  const staples = P.filter(p => inStock(p) && FEATURE_CATS.includes(p.cat) && p.price >= 20).sort((a, b) => hash(b.id) - hash(a.id));
  const deals = P.filter(p => inStock(p) && FEATURE_CATS.includes(p.cat) && discount(p) > 0).sort((a, b) => discount(b) - discount(a));
  return { popular: roundRobin(staples, 12), offers: roundRobin(deals, 12) };
}
function footLinks() {
  return `<div class="wrap ftr-seo">
    <div><h4>Shop by category</h4><p>${LIST_CATS.map(c => `<a href="${catPath(c)}">${esc(c)}</a>`).join("")}</p></div>
    <div><h4>Grocery delivery in</h4><p>${AREAS.map(a => `<a href="delivery/${a.slug}/">${esc(a.name)}</a>`).join("")}<a href="wholesale/">Wholesale &amp; bulk orders</a></p></div>
  </div>`;
}
const crumbs = items => `<nav class="crumbs lp-crumbs" aria-label="Breadcrumb">${items.map((it, i) =>
  (it.href ? `<a href="${it.href}">${esc(it.name)}</a>` : `<span>${esc(it.name)}</span>`) + (i < items.length - 1 ? `<span aria-hidden="true">›</span>` : "")).join("")}</nav>`;
const waLink = msg => `https://wa.me/${SITE.wa}?text=${encodeURIComponent(msg)}`;
const ctaRow = (msg) => `<div class="lp-cta">
      <a class="btn btn-gold" href="#allSection" data-view-all>Shop groceries</a>
      <a class="btn btn-ghost" href="${waLink(msg)}" target="_blank" rel="noopener">Order on WhatsApp</a>
      <a class="btn btn-ghost" href="tel:${SITE.phone}">Call ${SITE.phoneShow}</a>
    </div>`;
const faqHtml = qa => `<div class="faq-list lp-faq">${qa.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>`;

/* ------------------------------------------------------------ JSON-LD */
const STORE_ID = abs("#store");
function storeLd() {
  const ld = {
    "@context": "https://schema.org", "@type": "GroceryStore", "@id": STORE_ID,
    name: SITE.name, alternateName: SITE.nameTa,
    image: [abs("assets/img/logo.png"), abs("assets/img/hero-bg.jpg")].filter(u => fs.existsSync(path.join(ROOTDIR, u.slice(SITE.url.length)))),
    logo: abs("assets/img/logo.png"),
    url: SITE.url, telephone: SITE.phone, priceRange: "₹",
    address: { "@type": "PostalAddress", streetAddress: SITE.street, addressLocality: SITE.locality, addressRegion: SITE.region, postalCode: SITE.postal, addressCountry: "IN" },
    hasMap: SITE.mapsUrl,
    areaServed: [{ "@type": "City", name: "Cuddalore" }, ...AREAS.map(a => ({ "@type": "Place", name: `${a.name}, Cuddalore District` }))],
    openingHoursSpecification: SITE.hours.map(h => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    paymentAccepted: "Cash, UPI", currenciesAccepted: "INR",
    hasOfferCatalog: { "@type": "OfferCatalog", name: "Grocery categories",
      itemListElement: LIST_CATS.map(c => ({ "@type": "OfferCatalog", name: c, url: abs(catPath(c)) })) },
  };
  if (SITE.geo) ld.geo = { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng };
  return ld;
}
const breadcrumbLd = items => ({ "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })) });
const faqLd = qa => ({ "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
const ldScript = o => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2).replace(/</g, "\\u003c")}\n</script>`;

/* ------------------------------------------------------------ <head> */
function head(pg) {
  const url = abs(pg.path);
  const img = abs(pg.ogImage || SITE.ogImage);
  return `<title>${esc(pg.title)}</title>
<meta name="description" content="${esc(pg.desc)}">
<meta name="robots" content="${pg.noindex ? "noindex, follow" : "index, follow"}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(pg.title)}">
<meta property="og:description" content="${esc(pg.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pg.title)}">
<meta name="twitter:description" content="${esc(pg.desc)}">
<meta name="twitter:image" content="${img}">
<meta name="geo.region" content="IN-TN">
<meta name="geo.placename" content="${esc(pg.place || "Cuddalore")}">${SITE.geo ? `
<meta name="geo.position" content="${SITE.geo.lat};${SITE.geo.lng}">
<meta name="ICBM" content="${SITE.geo.lat}, ${SITE.geo.lng}">` : ""}${pg.preload || ""}
${pg.ld.map(ldScript).join("\n")}
`;
}

/* ------------------------------------------------------------ pages */
const HOME_FAQ = [
  ["Does A.R. Abi Traders deliver in Cuddalore?", "Yes — we deliver the same day across Cuddalore, including Manjakuppam and nearby areas. Delivery is free on orders above ₹500, and a small ₹40 fee applies below that."],
  ["What are your store timings?", "We're open Monday to Saturday, 9am to 10pm, and Sunday 9am to 2pm."],
  ["Can I pay cash on delivery?", "Yes — Cash on Delivery is available, along with UPI / GPay / PhonePe."],
  ["Where is the shop located?", `${SITE.street}, ${SITE.locality} – ${SITE.postal}. Call us anytime at ${SITE.phoneShow}.`],
  ["Can I order in Tamil?", "Yes — switch the language toggle to தமிழ் anywhere on the site, or just use the voice search button to search by speaking."],
];

function homePage(F) {
  return {
    path: "", file: "index.html", kind: "",
    title: "A.R. Abi Traders — Online Grocery Store, Cuddalore",
    desc: `Order groceries online from A.R. Abi Traders, Cuddalore — rice, oil, spices, snacks & ${(Math.floor(P.length / 100) * 100).toLocaleString("en-IN")}+ daily essentials at honest prices. Cash on delivery, same-day.`,
    preload: `\n<link rel="preload" as="image" href="assets/img/hero-products.jpg?v=2" fetchpriority="high">`,
    ld: [storeLd(), { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, alternateName: SITE.nameTa, url: SITE.url }, faqLd(HOME_FAQ)],
    regions: { landing: "", cats: catCards(), popular: cards(F.popular), offers: cards(F.offers), all: cards(P.slice().sort(popSort).slice(0, 24)) },
  };
}

function categoryPage(c) {
  const list = P.filter(p => p.cat === c);
  const top = list.filter(inStock).sort(popSort);
  const priced = list.filter(p => p.price > 0).map(p => p.price);
  const lo = Math.min(...priced), hi = Math.max(...priced);
  const p0 = catPath(c);
  const byName = list.slice().sort((a, b) => prettyName(a.name).localeCompare(prettyName(b.name)));
  const photo = CATPHOTO[c] ? String(CATPHOTO[c]).replace(/^.*?(assets\/)/, "$1") : null;
  const landing = `
<section class="landing wrap" data-landing>
  ${crumbs([{ name: "Home", href: "./" }, { name: c }])}
  <h1>${esc(c)} <span class="lp-ta" lang="ta">${esc(catTa(c))}</span></h1>
  <p class="lp-lede">Buy ${esc(c.toLowerCase())} online from ${esc(SITE.name)}, Manjakuppam, Cuddalore. ${esc(CAT_COPY[c] || "")}</p>
  <p class="lp-meta">${list.length} products · ${money(lo)} – ${money(hi)} · Same-day delivery in Cuddalore · Cash on delivery or UPI</p>
</section>`;
  const priceList = `
<section class="block wrap pricelist" id="priceList" data-landing aria-labelledby="plTitle">
  <h2 id="plTitle">${esc(c)} price list — Cuddalore</h2>
  <p class="sub">All ${list.length} ${esc(c.toLowerCase())} products we stock. Tap a product to add it to your cart. Prices are refreshed live from the shop.</p>
  <div class="pl-wrap"><table>
    <thead><tr><th scope="col">Product</th><th scope="col" lang="ta">தமிழ்</th><th scope="col">Size</th><th scope="col">Price</th><th scope="col">MRP</th></tr></thead>
    <tbody>
${byName.map(p => `    <tr data-pid="${p.id}"${inStock(p) ? "" : ` class="pl-oos"`}><td><button class="pl-name" data-open="${p.id}">${esc(prettyName(p.name))}</button></td><td lang="ta">${esc(p.ta || "")}</td><td>${esc(unitOf(p))}</td><td class="pl-price">${money(p.price)}</td><td>${p.mrp > p.price ? money(p.mrp) : ""}</td></tr>`).join("\n")}
    </tbody>
  </table></div>
</section>`;
  return {
    path: p0, file: p0 + "index.html", kind: "cat", cat: c, noindex: NOINDEX_CATS.has(c),
    title: `${c} — Buy Online in Cuddalore | ${SITE.name}`,
    desc: `Buy ${c.toLowerCase()} online in Cuddalore — ${list.length} products from ${money(lo)}${CAT_COPY[c] ? `: ${CAT_COPY[c].split(" — ")[0].replace(/[.,]$/, "")}` : ""}. Same-day delivery from ${SITE.name}, Manjakuppam. COD/UPI.`,
    ogImage: photo,
    ld: [breadcrumbLd([{ name: "Home", path: "" }, { name: c, path: p0 }]),
      { "@context": "https://schema.org", "@type": "CollectionPage", name: `${c} — ${SITE.name}`, url: abs(p0), about: c,
        isPartOf: { "@type": "WebSite", url: SITE.url, name: SITE.name }, provider: { "@id": STORE_ID },
        mainEntity: { "@type": "ItemList", numberOfItems: list.length,
          itemListElement: top.slice(0, 30).map((p, i) => ({ "@type": "ListItem", position: i + 1, name: prettyName(p.name) })) } },
      storeLd()],
    regions: { landing, cats: catCards(), popular: "", offers: "", all: cards(list.slice().sort(popSort).slice(0, 24)), after: priceList },
  };
}

function areaPage(a, F) {
  const p0 = `delivery/${a.slug}/`;
  const where = a.near ? `${a.name}, Cuddalore` : a.name;
  const qa = [
    [`Do you deliver groceries in ${a.name}?`, a.near
      ? `Yes. We deliver across ${a.name} the same day during shop hours (${SITE.hoursText}). Delivery is free on orders above ₹500; a ₹40 fee applies below that.`
      : `Yes. Place your order online or on WhatsApp and we'll confirm the delivery time and any delivery charge for ${a.name} when we confirm your order.`],
    [`How do I pay?`, "Cash on Delivery, or UPI (GPay / PhonePe / Paytm) when the order arrives."],
    [`Can shops in ${a.name} buy at wholesale prices?`, `Yes — retailers, hotels, caterers and institutions in ${a.name} can send a bulk enquiry and we'll share wholesale rates with GST billing.`],
    [`Where is your shop?`, `${SITE.street}, ${SITE.locality} – ${SITE.postal}. Phone ${SITE.phoneShow}.`],
  ];
  const landing = `
<section class="landing wrap">
  ${crumbs([{ name: "Home", href: "./" }, { name: "Delivery areas" }, { name: a.name }])}
  <h1>Grocery delivery in ${esc(where)} <span class="lp-ta" lang="ta">${esc(a.ta)} — மளிகை வீட்டு டெலிவரி</span></h1>
  <p class="lp-lede">${esc(a.intro)}</p>
  <ul class="lp-points">
    <li><b>${P.length.toLocaleString("en-IN")}+ products</b>rice, oil, dal, masala, snacks, home &amp; personal care</li>
    <li><b>${a.near ? "Same-day delivery" : "Delivery on confirmation"}</b>${esc(a.extra)}</li>
    <li><b>Cash on Delivery or UPI</b>pay when your groceries arrive</li>
    <li><b>Order in English or தமிழ்</b>or just call / WhatsApp your list</li>
  </ul>
  ${ctaRow(`Hello AR Abi Traders, I'd like to order groceries for delivery in ${a.name}.`)}
  <h2 class="lp-h2">Questions from ${esc(a.name)} customers</h2>
  ${faqHtml(qa)}
</section>`;
  return {
    path: p0, file: p0 + "index.html", kind: "area", place: a.name,
    title: `Grocery Delivery in ${where} | ${SITE.name}`,
    desc: `Order groceries online for delivery in ${where} — rice, oil, dal, masala & ${(Math.floor(P.length / 100) * 100).toLocaleString("en-IN")}+ essentials from ${SITE.name}, Manjakuppam. ${a.near ? "Same-day delivery. " : ""}Cash on delivery or UPI.`,
    ld: [breadcrumbLd([{ name: "Home", path: "" }, { name: `Grocery delivery in ${a.name}`, path: p0 }]),
      { "@context": "https://schema.org", "@type": "WebPage", name: `Grocery delivery in ${where}`, url: abs(p0),
        about: { "@id": STORE_ID }, spatialCoverage: { "@type": "Place", name: `${a.name}, Cuddalore District, Tamil Nadu` } },
      faqLd(qa), storeLd()],
    regions: { landing, cats: catCards(), popular: cards(F.popular), offers: cards(F.offers), all: cards(P.slice().sort(popSort).slice(0, 24)) },
  };
}

function wholesalePage() {
  const p0 = "wholesale/";
  const qa = [
    ["Who can buy at wholesale prices?", "Retail shops, supermarkets, hotels, restaurants, caterers, hostels, institutions and anyone buying in bulk."],
    ["Do you provide GST bills?", "Yes — A.R. Abi Traders is a GST-registered business and every wholesale order gets a proper GST invoice."],
    ["How do I get a price quote?", "Fill in the enquiry form below (it opens WhatsApp with your list), or call us. We reply with rates and availability quickly."],
    ["Do you deliver bulk orders outside Cuddalore?", "Yes — we supply businesses across Cuddalore district including Nellikuppam and Panruti. Delivery terms are confirmed with your quote."],
  ];
  const landing = `
<section class="landing wrap ws">
  ${crumbs([{ name: "Home", href: "./" }, { name: "Wholesale" }])}
  <span class="lp-eyebrow">GST registered wholesale business</span>
  <h1>Wholesale grocery supplier in Cuddalore <span class="lp-ta" lang="ta">மொத்த மளிகை விற்பனை — கடலூர்</span></h1>
  <p class="lp-lede">${esc(SITE.name)} supplies quality groceries, FMCG products and essentials to retailers, supermarkets, hotels, caterers and bulk buyers across Cuddalore district — at competitive wholesale prices with transparent GST billing.</p>
  <ul class="lp-points">
    <li><b>Bulk pricing</b>best market rates on large quantities</li>
    <li><b>GST billing</b>proper invoices on every order</li>
    <li><b>Timely delivery</b>so your business never runs out of stock</li>
    <li><b>Quality assurance</b>branded and trusted local products</li>
  </ul>

  <div class="ws-grid">
    <div class="ws-col">
      <h2 class="lp-h2">Wholesale product range</h2>
      <div class="ws-ranges">
${WHOLESALE.ranges.map(r => `        <div class="ws-range"><b>${esc(r.cat)}</b><p>${esc(r.items)}</p><a href="${waLink(`Hello AR Abi Traders, I want wholesale price for products in ${r.cat} category`)}" target="_blank" rel="noopener">Ask for ${esc(r.cat.toLowerCase())} rates →</a></div>`).join("\n")}
      </div>
      <h2 class="lp-h2">Brands we deal with</h2>
      <p class="ws-brands">${WHOLESALE.brands.map(b => `<span>${esc(b)}</span>`).join("")}</p>
    </div>

    <form class="ws-form" id="wsForm" novalidate aria-labelledby="wsFormTitle">
      <h2 class="lp-h2" id="wsFormTitle">Send a bulk enquiry</h2>
      <p class="sub">Your enquiry opens in WhatsApp, ready to send. We reply with prices and availability.</p>
      <label>Your name *<input name="name" autocomplete="name" required></label>
      <label>Shop / business name<input name="business" autocomplete="organization"></label>
      <label>Mobile number *<input name="phone" type="tel" inputmode="numeric" autocomplete="tel" required></label>
      <label>Town / area<input name="area" placeholder="e.g. Panruti"></label>
      <label>Products &amp; quantities *<textarea name="items" rows="4" required placeholder="e.g. Ponni rice 25kg × 10 bags, Sunflower oil 15L × 4 tins"></textarea></label>
      <p class="ws-err">Please fill your name, a 10-digit mobile number and the products you need.</p>
      <button class="btn btn-gold btn-block" type="submit">Send enquiry on WhatsApp</button>
      <p class="ws-or">or call <a href="tel:${SITE.phone}">${SITE.phoneShow}</a> · <a href="tel:${SITE.phone2}">${SITE.phone2Show}</a><br>${esc(SITE.hoursText)}</p>
    </form>
  </div>

  <h2 class="lp-h2">Wholesale FAQs</h2>
  ${faqHtml(qa)}
</section>`;
  return {
    path: p0, file: p0 + "index.html", kind: "wholesale",
    title: `Wholesale Grocery Supplier in Cuddalore | ${SITE.name}`,
    desc: `GST-registered wholesale grocery & FMCG supplier in Cuddalore — rice, pulses, oil, spices, beverages for shops, hotels, caterers and institutions. Bulk prices, timely delivery.`,
    ogImage: fs.existsSync(path.join(ROOTDIR, "assets/img/wholesale-warehouse.jpg")) ? "assets/img/wholesale-warehouse.jpg" : null,
    ld: [breadcrumbLd([{ name: "Home", path: "" }, { name: "Wholesale", path: p0 }]),
      { "@context": "https://schema.org", "@type": "WebPage", name: "Wholesale grocery supplier in Cuddalore", url: abs(p0), about: { "@id": STORE_ID } },
      faqLd(qa), storeLd()],
    regions: { landing, cats: catCards(), popular: "", offers: "", all: cards(P.slice().sort(popSort).slice(0, 24)) },
  };
}

/* ------------------------------------------------------------ assemble */
function fill(html, name, content) {
  const re = new RegExp(`<!--ssr:${name}-->[\\s\\S]*?<!--/ssr:${name}-->`);
  if (!re.test(html)) throw new Error(`index.html is missing the <!--ssr:${name}--> marker`);
  return html.replace(re, () => `<!--ssr:${name}-->${content}<!--/ssr:${name}-->`);
}
function render(tpl, pg) {
  let h = tpl;
  h = fill(h, "head", "\n" + head(pg));
  for (const r of ["landing", "cats", "popular", "offers", "all"]) h = fill(h, r, pg.regions[r] ?? "");
  h = fill(h, "footlinks", footLinks());
  h = fill(h, "page", pg.kind ? `<script>window.PAGE=${JSON.stringify({ kind: pg.kind, cat: pg.cat || "" })}</script>` : "");
  if (pg.kind) {
    h = h.replace(/<body class="store[^"]*">/, `<body class="store pg-sub pg-${pg.kind}">`);
    h = h.replace(/<h1 id="heroTitle">([\s\S]*?)<\/h1>/, `<p id="heroTitle">$1</p>`);   // the landing has the page's H1
    if (pg.regions.after) h = h.replace(/\n  <!-- FAQ -->/, m => pg.regions.after + m);
    // sub-pages live 1–2 folders deep: make every relative link/asset point back at the site root
    const depth = pg.path.split("/").filter(Boolean).length;
    const up = "../".repeat(depth);
    h = h.replace(/(\s(?:href|src))="(?!https?:|\/\/|\/|#|tel:|mailto:|data:|javascript:|\.\.?\/)([^"]*)"/g, `$1="${up}$2"`);
    h = h.replace(/(\s(?:href|src))="\.\/"/g, `$1="${up}"`);
  }
  return h;
}

const TPL_FILE = path.join(ROOTDIR, "index.html");
const tpl = fs.readFileSync(TPL_FILE, "utf8");
if (/<!--ssr:head-->/.test(tpl) === false) throw new Error("index.html has no <!--ssr:head--> marker");
const F = featured();
const pages = [homePage(F), wholesalePage(), ...CATS.map(categoryPage), ...AREAS.map(a => areaPage(a, F))];

// clear previously generated folders so renamed categories/areas don't leave stale pages behind
for (const dir of ["category", "delivery"]) fs.rmSync(path.join(ROOTDIR, dir), { recursive: true, force: true });

for (const pg of pages) {
  const out = path.join(ROOTDIR, pg.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(tpl, pg));
}

const sm = pages.filter(p => !p.noindex).map(p => `  <url>
    <loc>${abs(p.path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.kind === "cat" || !p.kind ? "daily" : "weekly"}</changefreq>
    <priority>${!p.kind ? "1.0" : p.kind === "cat" ? "0.8" : "0.7"}</priority>
  </url>`).join("\n");
fs.writeFileSync(path.join(ROOTDIR, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOTDIR, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin.html\n\nSitemap: ${abs("sitemap.xml")}\n`);

// a redirect-only site to deploy over the old Netlify bulk-enquiry site (ar-abi-traders-cuddalore.netlify.app),
// so its visitors and its Google ranking pass to /wholesale/ on the main domain
const OLD = path.join(ROOTDIR, "deploy/old-netlify-bulk-site");
fs.mkdirSync(OLD, { recursive: true });
fs.writeFileSync(path.join(OLD, "_redirects"), `/*  ${abs("wholesale/")}  301!\n`);
fs.writeFileSync(path.join(OLD, "index.html"), `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Moved — ${esc(SITE.name)} Wholesale</title>
<link rel="canonical" href="${abs("wholesale/")}"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${abs("wholesale/")}"></head>
<body><p>Our wholesale page has moved to <a href="${abs("wholesale/")}">${abs("wholesale/")}</a>.</p></body></html>
`);

console.log(`Built ${pages.length} pages for ${SITE.url}`);
for (const p of pages) console.log(`  /${p.path}${p.noindex ? "   (noindex)" : ""}`);
