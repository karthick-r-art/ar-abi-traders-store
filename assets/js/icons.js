/* ============================================================
   A.R. ABI TRADERS — shared line-icon set
   Same stroke style as the header icons (viewBox 24x24, currentColor).
   Used instead of emoji everywhere in the storefront and admin so the
   UI reads as one consistent, professional icon system.
   ============================================================ */
(function(){
const s = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico-svg">${inner}</svg>`;

const ICONS = {
  cup:        s(`<path d="M6.5 8h11l-1.1 10.5a2 2 0 0 1-2 1.5h-4.8a2 2 0 0 1-2-1.5z"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>`),
  milk:       s(`<path d="M9 3h6l1 3v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6z"/><path d="M8 6.5h8"/><path d="M12 3v1.5"/>`),
  grain:      s(`<path d="M7.5 8h9l1 4-1.2 8a2 2 0 0 1-2 1.8h-4.6a2 2 0 0 1-2-1.8L6.5 12z"/><path d="M7.5 8L8.5 4h7l1 4"/>`),
  bowl:       s(`<path d="M4 11h16a8 8 0 0 1-16 0z"/><circle cx="9" cy="8.6" r=".6" fill="currentColor" stroke="none"/><circle cx="12" cy="7.2" r=".6" fill="currentColor" stroke="none"/><circle cx="15" cy="8.6" r=".6" fill="currentColor" stroke="none"/>`),
  droplet:    s(`<path d="M12 3c3.2 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-6.8 6-11z"/>`),
  chili:      s(`<path d="M5.5 6c4.5-2.2 11 .3 13 6.3-1 6.3-8.5 9.5-11.8 6.3-2.2-2.2-1.2-6.3.8-8.6"/><path d="M5.5 6c-1-2 0-3.2 1.3-3.2"/>`),
  choco:      s(`<rect x="4" y="8" width="16" height="8" rx="1.6"/><path d="M9.3 8v8M14.7 8v8M4 12h16"/>`),
  cookie:     s(`<circle cx="12" cy="12" r="8.2"/><circle cx="9.2" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="14.4" cy="9.2" r=".9" fill="currentColor" stroke="none"/><circle cx="15.2" cy="14.2" r=".9" fill="currentColor" stroke="none"/><circle cx="10" cy="15" r=".9" fill="currentColor" stroke="none"/>`),
  bottle:     s(`<path d="M10 3h4v3l1 1.2v12.3a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7.2L10 6z"/><path d="M8.7 11h6.6"/>`),
  spray:      s(`<path d="M9.5 7h3.5l1-2h2.3"/><path d="M9.5 7v2l-2 2v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-9l-2-2V7"/>`),
  lotion:     s(`<rect x="8" y="8" width="8" height="13" rx="2"/><rect x="10" y="4" width="4" height="4" rx="1"/>`),
  leaf:       s(`<path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z"/><path d="M6.3 17.7C9 15 12 12 17 7"/>`),
  pencil:     s(`<path d="M4 20l.9-3.8L15.6 4.9l3.5 3.5L8.4 19.1z"/><path d="M13.9 6.6l3.5 3.5"/>`),
  cart:       s(`<circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/><path d="M2 3h3l2.4 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/>`),
  home:       s(`<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/>`),
  search:     s(`<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>`),
  chat:       s(`<path d="M4 5h16v11H9l-5 4z"/>`),
  bolt:       s(`<path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5z"/>`),
  cash:       s(`<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9v0M17.5 15v0"/>`),
  mobile:     s(`<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>`),
  package:    s(`<path d="M3 8 12 3l9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>`),
  pin:        s(`<path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>`),
  phone:      s(`<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 5 5.1 1.5 1.5 0 0 1 6.5 3.5z"/>`),
  basket:     s(`<path d="M4 9h16l-1.5 9.5a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7z"/><path d="M8 9c0-3.5 2-5.5 4-5.5S16 5.5 16 9"/>`),
  sun:        s(`<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/>`),
  moon:       s(`<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>`),
  check:      s(`<path d="M4 12.5 9.5 18 20 6"/>`),
  close:      s(`<path d="M6 6l12 12M18 6 6 18"/>`),
  mic:        s(`<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>`),
  boxes:      s(`<path d="M3 8 12 4l9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/>`),
  folder:     s(`<path d="M3 6.5a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>`),
  receipt:    s(`<path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6z"/><path d="M9 8h6M9 12h6"/>`),
  sunrise:    s(`<path d="M12 3v4"/><path d="M5 12a7 7 0 0 1 14 0"/><path d="M2 12h2M20 12h2M4.5 6.5l1.4 1.4M19.5 6.5l-1.4 1.4"/><path d="M2 16h20"/>`),
  hourglass:  s(`<path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 4 6 5 8-1 2-5 3-5 8M17 3c0 5-4 6-5 8 1 2 5 3 5 8"/>`),
  coins:      s(`<circle cx="9" cy="9" r="5.5"/><path d="M14 9.3A5.5 5.5 0 1 1 9 20a5.5 5.5 0 0 1-1.6-.3"/>`),
  alertOct:   s(`<path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7z"/><path d="M12 8v5"/><circle cx="12" cy="16.3" r=".2" fill="currentColor" stroke="none"/>`),
  warehouse:  s(`<path d="M3 21V9l9-5 9 5v12"/><path d="M3 21h18"/><path d="M9 21v-7h6v7"/>`),
  camera:     s(`<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>`),
  bulb:       s(`<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9v.2h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"/>`),
  praying:    s(`<path d="M12 3v18"/><path d="M8 6c0 3-1.5 4-3.5 4M16 6c0 3 1.5 4 3.5 4"/><path d="M6 10c1 4 3 6 6 7 3-1 5-3 6-7"/>`),
  trash:      s(`<path d="M4 7h16"/><path d="M9 7V4.8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7"/><path d="M6.5 7l1 12.5a2 2 0 0 0 2 1.9h5a2 2 0 0 0 2-1.9L17.5 7"/><path d="M10 11v6M14 11v6"/>`),
};

/* one icon per grocery category, used instead of CATMETA.em everywhere */
const CATICON = {
  "Beverages":            "cup",
  "Dairy & Ghee":          "milk",
  "Rice & Atta":           "grain",
  "Dal & Pulses":          "bowl",
  "Oils":                  "droplet",
  "Masala & Spices":       "chili",
  "Chocolates & Candy":    "choco",
  "Snacks & Biscuits":     "cookie",
  "Baby Care":             "bottle",
  "Home Care":             "spray",
  "Personal Care":         "lotion",
  "Tobacco & Pan":         "leaf",
  "Stationery & General":  "pencil",
  "General Store":         "cart",
};

window.ICONS = ICONS;
window.icon = (name) => ICONS[name] || ICONS.cart;
window.CATICON = CATICON;
window.catIcon = (catName) => ICONS[CATICON[catName]] || ICONS.cart;
})();
