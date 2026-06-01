import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  isFirebaseConfigured, 
  mockAuthService,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail
} from '../services/firebase';
import { updateProfile } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync session
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          const token = await user.getIdToken();
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            token: token
          });
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Load mock session from local storage
      const mockSession = localStorage.getItem("mock_session");
      if (mockSession) {
        try {
          const user = JSON.parse(mockSession);
          // Set mock user with mock token
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            token: `mock-token-${user.email.split('@')[0]}`
          });
        } catch (e) {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    }
  }, []);

  // Authentication API methods
  async function login(email, password) {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const token = await result.user.getIdToken();
        setCurrentUser({
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName || result.user.email.split('@')[0],
          token: token
        });
        return result.user;
      } else {
        const result = await mockAuthService.signInWithEmail(email, password);
        setCurrentUser({
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          token: await result.user.getIdToken()
        });
        return result.user;
      }
    } finally {
      setLoading(false);
    }
  }

  async function signup(email, password, name) {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Set display name in Firebase Auth
        await updateProfile(result.user, { displayName: name });
        const token = await result.user.getIdToken();
        setCurrentUser({
          uid: result.user.uid,
          email: result.user.email,
          name: name,
          token: token
        });
        return result.user;
      } else {
        const result = await mockAuthService.signUpWithEmail(email, password, name);
        setCurrentUser({
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          token: await result.user.getIdToken()
        });
        return result.user;
      }
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth && googleProvider) {
        const result = await signInWithPopup(auth, googleProvider);
        const token = await result.user.getIdToken();
        setCurrentUser({
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName || result.user.email.split('@')[0],
          token: token
        });
        return result.user;
      } else {
        const result = await mockAuthService.signInWithGoogle();
        setCurrentUser({
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          token: await result.user.getIdToken()
        });
        return result.user;
      }
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await signOut(auth);
      } else {
        await mockAuthService.signOut();
      }
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(email) {
    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, email);
    } else {
      await mockAuthService.sendPasswordReset(email);
    }
  }

  const value = {
    currentUser,
    login,
    signup,
    loginWithGoogle,
    logout,
    resetPassword,
    isMock: !isFirebaseConfigured
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
