import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';

// Firebase configuration from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Check if configuration is populated
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId
);

let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase Client SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Client SDK initialization failed: ", error);
  }
} else {
  console.warn("VITE_FIREBASE credentials missing. Using local Mock Auth Client.");
}

// Export mock service functions to match Firebase API signature
const mockAuthService = {
  signInWithEmail: async (email, password) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const username = email.split('@')[0];
    const user = {
      uid: `mock_${username}_${Math.floor(Math.random() * 1000)}`,
      email,
      displayName: username.charAt(0).toUpperCase() + username.slice(1),
      getIdToken: async () => `mock-token-${username}`
    };
    localStorage.setItem("mock_session", JSON.stringify(user));
    return { user };
  },
  
  signUpWithEmail: async (email, password, displayName) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const username = email.split('@')[0];
    const user = {
      uid: `mock_${username}_${Math.floor(Math.random() * 1000)}`,
      email,
      displayName: displayName || username.charAt(0).toUpperCase() + username.slice(1),
      getIdToken: async () => `mock-token-${username}`
    };
    localStorage.setItem("mock_session", JSON.stringify(user));
    return { user };
  },
  
  signInWithGoogle: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = {
      uid: `mock_google_${Math.floor(Math.random() * 10000)}`,
      email: "google_user@gmail.com",
      displayName: "Google User",
      getIdToken: async () => `mock-token-google_user`
    };
    localStorage.setItem("mock_session", JSON.stringify(user));
    return { user };
  },
  
  signOut: async () => {
    localStorage.removeItem("mock_session");
  },

  sendPasswordReset: async (email) => {
    console.log(`Mock reset password email sent to ${email}`);
    return true;
  }
};

export { 
  auth, 
  googleProvider, 
  isFirebaseConfigured, 
  mockAuthService,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail
};
