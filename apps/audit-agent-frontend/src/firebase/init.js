import { initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: 'AIzaSyC-tRU_wQsHoLv7qyZUiJvy0G0LWyrt_bs',

  authDomain: 'prompt2quote.firebaseapp.com',

  projectId: 'prompt2quote',

  storageBucket: 'prompt2quote.firebasestorage.app',

  messagingSenderId: '63002502495',

  appId: '1:63002502495:web:032412f185a4bd75ef82ea',

  measurementId: 'G-R10T6XHSC3',
}

const firebaseApp = initializeApp(firebaseConfig)

export default firebaseApp
