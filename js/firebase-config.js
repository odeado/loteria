// ===================================================================
// LOTO DIGITAL — Conexión con Firebase (Realtime Database)
// Guarda el historial de cartones en la nube y sincroniza la tómbola
// en vivo entre celulares (por código de sala).
//
// Este archivo es un módulo ES (import/export). El resto de la app
// (carton.js, historial.js, tombola.js, app.js) son scripts clásicos
// para poder seguir usando onclick="..." en el HTML sin convertir todo
// a módulos. Por eso, en vez de "exportar" cosas al estilo módulo,
// las dejamos colgadas de window.fb para que cualquier otro script
// las pueda usar, y avisamos con el evento 'firebase-listo' cuando
// ya están disponibles.
// ===================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
    getDatabase, ref, set, get, push, onValue, off, remove, runTransaction
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAqLu7YlbDn2AkKXjihLVU8bzy4Fb61V7c",
    authDomain: "juegos-online-99b20.firebaseapp.com",
    databaseURL: "https://juegos-online-99b20-default-rtdb.firebaseio.com",
    projectId: "juegos-online-99b20",
    storageBucket: "juegos-online-99b20.firebasestorage.app",
    messagingSenderId: "942532179041",
    appId: "1:942532179041:web:eee067b965e74b4a26a620"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.fb = { db, ref, set, get, push, onValue, off, remove, runTransaction };
window.dispatchEvent(new Event('firebase-listo'));
