# A.R. Abi Traders — Online Grocery Store (Demo)

A working bilingual e-commerce storefront **plus** an admin dashboard for A.R. Abi Traders,
Cuddalore. Built from the shop's real 1,823-product list, with corrected Tamil names,
product illustrations, cart, checkout, WhatsApp ordering and order tracking.

Both the customer store and the owner admin live in **one folder** = **one website**.

---

## The two pages (one site)
| Page | URL after deploy | Who uses it |
|---|---|---|
| Storefront | `https://your-site.netlify.app/`         | Customers |
| Admin      | `https://your-site.netlify.app/admin.html` | Shop owner |

They share the same deploy, so hosting one hosts the other (see **Hosting** below).

## Run locally
Double-click `index.html`, or:
```
cd ar-abi-store
python3 -m http.server 8080      # http://localhost:8080  (store)
                                 # http://localhost:8080/admin.html  (admin)
```

## Hosting — both together, in one place
The whole point: **one folder → one Netlify site → both pages on the same domain.**

1. Go to app.netlify.com → **Add new site → Deploy manually**.
2. Drag the entire `ar-abi-store` folder onto the page.
3. You get one URL, e.g. `ar-abi-traders.netlify.app`.
   - Customers use that URL.
   - You use the same URL + `/admin.html`.

So the storefront and admin are always on the same connection/domain — no second
site, no separate hosting. If you connect a Git repo instead of dragging, set the
**publish directory to the project root**; `netlify.toml` is already included.

> The admin page has **no password yet** — anyone with the `/admin.html` link can open it.
> That's fine for demos. A real login comes with the Phase-2 backend (below).

---

## Features
**Storefront:** category browse, English/Tamil search, product illustrations, quick-view,
cart (free delivery over ₹500), checkout (Cash on Delivery / UPI), live order tracker,
**send-order-to-WhatsApp**, English⇄தமிழ் toggle, light/dark mode, device memory.

**Admin:** KPIs (products, orders, revenue, out-of-stock, inventory value), order list with
status control, product search + inline price/stock edit, show/hide products.

## Tamil names — how they were fixed
The Tamil column in the original `.xls` was stored in a **legacy Bamini font**, so it looked
like gibberish (`krhyh`, `cg;g[`). Standard converters got it wrong because this font uses
special codes: `[`=ு, `{`=ூ, `!`=ஸ, `~`=ஞ, `%`=₹, `O`=டீ, and the pre-base vowel signs
(ெ ே ை) sit **before** the consonant. The converter (`scripts/tamil_converter.py`) fixes all
of these, so names now read correctly: `கருப்பு உப்பு`, `பாரி சர்க்கரை`, `மசாலா டீ`, `மிளகு`.

~1,393 products decode to clean Tamil. For the rest (odd brand spellings), the Tamil is left
blank and the clean **English name shows instead** — so a customer never sees a broken word.
The owner can review/add those later. The corrected names are in
`data/AR_ABI_Products_CLEANED.xlsx`.

## Product images
Every product shows a **type-matched illustration** (oil bottle, rice sack, spice packet, soap,
etc.) drawn from `assets/js/art.js` — clean, fast, and always correct offline.

**To use real photos** (any/all products):
1. Put a photo at `assets/img/products/<product-id>.jpg` (id = the Code column).
2. In `assets/js/store.js`, add those ids to `window.PRODUCT_PHOTOS`,
   e.g. `window.PRODUCT_PHOTOS = new Set([1227, 130, 131]);`
3. Those products now show the photo; everything else keeps its illustration.

## Prices & categories
Selling price = the shop's RRate; MRP shown struck-through when higher (the discount).
The source had no categories, so all products were auto-sorted into 14 grocery categories
(General Store is the catch-all — the shop is a general merchant).

---

## Files
```
ar-abi-store/
├── index.html               storefront
├── admin.html               owner dashboard
├── assets/
│   ├── css/style.css         design system (light + dark)
│   ├── js/  i18n.js art.js data.js store.js
│   └── img/ logo.svg favicon.svg  (products/ ← drop real photos here)
├── data/
│   ├── products.json / .csv
│   └── AR_ABI_Products_CLEANED.xlsx   ← fixed Tamil + clear prices
├── scripts/  build_data.py, tamil_converter.py
└── netlify.toml
```

## Order confirmation & live tracking — one-time setup (Firebase)
Previously, an order placed on the storefront only ever lived in that customer's own browser
(`localStorage`), and the admin dashboard read its own separate copy. That meant admin's
"Confirmed" click never reached the customer — there was no real link between the two pages.

This is now fixed with a free Firebase (Firestore + Authentication) backend that both pages share:
- Customer places an order → it's saved to a shared cloud database, not just their browser.
- Customer's confirmation page **and** a "📦 Track my order" page (header icon / footer link,
  works from any device using order number + mobile number) **live-update** the instant you
  change the order's status in admin — no refresh, no WhatsApp round-trip needed to know you've
  seen it.
- `admin.html` now requires login (Firebase Authentication), so "Confirmed" is a trustworthy
  signal — not something anyone with the admin link could fake.

**Setup (~5 minutes, free, no credit card):**
1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. In the project → click the **`</>`** (web) icon → register an app (any nickname, no hosting needed).
3. Firebase shows a `firebaseConfig` object. Copy those values into
   `assets/js/firebase-init.js` → `window.FIREBASE_CONFIG`.
4. Sidebar → **Build → Firestore Database → Create database** → start in **production mode** →
   pick a region near your customers (e.g. `asia-south1`).
5. Firestore → **Rules** tab → paste the contents of `firestore.rules.txt` (included in this
   project) → **Publish**.
6. Sidebar → **Build → Authentication → Sign-in method** → enable **Email/Password**. Then
   **Users** tab → **Add user** → set the email/password *you* (the shop owner) will log into
   `admin.html` with.

That's it — reload both pages. Until you do this, both pages keep working exactly as before
(local-only demo data, no login), with a banner on `admin.html` reminding you it's not connected yet.

## Phase 2 — production (from your requirements)
Mobile app (React Native) + Admin (React/TS) + **one** Java Spring Boot backend + MySQL, so the
app and the admin panel talk to the **same server/database** — the same "one connection" idea,
one level up. Seed the DB from `data/products.csv`. Add mobile-OTP login, Firebase + WhatsApp
notifications, image hosting (Cloudinary/S3), and Razorpay for online payments.
