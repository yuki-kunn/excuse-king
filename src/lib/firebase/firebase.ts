import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// Firestoreは後で使うので、一緒に準備しておきます
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADdwJtplmnlOR8CcUBaZXtc-nYdf6XCMQ",
  authDomain: "excuse-king.firebaseapp.com",
  projectId: "excuse-king",
  storageBucket: "excuse-king.firebasestorage.app",
  messagingSenderId: "507778030977",
  appId: "1:507778030977:web:4d4cd9904a50bfff14dc80",
  measurementId: "G-7DYS8M9XMF"
};


// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// 認証（Auth）とデータベース（Firestore）の機能をエクスポートして他のファイルで使えるようにします
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);