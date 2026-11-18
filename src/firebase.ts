import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

// La configuración web de Firebase no es secreta: la seguridad la dan
// Authentication + las reglas de Firestore (ver firestore.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyC8YcyDIONQK1xgisAPB7oiBgfKgRMa2d0',
  authDomain: 'maryfereyes-appweb.firebaseapp.com',
  projectId: 'maryfereyes-appweb',
  storageBucket: 'maryfereyes-appweb.firebasestorage.app',
  messagingSenderId: '396858689049',
  appId: '1:396858689049:web:b7279697b1505e0cdf4c88',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Caché local persistente: la app sigue funcionando sin internet y sincroniza al volver.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

/** Firebase Auth exige un correo; el usuario solo escribe "admin" y lo mapeamos aquí. */
export const AUTH_EMAIL_DOMAIN = 'maryfereyes.app'
