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
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("officer");
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Helper to fetch user Firestore document
  const fetchUserProfile = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserProfile(data);
        setUserRole(data.role || "officer");
        return data;
      }
    } catch (err) {
      console.warn("Could not fetch user document from Firestore:", err.message);
    }
    return null;
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let profile = await fetchUserProfile(user.uid);
        
        // Construct comprehensive current user object
        const mergedUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || profile?.fullName || "Officer",
          fullName: profile?.fullName || user.displayName || "Officer",
          role: profile?.role || "officer",
          phone: profile?.phone || user.phoneNumber || "",
          badgeNumber: profile?.badgeNumber || "",
          designation: profile?.designation || "Cyber Crime Investigator",
          policeStation: profile?.policeStation || "Cyber Crime Cell",
          bankName: profile?.bankName || "",
          branchCode: profile?.branchCode || "",
          employeeId: profile?.employeeId || "",
          aadhaar: profile?.aadhaar || "",
          address: profile?.address || "",
          city: profile?.city || "",
          createdAt: profile?.createdAt || null,
        };

        setCurrentUser(mergedUser);
        setUserRole(mergedUser.role);
        localStorage.setItem("cybex_auth_user", JSON.stringify(mergedUser));
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole("officer");
        localStorage.removeItem("cybex_auth_user");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Email + Password Registration with Firestore Profile
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

      // Check if User ID / username is already taken in Firestore
      if (userId) {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userId", "==", userId.trim()));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            throw { code: "custom/user-id-taken", message: "This User ID is already registered." };
          }
        } catch (checkErr) {
          if (checkErr.code === "custom/user-id-taken") throw checkErr;
        }
      }

      // Create account in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      const user = userCredential.user;

      // Update Firebase Auth profile display name
      if (fullName) {
        await updateProfile(user, { displayName: fullName.trim() });
      }

      // Prepare user document for Firestore
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
        createdAt: serverTimestamp(),
        isActive: true,
      };

      // Store in Firestore `users/{uid}`
      await setDoc(doc(db, "users", user.uid), userDocData);

      const resolvedUser = {
        ...userDocData,
        displayName: userDocData.fullName,
      };

      setCurrentUser(resolvedUser);
      setUserRole(resolvedUser.role);
      localStorage.setItem("cybex_auth_user", JSON.stringify(resolvedUser));

      return { success: true, user: resolvedUser, message: "Account registered successfully." };
    } catch (error) {
      console.error("Firebase Registration Error:", error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error),
      };
    }
  };

  // 2. Email + Password Login
  const login = async (identifier, password, selectedRole) => {
    try {
      let emailToLogin = identifier.trim();

      // If user typed a User ID rather than an email, look up email in Firestore
      if (!emailToLogin.includes("@")) {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("userId", "==", emailToLogin));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            emailToLogin = querySnapshot.docs[0].data().email;
          } else {
            throw { code: "auth/user-not-found", message: "Account not found. Please sign up first." };
          }
        } catch (lookupErr) {
          if (lookupErr.code === "auth/user-not-found") throw lookupErr;
        }
      }

      // Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        emailToLogin.toLowerCase(),
        password
      );
      const user = userCredential.user;

      // Fetch Firestore profile
      const profile = await fetchUserProfile(user.uid);

      // Verify Role if specified
      if (selectedRole && profile?.role && profile.role !== selectedRole) {
        await signOut(auth);
        throw new Error(`Invalid account role. This account is registered as "${profile.role.toUpperCase()}", not "${selectedRole.toUpperCase()}".`);
      }

      const mergedUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || profile?.fullName || "Officer",
        fullName: profile?.fullName || user.displayName || "Officer",
        role: profile?.role || selectedRole || "officer",
        phone: profile?.phone || "",
        badgeNumber: profile?.badgeNumber || "",
        designation: profile?.designation || "Cyber Crime Investigator",
        policeStation: profile?.policeStation || "Cyber Crime Cell",
      };

      setCurrentUser(mergedUser);
      setUserRole(mergedUser.role);
      localStorage.setItem("cybex_auth_user", JSON.stringify(mergedUser));

      return { success: true, user: mergedUser };
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
        message: `Password reset email dispatched to ${email.trim()}. Please check your inbox and follow the secure link.`,
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
          callback: () => {
            // reCAPTCHA solved
          },
          "expired-callback": () => {
            // Response expired
          },
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
        // Default to Indian country code (+91) if not provided
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