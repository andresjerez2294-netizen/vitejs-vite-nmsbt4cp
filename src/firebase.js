import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCleihC9lGorVM9Ii02Kn4v8TfliFIORLQ",
  authDomain: "finanzasandresapp.firebaseapp.com",
  projectId: "finanzasandresapp",
  storageBucket: "finanzasandresapp.firebasestorage.app",
  messagingSenderId: "611251032970",
  appId: "1:611251032970:web:01d66b210506eaee4bee73"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
// Esta línea es VITAL, si falta, la pantalla se pone blanca:
export const db = getFirestore(app);