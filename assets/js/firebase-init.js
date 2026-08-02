/* ============================================================
   FIREBASE — shared order database for A.R. Abi Traders
   ------------------------------------------------------------
   HOW TO CONNECT YOUR OWN FIREBASE PROJECT (one-time, ~5 min):
   1. Go to https://console.firebase.google.com → Add project (free, no card).
   2. In the project, click the </> (web) icon → register an app (any nickname).
   3. Firebase shows you a `firebaseConfig = {...}` object — copy those values
      into FIREBASE_CONFIG below (apiKey, authDomain, projectId, etc).
   4. Left sidebar → Build → Firestore Database → Create database →
      start in "production mode" → pick a region close to India (e.g. asia-south1).
   5. Firestore → Rules tab → paste the rules from `firestore.rules.txt`
      (included in this project) → Publish.
   6. Left sidebar → Build → Authentication → Sign-in method → enable
      "Email/Password". Then Users tab → Add user → enter the email/password
      YOU (the shop owner) will use to log into admin.html.
   That's it — index.html and admin.html both read this file and just work.
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAog9MOVJTKzqqU0Vmtqgm7GnDUjRcOiAo",
  authDomain: "ar-abi-traders.firebaseapp.com",
  projectId: "ar-abi-traders",
  storageBucket: "ar-abi-traders.firebasestorage.app",
  messagingSenderId: "414032700541",
  appId: "1:414032700541:web:5b6919a7b8b7cef1353d14",
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, updateDoc,
  onSnapshot, query, orderBy, where, serverTimestamp, limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const configured = window.FIREBASE_CONFIG.apiKey && !window.FIREBASE_CONFIG.apiKey.startsWith("PASTE_");
let app, db, auth, storage;
if (configured) {
  app = initializeApp(window.FIREBASE_CONFIG);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} else {
  console.warn("[A.R. Abi] Firebase is not configured yet — see assets/js/firebase-init.js. " +
    "Order tracking / admin sync will not work until FIREBASE_CONFIG is filled in.");
}

window.ARFire = {
  ready: configured,
  db, auth, storage,
  collection, doc, setDoc, getDoc, updateDoc, onSnapshot, query, orderBy, where, serverTimestamp, limit,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  storageRef, uploadBytes, getDownloadURL,
};
window.dispatchEvent(new Event("arfire-ready"));
