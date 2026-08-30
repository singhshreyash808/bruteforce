import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const API_BASE = "http://localhost:3001/api/auth";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("cybex_auth_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("cybex_jwt_token") || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Validate active token with backend on initial load
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem("cybex_jwt_token");
      if (!storedToken) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          localStorage.setItem("cybex_auth_user", JSON.stringify(data.user));
        } else {
          // Token expired or invalid
          localStorage.removeItem("cybex_jwt_token");
          localStorage.removeItem("cybex_auth_user");
          setCurrentUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error("Session verification failed:", err);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  // Login function
  const login = async (userId, password, role) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem("cybex_jwt_token", data.token);
      localStorage.setItem("cybex_auth_user", JSON.stringify(data.user));

      return { success: true, user: data.user, token: data.token };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Registration function
  const register = async (formData) => {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      return { success: true, user: data.user, message: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, { method: "POST" });
    } catch (e) {}

    localStorage.removeItem("cybex_jwt_token");
    localStorage.removeItem("cybex_auth_user");
    setCurrentUser(null);
    setToken(null);
  };

  // Forgot Password: Email Link Request
  const requestEmailReset = async (email) => {
    try {
      const response = await fetch(`${API_BASE}/forgot-password/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process request.");
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Forgot Password: Phone WhatsApp OTP Request
  const requestPhoneReset = async (phone) => {
    try {
      const response = await fetch(`${API_BASE}/forgot-password/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to dispatch WhatsApp OTP.");
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Verify Phone WhatsApp OTP
  const verifyPhoneOtp = async (phone, otp) => {
    try {
      const response = await fetch(`${API_BASE}/verify-phone-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid OTP code.");
      return { success: true, resetToken: data.resetToken, message: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Complete Password Reset
  const resetPassword = async (resetToken, newPassword, confirmPassword) => {
    try {
      const response = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword, confirmPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reset password.");
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const userRole = currentUser?.role || null;
  const isAuthenticated = !!currentUser && !!token;

  const value = {
    currentUser,
    userRole,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    requestEmailReset,
    requestPhoneReset,
    verifyPhoneOtp,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}