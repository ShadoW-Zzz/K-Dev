import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAD5W3bNgB5SU9jvH8oKdHqaGt2soUldJE",
  authDomain: "kutty-dev.firebaseapp.com",
  projectId: "kutty-dev",
  storageBucket: "kutty-dev.appspot.com",
  messagingSenderId: "159687238510",
  appId: "1:159687238510:web:f3065ad72cef24c743177f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add some debugging
console.log("Firebase initialized:", app);
console.log("Firestore instance:", db);

export { db };