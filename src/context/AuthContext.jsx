import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// In-memory / localStorage cache for instant fast loading
const getCachedUser = () => {
  try {
    const saved = localStorage.getItem("cybex_auth_user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(getCachedUser);
  const [userRole, setUserRole] = useState(() => getCachedUser()?.role || "officer");
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(!getCachedUser());

  // Friendly error message converter for Firebase Auth error codes
  const getFriendlyErrorMessage = (error) => {
    if (!error) return "An unexpected error occurred. Please try again.";
    const code = error.code || "";
    const msg = error.message || "";

    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Invalid email or password. Please verify your credentials.";
      case "auth/user-not-found":
        return "Account not found. Please sign up first.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 6 characters.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled by an administrator.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Access is temporarily locked. Please try again later.";
      case "auth/network-request-failed":
        return "Network connection error. Please check your internet connection.";
      case "auth/invalid-verification-code":
        return "Invalid OTP verification code. Please check and re-enter.";
      case "auth/code-expired":
        return "OTP verification code has expired. Please request a new code.";
      case "auth/invalid-phone-number":
        return "Invalid phone number format. Please include country code (e.g. +91XXXXXXXXXX).";
      case "auth/quota-exceeded":
        return "SMS quota exceeded for this project. Please contact administrator.";
      case "auth/captcha-check-failed":
        return "reCAPTCHA verification failed. Please try again.";
      default:
        if (msg.includes("API key not valid")) {
          return "Firebase API Key is missing or not configured. Please add your credentials to .env.local.";
        }
        return msg || "Authentication operation failed.";
    }
  };

  // Ultra-fast timeout-protected Firestore profile fetcher
  const fetchUserProfile = async (uid) => {
    try {
      const fetchPromise = getDoc(doc(db, "users", uid));
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
      const userDocSnap = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (userDocSnap && userDocSnap.exists && userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserProfile(data);
        if (data.role) setUserRole(data.role);
        return data;
      }
    } catch (err) {
      console.warn("Fast-path: Firestore fetch skipped or failed:", err.message);
    }
    return null;
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fast instant construct
        const cached = getCachedUser();
        const initialUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || cached?.fullName || "Officer",
          fullName: user.displayName || cached?.fullName || "Officer",
          role: cached?.role || "officer",
          phone: cached?.phone || user.phoneNumber || "",
          badgeNumber: cached?.badgeNumber || "",
          designation: cached?.designation || "Cyber Crime Investigator",
          policeStation: cached?.policeStation || "Cyber Crime Cell",
          bankName: cached?.bankName || "",
          branchCode: cached?.branchCode || "",
          employeeId: cached?.employeeId || "",
          aadhaar: cached?.aadhaar || "",
          address: cached?.address || "",
          city: cached?.city || "",
        };

        setCurrentUser(initialUser);
        setUserRole(initialUser.role);
        setLoading(false);

        // Async background sync with Firestore (non-blocking)
        fetchUserProfile(user.uid).then((profile) => {
          if (profile) {
            const updatedUser = {
              ...initialUser,
              ...profile,
              fullName: profile.fullName || user.displayName || initialUser.fullName,
              role: profile.role || initialUser.role,
            };
            setCurrentUser(updatedUser);
            setUserRole(updatedUser.role);
            localStorage.setItem("cybex_auth_user", JSON.stringify(updatedUser));
          }
        });
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole("officer");
        localStorage.removeItem("cybex_auth_user");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 1. Lightning-Fast Email + Password Registration
  const register = async (formData) => {
    try {
      const {
        email,
        password,
        fullName,
        phone,
        userId,
        role = "officer",
        badgeNumber,
        designation,
        policeStation,
        bankName,
        branchCode,
        employeeId,
        aadhaar,
        address,
        city,
      } = formData;

      if (!email || !password) {
        throw new Error("Email and password are required.");
      }

      // Fast create in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      const user = userCredential.user;

      // Construct user object immediately
      const userDocData = {
        uid: user.uid,
        email: email.trim().toLowerCase(),
        fullName: (fullName || "").trim(),
        userId: (userId || email.split("@")[0]).trim(),
        phone: (phone || "").trim(),
        role: role || "officer",
        badgeNumber: (badgeNumber || "").trim(),
        designation: (designation || "").trim(),
        policeStation: (policeStation || "").trim(),
        bankName: (bankName || "").trim(),
        branchCode: (branchCode || "").trim(),
        employeeId: (employeeId || "").trim(),
        aadhaar: (aadhaar || "").trim(),
        address: (address || "").trim(),
        city: (city || "").trim(),
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // Set optimistic state immediately for instant UI response
      setCurrentUser(userDocData);
      setUserRole(userDocData.role);
      localStorage.setItem("cybex_auth_user", JSON.stringify(userDocData));

      // Asynchronously update Firebase display name & Firestore profile in background
      Promise.allSettled([
        fullName ? updateProfile(user, { displayName: fullName.trim() }) : Promise.resolve(),
        setDoc(doc(db, "users", user.uid), {
          ...userDocData,
          createdAt: serverTimestamp(),
        }),
      ]);

      return { success: true, user: userDocData, message: "Account registered successfully." };
    } catch (error) {
      console.error("Firebase Registration Error:", error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error),
      };
    }
  };

  // 2. High-Speed Email + Password Login
  const login = async (identifier, password, selectedRole) => {
    try {
      let emailToLogin = identifier.trim().toLowerCase();

      // If user typed only a username without @, append domain or treat as identifier
      if (!emailToLogin.includes("@")) {
        emailToLogin = `${emailToLogin}@cybex.gov.in`;
      }

      // Direct fast authentication with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        emailToLogin,
        password
      );
      const user = userCredential.user;

      // Instant optimistic user model
      const cached = getCachedUser();
      const resolvedUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || cached?.fullName || (selectedRole === "citizen" ? "Citizen User" : selectedRole === "bank" ? "Bank Official" : "Officer"),
        fullName: user.displayName || cached?.fullName || (selectedRole === "citizen" ? "Citizen User" : selectedRole === "bank" ? "Bank Official" : "Officer"),
        role: cached?.role || selectedRole || "officer",
        phone: cached?.phone || "",
        badgeNumber: cached?.badgeNumber || "",
        designation: cached?.designation || (selectedRole === "officer" ? "Cyber Crime Investigator" : ""),
        policeStation: cached?.policeStation || "Cyber Crime Cell",
      };

      setCurrentUser(resolvedUser);
      setUserRole(resolvedUser.role);
      localStorage.setItem("cybex_auth_user", JSON.stringify(resolvedUser));

      // Fetch Firestore profile in background (non-blocking)
      fetchUserProfile(user.uid).then((profile) => {
        if (profile) {
          const fresh = { ...resolvedUser, ...profile };
          setCurrentUser(fresh);
          setUserRole(fresh.role);
          localStorage.setItem("cybex_auth_user", JSON.stringify(fresh));
        }
      });

      return { success: true, user: resolvedUser };
    } catch (error) {
      console.error("Firebase Login Error:", error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error),
      };
    }
  };

  // 3. Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setCurrentUser(null);
    setUserProfile(null);
    setUserRole("officer");
    localStorage.removeItem("cybex_auth_user");
    localStorage.removeItem("cybex_jwt_token");
    sessionStorage.clear();
  };

  // 4. Send Firebase Password Reset Email
  const requestEmailReset = async (email) => {
    try {
      if (!email || !email.trim()) {
        throw new Error("Please enter your registered email address.");
      }
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      return {
        success: true,
        message: `Password reset email dispatched to ${email.trim()}. Please check your inbox.`,
      };
    } catch (error) {
      console.error("Firebase Password Reset Email Error:", error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error),
      };
    }
  };

  // 5. Initialize Firebase Phone reCAPTCHA Verifier
  const setupRecaptcha = (containerId) => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        containerId,
        {
          size: "invisible",
          callback: () => {},
          "expired-callback": () => {},
        }
      );
    }
    return window.recaptchaVerifier;
  };

  // 6. Send Firebase Phone SMS OTP
  const sendPhoneOtp = async (phoneNumber, appVerifier) => {
    try {
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = `+91${formattedPhone.replace(/\D/g, "")}`;
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier
      );
      window.confirmationResult = confirmationResult;

      return {
        success: true,
        confirmationResult,
        message: `SMS Verification OTP dispatched to ${formattedPhone}.`,
      };
    } catch (error) {
      console.error("Firebase Phone OTP Error:", error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error),
      };
    }
  };

  // 7. Verify Phone SMS OTP
  const verifyPhoneOtp = async (otpCode) => {
    try {
      if (!window.confirmationResult) {
        throw new Error("No active OTP request found. Please request a new OTP.");
      }
      const result = await window.confirmationResult.confirm(otpCode.trim());
      const user = result.user;

      return {
        success: true,
        user,
        message: "Phone number verified successfully!",
      };
    } catch (error) {
      console.error("Firebase OTP Verification Error:", error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error),
      };
    }
  };

  // 8. Update Password for authenticated user
  const updateUserPassword = async (newPassword) => {
    try {
      if (!auth.currentUser) {
        throw new Error("No authenticated session. Please verify identity again.");
      }
      await updatePassword(auth.currentUser, newPassword);
      return { success: true, message: "Password updated successfully!" };
    } catch (error) {
      console.error("Update Password Error:", error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error),
      };
    }
  };

  const value = {
    currentUser,
    userRole,
    userProfile,
    isAuthenticated: !!currentUser,
    loading,
    login,
    register,
    logout,
    requestEmailReset,
    setupRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
    updateUserPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;