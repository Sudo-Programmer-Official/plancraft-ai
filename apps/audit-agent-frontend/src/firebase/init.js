// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDI0qFImSxQFYkT5CRu2K1yEZuPX1W2xEY",
  authDomain: "audit-agent-66451.firebaseapp.com",
  projectId: "audit-agent-66451",
  storageBucket: "audit-agent-66451.firebasestorage.app",
  messagingSenderId: "488930745261",
  appId: "1:488930745261:web:5fe03c2568c323ec091f24",
  measurementId: "G-681FBRFSNY"
};

// Initialize Firebase
// const app = initializeApp(firebaseConfig);
const firebaseApp = initializeApp(firebaseConfig)
const analytics = getAnalytics(firebaseApp);


export default firebaseApp
