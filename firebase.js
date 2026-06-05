import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1QB3qaFfkGYq0OWOEAr83V25NAPFwxzs",
  authDomain: "fullmark-2025.firebaseapp.com",
  databaseURL: "https://fullmark-2025-default-rtdb.firebaseio.com",
  projectId: "fullmark-2025",
  storageBucket: "fullmark-2025.firebasestorage.app",
  messagingSenderId: "963956202032",
  appId: "1:963956202032:web:4df914457d79b75dee2bf5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
