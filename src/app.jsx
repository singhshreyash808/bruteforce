import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "./app.css";
import Tasks from "./pages/Tasks";
import Documents from "./pages/Documents";
import statesData from "./states-and-districts.json";
import statesDistrictsMap from "./statesDistricts.json";
import { getStateGeo, getDistrictGeo, INDIA_DEFAULT } from "./geo-coordinates";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

/* =====================================================
   THEME + UI HELPERS
===================================================== */

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("cybex-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("cybex-theme", theme);
    } catch {
      // Ignore storage errors and keep the active theme.
    }
  }, [theme]);

  return [theme, () => setTheme((current) => current === "dark" ? "light" : "dark")];
}

function ThemeToggle() {
  const [theme, toggleTheme] = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span>{theme === "dark" ? "☀️" : "🌙"}</span>
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}

/* =====================================================
   ROLE-BASED LOGIN (REAL BACKEND AUTHENTICATION)
===================================================== */

function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, userRole } = useAuth();

  const [role, setRole] = useState("officer");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (userRole === "citizen") navigate("/citizen-dashboard");
      else if (userRole === "bank") navigate("/bank-dashboard");
      else navigate("/dashboard");
    }
  }, [isAuthenticated, userRole, navigate]);

  const roles = [
    {
      id: "officer",
      icon: "👮",
      title: "Officer",
      subtitle: "Law Enforcement",
    },
    {
      id: "citizen",
      icon: "👤",
      title: "Citizen",
      subtitle: "Public User",
    },
    {
      id: "bank",
      icon: "🏦",
      title: "Bank",
      subtitle: "Financial Institution",
    },
  ];

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMessage("");

    if (!userId.trim() || !password) {
      setErrorMessage("Please enter your User ID and password.");
      return;
    }

    setLoading(true);
    const result = await login(userId.trim(), password, role);
    setLoading(false);

    if (result.success) {
      if (role === "officer") {
        navigate("/dashboard");
      } else if (role === "citizen") {
        navigate("/citizen-dashboard");
      } else {
        navigate("/bank-dashboard");
      }
    } else {
      setErrorMessage(result.error || "Authentication failed. Please verify credentials.");
    }
  }

  const selectedRole = roles.find((item) => item.id === role);

  return (
    <div className="login-page">
      <div className="login-theme-control">
        <ThemeToggle />
      </div>

      <div className="login-left">
        <div className="login-brand">
          <div className="big-shield">🛡️</div>

          <h1>CybeX</h1>

          <p>
            Predictive Cybercrime Intelligence System
          </p>
        </div>

        <div className="login-info">
          <div>
            <strong>AI Powered</strong>
            <span>Predictive Analytics</span>
          </div>

          <div>
            <strong>GIS Enabled</strong>
            <span>Risk Hotspot Mapping</span>
          </div>

          <div>
            <strong>Real-Time</strong>
            <span>Actionable Intelligence</span>
          </div>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-card-header">
            <h2>Welcome Back</h2>

            <p>
              Select your account type to continue
            </p>
          </div>

          <div className="role-selector">
            {roles.map((item) => (
              <button
                type="button"
                key={item.id}
                className={
                  role === item.id
                    ? "role-card selected"
                    : "role-card"
                }
                onClick={() => {
                  setRole(item.id);
                  setErrorMessage("");
                }}
              >
                <span className="role-icon">
                  {item.icon}
                </span>

                <strong>{item.title}</strong>

                <small>{item.subtitle}</small>
              </button>
            ))}
          </div>

          <div className="selected-login-role">
            {selectedRole.icon} Login as{" "}
            <strong>{selectedRole.title}</strong>
          </div>

          {errorMessage && (
            <div style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "14px"
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <label>User ID / Email</label>

          <input
            type="text"
            placeholder={`Enter ${selectedRole.title} ID or Email`}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={loading}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <div className="remember">
            <label>
              <input type="checkbox" defaultChecked />
              Remember me
            </label>

            <Link
              to="/forgot-password"
              className="forgot-btn"
              style={{ textDecoration: "none" }}
            >
              Forgot Password?
            </Link>
          </div>

          <button className="primary-btn login-btn" disabled={loading}>
            {loading ? "🔐 Authenticating..." : "🔐 Login"}
          </button>

          <div className="signup-link">
            Don't have an account?{" "}
            <Link to="/register">Sign Up</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =====================================================
   REGISTER / SIGN UP (REAL DATABASE REGISTRATION)
===================================================== */

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [role, setRole] = useState("officer");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    userId: "",
    password: "",
    confirmPassword: "",
    // Officer fields
    badgeNumber: "",
    designation: "",
    policeStation: "",
    // Citizen fields
    aadhaar: "",
    address: "",
    city: "",
    // Bank fields
    bankName: "",
    branchCode: "",
    employeeId: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const roles = [
    {
      id: "officer",
      icon: "👮",
      title: "Officer",
      subtitle: "Law Enforcement",
    },
    {
      id: "citizen",
      icon: "👤",
      title: "Citizen",
      subtitle: "Public User",
    },
    {
      id: "bank",
      icon: "🏦",
      title: "Bank",
      subtitle: "Financial Institution",
    },
  ];

  const selectedRole = roles.find((item) => item.id === role);

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.userId.trim() || !formData.password) {
      setErrorMessage("Please fill in all required fields marked with *.");
      return;
    }
    if (formData.password.length < 4) {
      setErrorMessage("Password must be at least 4 characters long.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }

    setLoading(true);
    const result = await register({ ...formData, role });
    setLoading(false);

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } else {
      setErrorMessage(result.error || "Registration failed. Please check your details.");
    }
  }

  if (showSuccess) {
    return (
      <div className="login-page">
        <div className="login-theme-control">
          <ThemeToggle />
        </div>
        <div className="login-left">
          <div className="login-brand">
            <div className="big-shield">🛡️</div>
            <h1>CybeX</h1>
            <p>Predictive Cybercrime Intelligence System</p>
          </div>
        </div>
        <div className="login-right">
          <div className="register-success-card">
            <div className="success-icon">✅</div>
            <h2>Registration Successful!</h2>
            <p>Your <strong>{selectedRole.title}</strong> account has been created in the database.</p>
            <p className="success-sub">Redirecting to login...</p>
            <div className="success-loader"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-theme-control">
        <ThemeToggle />
      </div>

      <div className="login-left">
        <div className="login-brand">
          <div className="big-shield">🛡️</div>
          <h1>CybeX</h1>
          <p>Predictive Cybercrime Intelligence System</p>
        </div>

        <div className="login-info">
          <div>
            <strong>Secure</strong>
            <span>End-to-End Encrypted</span>
          </div>
          <div>
            <strong>Verified</strong>
            <span>Identity Authentication</span>
          </div>
          <div>
            <strong>Protected</strong>
            <span>Multi-Factor Security</span>
          </div>
        </div>
      </div>

      <div className="login-right">
        <form className="login-card register-card" onSubmit={handleRegister}>
          <div className="login-card-header">
            <h2>Create Account</h2>
            <p>Register as an Officer, Citizen, or Bank Official</p>
          </div>

          {/* Role Selector */}
          <div className="role-selector">
            {roles.map((item) => (
              <button
                type="button"
                key={item.id}
                className={
                  role === item.id
                    ? "role-card selected"
                    : "role-card"
                }
                onClick={() => {
                  setRole(item.id);
                  setErrorMessage("");
                }}
              >
                <span className="role-icon">{item.icon}</span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </button>
            ))}
          </div>

          <div className="selected-login-role">
            {selectedRole.icon} Register as{" "}
            <strong>{selectedRole.title}</strong>
          </div>

          {errorMessage && (
            <div style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "14px"
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="register-scroll-area">
            {/* Common Fields */}
            <div className="register-section">
              <div className="register-section-title">📋 Personal Information</div>
              <div className="register-grid">
                <div className="register-field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    required
                  />
                </div>
                <div className="register-field">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="register-field">
                  <label>Phone Number (WhatsApp)</label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Role-specific fields: Officer */}
            {role === "officer" && (
              <div className="register-section">
                <div className="register-section-title">👮 Officer Details</div>
                <div className="register-grid">
                  <div className="register-field">
                    <label>Badge / ID Number</label>
                    <input
                      type="text"
                      placeholder="e.g. OFF-2026-001"
                      value={formData.badgeNumber}
                      onChange={(e) => handleChange("badgeNumber", e.target.value)}
                    />
                  </div>
                  <div className="register-field">
                    <label>Designation</label>
                    <select
                      value={formData.designation}
                      onChange={(e) => handleChange("designation", e.target.value)}
                    >
                      <option value="">Select Designation</option>
                      <option value="Inspector">Inspector</option>
                      <option value="Sub Inspector">Sub Inspector</option>
                      <option value="Cyber Crime Investigator">Cyber Crime Investigator</option>
                      <option value="Superintendent of Police">Superintendent of Police</option>
                      <option value="Deputy SP">Deputy SP</option>
                    </select>
                  </div>
                  <div className="register-field">
                    <label>Police Station / Unit</label>
                    <input
                      type="text"
                      placeholder="e.g. Cyber Crime Cell, Mumbai"
                      value={formData.policeStation}
                      onChange={(e) => handleChange("policeStation", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Role-specific fields: Citizen */}
            {role === "citizen" && (
              <div className="register-section">
                <div className="register-section-title">👤 Citizen Details</div>
                <div className="register-grid">
                  <div className="register-field">
                    <label>Aadhaar Number</label>
                    <input
                      type="text"
                      placeholder="XXXX XXXX XXXX"
                      value={formData.aadhaar}
                      onChange={(e) => handleChange("aadhaar", e.target.value)}
                    />
                  </div>
                  <div className="register-field">
                    <label>Address</label>
                    <input
                      type="text"
                      placeholder="Enter your address"
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                    />
                  </div>
                  <div className="register-field">
                    <label>City / District</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Role-specific fields: Bank */}
            {role === "bank" && (
              <div className="register-section">
                <div className="register-section-title">🏦 Bank Details</div>
                <div className="register-grid">
                  <div className="register-field">
                    <label>Bank Name</label>
                    <select
                      value={formData.bankName}
                      onChange={(e) => handleChange("bankName", e.target.value)}
                    >
                      <option value="">Select Bank</option>
                      <option value="State Bank of India">State Bank of India</option>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Punjab National Bank">Punjab National Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="Bank of Baroda">Bank of Baroda</option>
                      <option value="Union Bank of India">Union Bank of India</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="register-field">
                    <label>Branch Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={formData.branchCode}
                      onChange={(e) => handleChange("branchCode", e.target.value)}
                    />
                  </div>
                  <div className="register-field">
                    <label>Employee ID</label>
                    <input
                      type="text"
                      placeholder="e.g. EMP-78945"
                      value={formData.employeeId}
                      onChange={(e) => handleChange("employeeId", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Credentials */}
            <div className="register-section">
              <div className="register-section-title">🔐 Login Credentials</div>
              <div className="register-grid">
                <div className="register-field">
                  <label>User ID *</label>
                  <input
                    type="text"
                    placeholder="Choose a unique User ID"
                    value={formData.userId}
                    onChange={(e) => handleChange("userId", e.target.value)}
                    required
                  />
                </div>
                <div className="register-field">
                  <label>Password *</label>
                  <input
                    type="password"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    required
                  />
                </div>
                <div className="register-field">
                  <label>Confirm Password *</label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="register-terms">
            <label>
              <input type="checkbox" required defaultChecked />
              I agree to the <button type="button" className="terms-link">Terms of Service</button> and{" "}
              <button type="button" className="terms-link">Privacy Policy</button>
            </label>
          </div>

          <button className="primary-btn login-btn register-btn" disabled={loading}>
            {loading ? "📝 Registering Account..." : "📝 Register Account"}
          </button>

          <div className="signup-link">
            Already have an account?{" "}
            <Link to="/">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =====================================================
   FORGOT PASSWORD (EMAIL & WHATSAPP OTP RESET FLOWS)
===================================================== */

function ForgotPassword() {
  const navigate = useNavigate();
  const { requestEmailReset, requestPhoneReset, verifyPhoneOtp, resetPassword } = useAuth();

  const [method, setMethod] = useState("phone"); // 'phone' (WhatsApp) or 'email'
  const [step, setStep] = useState(1); // 1: Input, 2: OTP, 3: New Password, 4: Done

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Step 1: Request OTP or Email Reset Link
  async function handleRequestReset(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (method === "phone") {
      if (!phone.trim()) {
        setError("Please enter your registered phone number.");
        return;
      }
      setLoading(true);
      const res = await requestPhoneReset(phone.trim());
      setLoading(false);

      if (res.success) {
        setMessage(res.message);
        setStep(2); // Go to OTP verification step
      } else {
        setError(res.error || "Failed to dispatch verification code.");
      }
    } else {
      if (!email.trim()) {
        setError("Please enter your registered email address.");
        return;
      }
      setLoading(true);
      const res = await requestEmailReset(email.trim());
      setLoading(false);

      if (res.success) {
        setMessage(res.message);
        setStep(4); // Email dispatched confirmation
      } else {
        setError(res.error || "Failed to dispatch email instructions.");
      }
    }
  }

  // Step 2: Verify WhatsApp OTP
  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    const res = await verifyPhoneOtp(phone.trim(), otp.trim());
    setLoading(false);

    if (res.success) {
      setResetToken(res.resetToken);
      setMessage("✓ OTP verified successfully! Create your new password below.");
      setStep(3); // Go to New Password step
    } else {
      setError(res.error || "Invalid OTP code.");
    }
  }

  // Step 3: Set New Password
  async function handleSetNewPassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!newPassword || newPassword.length < 4) {
      setError("New password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);
    const res = await resetPassword(resetToken, newPassword, confirmPassword);
    setLoading(false);

    if (res.success) {
      setMessage("✓ " + res.message);
      setStep(4); // Finished
    } else {
      setError(res.error || "Failed to update password.");
    }
  }

  return (
    <div className="login-page">
      <div className="login-theme-control">
        <ThemeToggle />
      </div>

      <div className="login-left">
        <div className="login-brand">
          <div className="big-shield">🛡️</div>
          <h1>CybeX</h1>
          <p>Predictive Cybercrime Intelligence System</p>
        </div>

        <div className="login-info">
          <div>
            <strong>WhatsApp OTP</strong>
            <span>Fast Instant Verification</span>
          </div>
          <div>
            <strong>Cryptographic</strong>
            <span>Secure Password Hashing</span>
          </div>
          <div>
            <strong>Account Safety</strong>
            <span>Immediate Old Key Revocation</span>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card" style={{ maxWidth: "440px" }}>
          <div className="login-card-header">
            <h2>Account Recovery</h2>
            <p>Reset your password securely via WhatsApp OTP or Email</p>
          </div>

          {/* Recovery Method Selector (when on Step 1) */}
          {step === 1 && (
            <div className="role-selector" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "18px" }}>
              <button
                type="button"
                className={method === "phone" ? "role-card selected" : "role-card"}
                onClick={() => { setMethod("phone"); setError(""); setMessage(""); }}
              >
                <span className="role-icon">📱</span>
                <strong>WhatsApp OTP</strong>
                <small>Instant Mobile SMS/WA</small>
              </button>

              <button
                type="button"
                className={method === "email" ? "role-card selected" : "role-card"}
                onClick={() => { setMethod("email"); setError(""); setMessage(""); }}
              >
                <span className="role-icon">✉️</span>
                <strong>Email Link</strong>
                <small>15-Min Secure Link</small>
              </button>
            </div>
          )}

          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "14px"
            }}>
              ⚠️ {error}
            </div>
          )}

          {message && (
            <div style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              color: "#6ee7b7",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "14px"
            }}>
              {message}
            </div>
          )}

          {/* STEP 1: Phone or Email input */}
          {step === 1 && (
            <form onSubmit={handleRequestReset}>
              {method === "phone" ? (
                <>
                  <label>Registered Phone Number (WhatsApp)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <small style={{ color: "var(--muted, #94a3b8)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                    A 6-digit one-time code will be dispatched directly to WhatsApp.
                  </small>
                </>
              ) : (
                <>
                  <label>Registered Email Address</label>
                  <input
                    type="email"
                    placeholder="officer@domain.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <small style={{ color: "var(--muted, #94a3b8)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                    A single-use password reset link valid for 15 minutes will be sent.
                  </small>
                </>
              )}

              <button className="primary-btn login-btn" style={{ marginTop: "18px" }} disabled={loading}>
                {loading ? "⏳ Dispatching Request..." : (method === "phone" ? "📱 Send WhatsApp OTP" : "✉️ Send Reset Link")}
              </button>
            </form>
          )}

          {/* STEP 2: WhatsApp OTP input */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid var(--cyan, #06B6D4)", padding: "12px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
                📱 <strong>Code sent to:</strong> {phone}
              </div>

              <label>Enter 6-Digit WhatsApp OTP Code</label>
              <input
                type="text"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                style={{ textAlign: "center", fontSize: "20px", letterSpacing: "8px", fontWeight: "bold" }}
                disabled={loading}
                autoFocus
                required
              />

              <button className="primary-btn login-btn" style={{ marginTop: "18px" }} disabled={loading}>
                {loading ? "🔒 Verifying OTP..." : "🔒 Verify OTP Code"}
              </button>

              <div style={{ textAlign: "center", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(""); }}
                  style={{ background: "transparent", border: "none", color: "var(--cyan, #06B6D4)", cursor: "pointer", fontSize: "12px" }}
                >
                  ← Resend or change phone number
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Create New Password */}
          {step === 3 && (
            <form onSubmit={handleSetNewPassword}>
              <label>New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />

              <label>Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />

              <button className="primary-btn login-btn" style={{ marginTop: "18px" }} disabled={loading}>
                {loading ? "💾 Updating Password..." : "💾 Set New Password"}
              </button>
            </form>
          )}

          {/* STEP 4: Success / Done */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: "42px", marginBottom: "12px" }}>🎉</div>
              <h3 style={{ marginBottom: "8px" }}>Password Recovery Complete</h3>
              <p style={{ color: "var(--muted, #94a3b8)", fontSize: "13px", marginBottom: "20px" }}>
                Your account password has been updated and securely hashed in the database. Your previous password has been permanently deactivated.
              </p>
              <button
                type="button"
                className="primary-btn login-btn"
                onClick={() => navigate("/")}
              >
                🔐 Proceed to Login
              </button>
            </div>
          )}

          {step !== 4 && (
            <div className="signup-link" style={{ marginTop: "20px" }}>
              Remember your password?{" "}
              <Link to="/">Back to Login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   RESET PASSWORD (DIRECT EMAIL LINK HANDLER)
===================================================== */

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing or invalid password reset token.");
      return;
    }
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);
    const res = await resetPassword(token, newPassword, confirmPassword);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Failed to reset password.");
    }
  }

  return (
    <div className="login-page">
      <div className="login-theme-control">
        <ThemeToggle />
      </div>

      <div className="login-left">
        <div className="login-brand">
          <div className="big-shield">🛡️</div>
          <h1>CybeX</h1>
          <p>Predictive Cybercrime Intelligence System</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card" style={{ maxWidth: "440px" }}>
          <div className="login-card-header">
            <h2>Set New Password</h2>
            <p>Enter your new password to update your account</p>
          </div>

          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "14px"
            }}>
              ⚠️ {error}
            </div>
          )}

          {success ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
              <h3>Password Reset Successful!</h3>
              <p style={{ color: "var(--muted, #94a3b8)", fontSize: "13px", margin: "10px 0 20px" }}>
                You can now log in using your newly configured password.
              </p>
              <button className="primary-btn login-btn" onClick={() => navigate("/")}>
                🔐 Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <label>New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />

              <label>Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />

              <button className="primary-btn login-btn" style={{ marginTop: "18px" }} disabled={loading}>
                {loading ? "💾 Saving Password..." : "💾 Update Password"}
              </button>

              <div className="signup-link" style={{ marginTop: "18px" }}>
                <Link to="/">Back to Login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   OFFICER SIDEBAR
===================================================== */

function OfficerSidebar() {
  const location = useLocation();

  const menu = [
    {
      path: "/dashboard",
      icon: "📊",
      name: "Dashboard",
    },
    {
      path: "/complaints",
      icon: "📁",
      name: "Complaints",
    },
    {
      path: "/prediction",
      icon: "🤖",
      name: "Prediction",
    },
    {
      path: "/heatmap",
      icon: "🗺️",
      name: "Risk Heatmap",
    },
    {
      path: "/alerts",
      icon: "🚨",
      name: "Alerts",
    },
    {
      path: "/reports",
      icon: "📑",
      name: "Reports",
    },
    {
      path: "/settings",
      icon: "⚙️",
      name: "Settings",
    },
    {
      path: "/tasks",
      icon: "📋",
      name: "Tasks",
    },
    {
      path: "/documents",
      icon: "📂",
      name: "Documents",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">🛡️</div>

        <div>
          <h2>CybeX</h2>
          <span>Officer Portal</span>
        </div>
      </div>

      <nav>
        {menu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={
              location.pathname === item.path
                ? "menu-item active"
                : "menu-item"
            }
          >
            <span>{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="security-status">
          <span className="status-dot"></span>
          System Online
        </div>

        <button
          type="button"
          onClick={() => {
            if (window.confirm("Are you sure you want to log out of the CybeX Officer Portal?")) {
              localStorage.removeItem("cybex_jwt_token");
              localStorage.removeItem("cybex_auth_user");
              window.location.href = "/";
            }
          }}
          className="logout"
          style={{ background: "transparent", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}

/* =====================================================
   NOTIFICATION NOTICES DATA & GLOBAL HEADER
===================================================== */

const defaultNotifications = {
  officer: [
    {
      id: "notif-off-1",
      title: "Predicted Hotspot Threat Alert",
      desc: "Andheri East withdrawal surge predicted between 19:00 - 22:00 (Risk: 87%).",
      time: "2 mins ago",
      type: "critical",
      icon: "🚨",
      link: "/heatmap",
      read: false,
    },
    {
      id: "notif-off-2",
      title: "High Value Complaint Registered",
      desc: "Complaint CC-2026-00125 (₹4,50,000 corporate phishing) pending review.",
      time: "15 mins ago",
      type: "warning",
      icon: "📁",
      link: "/complaints",
      read: false,
    },
    {
      id: "notif-off-3",
      title: "ML Model Spatial Weights",
      desc: "CNN-LSTM predictive accuracy optimized to 86.4% on latest dataset.",
      time: "1 hour ago",
      type: "info",
      icon: "🤖",
      link: "/prediction",
      read: false,
    },
    {
      id: "notif-off-4",
      title: "Mule Account Chain Frozen",
      desc: "3 linked accounts frozen in coordination with Bank Fraud Unit.",
      time: "3 hours ago",
      type: "info",
      icon: "🔒",
      link: "/alerts",
      read: true,
    },
  ],
  citizen: [
    {
      id: "notif-cit-1",
      title: "Complaint Status Update",
      desc: "Your complaint CC001 is now Under Investigation by Cyber Crime Unit.",
      time: "5 mins ago",
      type: "warning",
      icon: "🔍",
      link: "/track-complaint",
      read: false,
    },
    {
      id: "notif-cit-2",
      title: "Urgent Phishing SMS Advisory",
      desc: "Fake electricity bill APK messages detected across Maharashtra circle.",
      time: "30 mins ago",
      type: "critical",
      icon: "🚨",
      link: "/citizen-alerts",
      read: false,
    },
    {
      id: "notif-cit-3",
      title: "Evidence Submitted Securely",
      desc: "Transaction slip and chat screenshots attached to complaint CC001.",
      time: "2 hours ago",
      type: "info",
      icon: "📎",
      link: "/my-complaints",
      read: false,
    },
    {
      id: "notif-cit-4",
      title: "Security Tip: Enable 2FA",
      desc: "Protect your banking credentials by enabling Two-Factor Authentication.",
      time: "1 day ago",
      type: "info",
      icon: "🛡️",
      link: "/citizen-alerts",
      read: true,
    },
  ],
  bank: [
    {
      id: "notif-bnk-1",
      title: "Rapid Mule Cash-Out Alert",
      desc: "Account AC-78945612 detected with 5 rapid UPI transfers in 3 minutes.",
      time: "Just now",
      type: "critical",
      icon: "🚨",
      link: "/suspicious-transactions",
      read: false,
    },
    {
      id: "notif-bnk-2",
      title: "High Risk ATM Node Triggered",
      desc: "Andheri West ATM #04 flagged with 94% risk probability.",
      time: "12 mins ago",
      type: "warning",
      icon: "🏧",
      link: "/atm-risk",
      read: false,
    },
    {
      id: "notif-bnk-3",
      title: "Emergency Fund Freeze Mandate",
      desc: "Freeze mandate received for ₹2,40,000 on beneficiary account AC-45612389.",
      time: "40 mins ago",
      type: "critical",
      icon: "🔒",
      link: "/fund-blocking",
      read: false,
    },
    {
      id: "notif-bnk-4",
      title: "Daily Risk Report Ready",
      desc: "Automated fraud prevention analytics report for today has been generated.",
      time: "3 hours ago",
      type: "info",
      icon: "📊",
      link: "/bank-reports",
      read: true,
    },
  ],
};

function Header({ title }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const dropdownRef = useRef(null);

  // Identify current portal role
  const isCitizen =
    location.pathname.startsWith("/citizen") ||
    [
      "/report-cybercrime",
      "/upload-evidence",
      "/my-complaints",
      "/track-complaint",
      "/citizen-alerts",
      "/citizen-profile",
    ].includes(location.pathname);

  const isBank =
    location.pathname.startsWith("/bank") ||
    [
      "/suspicious-transactions",
      "/atm-risk",
      "/fund-blocking",
      "/bank-analytics",
      "/bank-reports",
      "/bank-settings",
      "/bank-risk-alerts",
    ].includes(location.pathname);

  const roleKey = isCitizen ? "citizen" : isBank ? "bank" : "officer";

  const [notificationList, setNotificationList] = useState([]);

  // Fetch real notifications from database on load and when portal role changes
  useEffect(() => {
    fetch('http://localhost:3001/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.slice(0, 15).map(n => ({
            id: n.id,
            title: n.title,
            desc: n.message,
            time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: (n.type || 'info').toLowerCase(),
            icon: n.type === 'Alert' ? '🚨' : n.type === 'Warning' ? '⚠️' : '🔔',
            link: n.link || (isCitizen ? '/my-complaints' : isBank ? '/bank-risk-alerts' : '/alerts'),
            read: !!n.isRead
          }));
          setNotificationList(mapped);
        } else {
          setNotificationList(defaultNotifications[roleKey] || defaultNotifications.officer);
        }
      })
      .catch(() => {
        setNotificationList(defaultNotifications[roleKey] || defaultNotifications.officer);
      });
  }, [roleKey, isCitizen, isBank]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notificationList.filter((n) => !n.read).length;

  const filteredNotifications = notificationList.filter((item) => {
    if (activeFilter === "unread") return !item.read;
    if (activeFilter === "critical") return item.type === "critical" || item.type === "alert" || item.type === "warning";
    return true;
  });

  async function markAllRead() {
    setNotificationList((prev) => prev.map((n) => ({ ...n, read: true })));
    for (const notif of notificationList) {
      if (!notif.read && typeof notif.id === 'number') {
        try {
          await fetch(`http://localhost:3001/api/notifications/${notif.id}/read`, { method: 'PUT' });
        } catch (_) {}
      }
    }
  }

  function clearAll() {
    setNotificationList([]);
  }

  async function handleItemClick(item) {
    setNotificationList((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    if (!item.read && typeof item.id === 'number') {
      try {
        await fetch(`http://localhost:3001/api/notifications/${item.id}/read`, { method: 'PUT' });
      } catch (_) {}
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  }

  // Profile avatar and labels
  const { currentUser } = useAuth();
  const profileConfig = currentUser
    ? {
        avatar: currentUser.role === "citizen" ? "CU" : currentUser.role === "bank" ? "BK" : "OF",
        name: currentUser.fullName || (currentUser.role === "citizen" ? "Citizen User" : currentUser.role === "bank" ? "Bank Officer" : "Officer"),
        role: currentUser.designation || (currentUser.role === "citizen" ? "Public Citizen" : currentUser.role === "bank" ? "Fraud Prevention Unit" : "Law Enforcement")
      }
    : (isCitizen
    ? { avatar: "CU", name: "Citizen User", role: "Public Citizen" }
    : isBank
    ? { avatar: "BK", name: "Bank Officer", role: "Fraud Prevention Unit" }
    : { avatar: "OF", name: "Officer", role: "Law Enforcement" });

  return (
    <header className="header">
      <div>
        <h1>{title}</h1>
        <p>Cybercrime Predictive Intelligence System</p>
      </div>

      <div className="header-right">
        <ThemeToggle />

        {/* Notification Bell with Interactive Dropdown */}
        <div className="notification-wrapper" ref={dropdownRef}>
          <button
            className={`notification-btn ${isOpen ? "active" : ""}`}
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            title="System Alerts & Notifications"
            aria-label="View Notifications"
          >
            🔔
            {unreadCount > 0 && <span>{unreadCount}</span>}
          </button>

          {isOpen && (
            <div className="notification-dropdown">
              <div className="notif-header">
                <div className="notif-title">
                  <strong>🔔 Notifications</strong>
                  {unreadCount > 0 && (
                    <span className="notif-count-badge">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <div className="notif-actions">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="notif-action-link"
                      onClick={markAllRead}
                    >
                      ✓ Mark all read
                    </button>
                  )}
                  {notificationList.length > 0 && (
                    <button
                      type="button"
                      className="notif-action-link clear"
                      onClick={clearAll}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="notif-tabs">
                <button
                  type="button"
                  className={activeFilter === "all" ? "active" : ""}
                  onClick={() => setActiveFilter("all")}
                >
                  All ({notificationList.length})
                </button>
                <button
                  type="button"
                  className={activeFilter === "unread" ? "active" : ""}
                  onClick={() => setActiveFilter("unread")}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  type="button"
                  className={activeFilter === "critical" ? "active" : ""}
                  onClick={() => setActiveFilter("critical")}
                >
                  Critical (
                  {
                    notificationList.filter((n) => n.type === "critical")
                      .length
                  }
                  )
                </button>
              </div>

              {/* Notification List */}
              <div className="notif-body">
                {filteredNotifications.length === 0 ? (
                  <div className="notif-empty">
                    <span>🎉</span>
                    <p>No notifications to display</p>
                    <small>You're all caught up with latest alerts!</small>
                  </div>
                ) : (
                  filteredNotifications.map((item) => (
                    <div
                      key={item.id}
                      className={`notif-item ${
                        item.read ? "read" : "unread"
                      } ${item.type}`}
                      onClick={() => handleItemClick(item)}
                    >
                      <div className={`notif-icon-badge ${item.type}`}>
                        {item.icon}
                      </div>
                      <div className="notif-content">
                        <div className="notif-item-top">
                          <strong>{item.title}</strong>
                          <small>{item.time}</small>
                        </div>
                        <p>{item.desc}</p>
                        {!item.read && <span className="unread-dot"></span>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Quick Link */}
              <div className="notif-footer">
                <Link
                  to={
                    isCitizen
                      ? "/citizen-alerts"
                      : isBank
                      ? "/bank-risk-alerts"
                      : "/alerts"
                  }
                  onClick={() => setIsOpen(false)}
                >
                  View All Threat Alerts →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="user-profile">
          <div className="avatar">{profileConfig.avatar}</div>

          <div>
            <strong>{profileConfig.name}</strong>
            <small>{profileConfig.role}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

function Layout({ children, title }) {
  return (
    <div className="app-layout">
      <OfficerSidebar />

      <main className="main-content">
        <Header title={title} />

        <div className="page-content page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}

/* =====================================================
   OFFICER DASHBOARD
===================================================== */

function Dashboard() {
  const [period, setPeriod] = useState('all');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const fetchStats = (p) => {
    setStatsLoading(true);
    setStatsError(null);
    fetch('http://localhost:3001/api/dashboard/stats?period=' + p)
      .then(res => { if (!res.ok) throw new Error('API error ' + res.status); return res.json(); })
      .then(data => { setStats(data); setStatsLoading(false); })
      .catch(err => { setStatsError(err.message); setStatsLoading(false); });
  };

  useEffect(() => { fetchStats(period); }, [period]);

  const rd = (stats && stats.riskDistribution) || {};
  const recentAlerts = (stats && stats.recentAlerts) || [];
  const recentComplaints = (stats && stats.recentComplaints) || [];

  const fmt = (n) => n == null ? '...' : Number(n).toLocaleString('en-IN');

  return (
    <Layout title="Dashboard">
      <div className="stats-grid">
        <StatCard
          title="Total Complaints"
          value={statsLoading ? '...' : statsError ? 'N/A' : fmt(stats.totalComplaints)}
          change={stats && !statsLoading ? (period === 'today' ? 'Today' : period === '7days' ? 'Last 7 Days' : period === '30days' ? 'Last 30 Days' : 'All Time') : ''}
          icon="📁"
        />

        <StatCard
          title="Predicted Hotspots"
          value={statsLoading ? '...' : statsError ? 'N/A' : fmt(stats.predictedHotspots)}
          change={statsLoading ? '' : 'High-Risk Areas'}
          icon="📍"
        />

        <StatCard
          title="Active Alerts"
          value={statsLoading ? '...' : statsError ? 'N/A' : fmt(stats.activeAlerts)}
          change={statsLoading ? '' : 'Live DB Count'}
          icon="🚨"
        />

        <StatCard
          title="Model Accuracy"
          value={statsLoading ? '...' : (stats && stats.modelAccuracy != null) ? (stats.modelAccuracy * 100).toFixed(1) + '%' : 'N/A'}
          change="ML Evaluation"
          icon="🎯"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card large-card">
          <div className="card-header">
            <div>
              <h3>Cybercrime Risk Overview</h3>
              <p>Predicted risk distribution from database</p>
            </div>

            <select value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {statsLoading ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Loading risk data...</p>
          ) : statsError ? (
            <p style={{ color: 'var(--danger)', padding: '1rem' }}>Could not load risk distribution.</p>
          ) : (
            <>
              <RiskBar name="Very High Risk" value={rd.veryHigh || 0} color="danger" />
              <RiskBar name="High Risk"      value={rd.high     || 0} color="warning" />
              <RiskBar name="Medium Risk"    value={rd.medium   || 0} color="medium" />
              <RiskBar name="Low Risk"       value={rd.low      || 0} color="safe" />
            </>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Recent Alerts</h3>
              <p>Latest active risk notifications</p>
            </div>
            <Link to="/alerts" className="text-link">View All →</Link>
          </div>

          {statsLoading ? (
            <p style={{ color: 'var(--text-muted)', padding: '0.75rem' }}>Loading alerts...</p>
          ) : recentAlerts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '0.75rem' }}>No active alerts.</p>
          ) : recentAlerts.map((alert) => (
            <div className="mini-alert" key={alert.id}>
              <div className="alert-icon">🚨</div>
              <div>
                <strong>{alert.location}</strong>
                <span>Risk Score: {alert.score}% · {alert.level}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Recent Cybercrime Complaints</h3>
            <p>Latest complaints from database</p>
          </div>

          <Link to="/complaints" className="text-link">
            View All →
          </Link>
        </div>

        {statsLoading ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Loading complaints...</p>
        ) : recentComplaints.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>No complaints found.</p>
        ) : (
          <ComplaintTable data={recentComplaints.map(d => ({ ...d, id: d.complaintId || d.id }))} />
        )}
      </div>
    </Layout>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className="stat-icon">
          {icon}
        </div>

        <span className="positive">
          {change}
        </span>
      </div>

      <h2>{value}</h2>

      <p>{title}</p>
    </div>
  );
}

function RiskBar({
  name,
  value,
  color,
}) {
  return (
    <div className="risk-bar">
      <div className="risk-bar-label">
        <span>{name}</span>
        <strong>{value}%</strong>
      </div>

      <div className="bar-background">
        <div
          className={`bar-fill ${color}`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
}

/* =====================================================
   COMPLAINTS
===================================================== */

function Complaints() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All Crime Types");
  const [filterState, setFilterState] = useState("All States");
  const [filterDistrict, setFilterDistrict] = useState("All Districts");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [apiCases, setApiCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);

  // New Complaint Form State
  const [newComplaint, setNewComplaint] = useState({
    type: "UPI Fraud",
    state: statesData.states[0].state,
    district: statesData.states[0].districts[0],
    amount: "₹",
  });

  const fetchCases = (currentPage = page) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(limit),
      search: search.trim(),
      type: filterType,
      state: filterState,
      district: filterDistrict,
      status: filterStatus
    });

    fetch(`http://localhost:3001/api/cases?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data && Array.isArray(data.data)) {
          const mappedData = data.data.map(d => ({ ...d, id: d.complaintId || d.id }));
          setApiCases(mappedData);
          setTotalCount(data.pagination ? data.pagination.total : mappedData.length);
          setTotalPages(data.pagination ? data.pagination.totalPages : 1);
        } else if (Array.isArray(data)) {
          const mappedData = data.map(d => ({ ...d, id: d.complaintId || d.id }));
          setApiCases(mappedData);
          setTotalCount(mappedData.length);
          setTotalPages(1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCases(page);
  }, [page, limit, filterType, filterState, filterDistrict, filterStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCases(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAddNewComplaint = async () => {
    const newId = `COMP-${Math.floor(10000 + Math.random() * 90000)}`;
    const today = new Date().toISOString().split("T")[0];
    const newCase = {
      id: newId,
      complaintId: newId,
      type: newComplaint.type,
      location: `Unknown Street, ${newComplaint.district}, ${newComplaint.state}`,
      state: newComplaint.state,
      district: newComplaint.district,
      amount: newComplaint.amount,
      date: today,
      status: "Pending"
    };
    
    try {
      const res = await fetch('http://localhost:3001/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCase)
      });
      if (res.ok) {
        setShowNewModal(false);
        setPage(1);
        fetchCases(1);
        setNewComplaint({ 
          type: "UPI Fraud", 
          state: statesData.states[0].state, 
          district: statesData.states[0].districts[0], 
          amount: "₹" 
        });
      } else {
        alert("Failed to register complaint to database.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving complaint.");
    }
  };

  const startRecord = totalCount > 0 ? (page - 1) * limit + 1 : 0;
  const endRecord = totalCount > 0 ? Math.min(page * limit, totalCount) : 0;

  return (
    <Layout title="Complaint Analysis">
      <div className="page-toolbar">
        <div>
          <h2>Cybercrime Complaints</h2>
          <p>
            Central database registry — <strong>{totalCount > 0 ? totalCount.toLocaleString('en-IN') : '...'}</strong> total verified complaints
          </p>
        </div>

        <button className="primary-btn" onClick={() => setShowNewModal(true)}>
          + New Complaint
        </button>
      </div>

      <div className="filter-card">
        <input
          placeholder="🔍 Search complaint ID, location, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option>All Crime Types</option>
          <option>UPI Fraud</option>
          <option>Phishing</option>
          <option>ATM Fraud</option>
          <option>Financial Fraud</option>
          <option>Identity Theft</option>
          <option>Investment Scam</option>
          <option>Loan App Harassment</option>
        </select>

        <select value={filterState} onChange={(e) => {
          setFilterState(e.target.value);
          setFilterDistrict("All Districts");
          setPage(1);
        }}>
          <option>All States</option>
          {statesData.states.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
        </select>

        <select 
          value={filterDistrict} 
          onChange={(e) => { setFilterDistrict(e.target.value); setPage(1); }}
          disabled={filterState === "All States"}
        >
          <option>All Districts</option>
          {filterState !== "All States" && 
            statesData.states.find(s => s.state === filterState)?.districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))
          }
        </select>

        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option>All Status</option>
          <option>Pending</option>
          <option>Analyzed</option>
          <option>Under Investigation</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing <strong>{startRecord.toLocaleString('en-IN')}–{endRecord.toLocaleString('en-IN')}</strong> of <strong>{totalCount.toLocaleString('en-IN')}</strong> records
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rows:</span>
            <select 
              value={limit} 
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px' }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>Loading complaints from centralized database...</p>
        ) : apiCases.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>No complaints matched your search filter.</p>
        ) : (
          <ComplaintTable data={apiCases} />
        )}

        {/* Server-Side Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--line)', flexWrap: 'wrap', gap: '10px' }}>
            <button
              className="secondary-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              ◀ Previous
            </button>

            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages.toLocaleString('en-IN')}</strong>
            </span>

            <button
              className="secondary-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ opacity: page >= totalPages ? 0.5 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next ▶
            </button>
          </div>
        )}
      </div>

      {showNewModal && createPortal(
        <div 
          className="custom-modal-backdrop" 
          onClick={(e) => {
            if (e.target.className === "custom-modal-backdrop") setShowNewModal(false);
          }}
        >
          <div className="custom-modal-dialog">
            <div className="custom-modal-header">
              <h2>Register New Complaint</h2>
              <button className="custom-modal-close" onClick={() => setShowNewModal(false)}>&times;</button>
            </div>
            <div className="custom-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#a5bdd3', textTransform: 'uppercase', letterSpacing: '.05em' }}>Crime Type</label>
                <select 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(57,215,255,0.25)', backgroundColor: '#0a1526', color: '#e0f0ff', colorScheme: 'dark' }}
                  value={newComplaint.type}
                  onChange={(e) => setNewComplaint({...newComplaint, type: e.target.value})}
                >
                  <option style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>UPI Fraud</option>
                  <option style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Phishing</option>
                  <option style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>ATM Fraud</option>
                  <option style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Identity Theft</option>
                  <option style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Financial Fraud</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#a5bdd3', textTransform: 'uppercase', letterSpacing: '.05em' }}>State</label>
                <select 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(57,215,255,0.25)', backgroundColor: '#0a1526', color: '#e0f0ff', colorScheme: 'dark' }}
                  value={newComplaint.state}
                  onChange={(e) => {
                    const newState = e.target.value;
                    const districts = statesDistrictsMap[newState] || [];
                    setNewComplaint({...newComplaint, state: newState, district: districts[0] || ""});
                  }}
                >
                  {Object.keys(statesDistrictsMap).sort().map(s => (
                    <option key={s} value={s} style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#a5bdd3', textTransform: 'uppercase', letterSpacing: '.05em' }}>District</label>
                <select 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(57,215,255,0.25)', backgroundColor: '#0a1526', color: '#e0f0ff', colorScheme: 'dark' }}
                  value={newComplaint.district}
                  onChange={(e) => setNewComplaint({...newComplaint, district: e.target.value})}
                >
                  {(statesDistrictsMap[newComplaint.state] || []).map(d => (
                    <option key={d} value={d} style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#a5bdd3', textTransform: 'uppercase', letterSpacing: '.05em' }}>Amount Defrauded</label>
                <input 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(57,215,255,0.25)', backgroundColor: '#0a1526', color: '#e0f0ff', colorScheme: 'dark' }}
                  placeholder="e.g. ₹50,000"
                  value={newComplaint.amount}
                  onChange={(e) => setNewComplaint({...newComplaint, amount: e.target.value})}
                />
              </div>

              <button 
                className="primary-btn" 
                style={{ width: '100%', marginTop: '10px', padding: '12px' }}
                onClick={handleAddNewComplaint}
              >
                Submit Complaint
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
}

function ComplaintTable({ data }) {
  const navigate = useNavigate();

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Complaint ID</th>
            <th>Crime Type</th>
            <th>Location</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.id}</strong>
              </td>

              <td>{item.type}</td>

              <td>📍 {item.location}</td>

              <td>{item.amount}</td>

              <td>{item.date}</td>

              <td>
                <span
                  className={
                    item.status === "Analyzed" || item.status === "Resolved"
                      ? "badge success"
                      : item.status === "Under Investigation"
                      ? "badge warning"
                      : "badge pending"
                  }
                >
                  {item.status}
                </span>
              </td>

              <td>
                <button
                  className="small-btn"
                  onClick={() =>
                    navigate(`/prediction?complaintId=${encodeURIComponent(item.id)}`)
                  }
                >
                  Analyze
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =====================================================
   PREDICTION
===================================================== */

/* =====================================================
   OFFICER WITHDRAWAL PREDICTION ENGINE
===================================================== */

function Prediction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qComplaintId = searchParams.get('complaintId');

  const [mode, setMode] = useState("complaint"); // "complaint" | "sandbox"
  const [selectedComplaintId, setSelectedComplaintId] = useState(qComplaintId || "");
  const [selectedModel, setSelectedModel] = useState("Gradient-Boosting");
  const [spatialWeight, setSpatialWeight] = useState(0.85);
  const [temporalWeight, setTemporalWeight] = useState(0.75);
  const [dbComplaints, setDbComplaints] = useState([]);
  const [dbComplaintsLoading, setDbComplaintsLoading] = useState(true);

  // Fetch complaints list from backend
  useEffect(() => {
    setDbComplaintsLoading(true);
    fetch('http://localhost:3001/api/cases?limit=100')
      .then(res => res.json())
      .then(async data => {
        const list = data.data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        const mapped = list.map(d => ({ ...d, id: d.complaintId || d.id }));
        
        // If specific complaintId in query param but not in list, fetch it directly
        if (qComplaintId && !mapped.some(c => c.id === qComplaintId)) {
          try {
            const singleRes = await fetch(`http://localhost:3001/api/cases/${encodeURIComponent(qComplaintId)}`);
            if (singleRes.ok) {
              const singleCase = await singleRes.json();
              mapped.unshift({ ...singleCase, id: singleCase.complaintId || singleCase.id });
            }
          } catch (e) {
            console.warn("Could not fetch query complaint:", e);
          }
        }

        setDbComplaints(mapped);
        const activeId = qComplaintId && mapped.some(c => c.id === qComplaintId) ? qComplaintId : (mapped[0]?.id || "");
        setSelectedComplaintId(activeId);
        const initialFound = mapped.find(c => c.id === activeId);
        if (initialFound && initialFound.predictionData) {
          setPrediction(initialFound.predictionData);
        }
        setDbComplaintsLoading(false);
      })
      .catch(err => { console.error(err); setDbComplaintsLoading(false); });
  }, [qComplaintId]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  // Selected complaint object (from DB list)
  const currentComplaint = dbComplaints.find((c) => c.id === selectedComplaintId) || dbComplaints[0] || {};

  // Sandbox state
  const [sandboxForm, setSandboxForm] = useState({
    category: "Financial Cyber Fraud (UPI Layering)",
    amount: "₹1,50,000",
    city: "Mumbai",
    location: "Western Express Corridor, Andheri",
    time: "19:15",
    velocity: "Rapid 5-Burst Micro-Transfers",
    victimBank: "State Bank of India",
  });

  // Current active prediction
  const [prediction, setPrediction] = useState(null);

  // Dispatched units state
  const [dispatchedAtms, setDispatchedAtms] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  }

  // When complaint changes in complaint mode, automatically update prediction
  function handleComplaintChange(id) {
    setSelectedComplaintId(id);
    const found = dbComplaints.find((c) => c.id === id);
    if (found && found.predictionData) {
      setPrediction(found.predictionData);
    } else {
      setPrediction(null);
    }
  }

  // Run AI Spatio-Temporal Inference via Python ML Backend
  async function handleRunInference() {
    setIsAnalyzing(true);
    setAnalysisStep(1);

    setTimeout(() => setAnalysisStep(2), 250);
    setTimeout(() => setAnalysisStep(3), 500);
    
    try {
      const payload = mode === "complaint" 
        ? {
            ...currentComplaint,
            complaintId: currentComplaint.id || selectedComplaintId,
            crimeType: currentComplaint.type,
            amount: currentComplaint.amount,
            state: currentComplaint.state,
            district: currentComplaint.district || currentComplaint.city
          }
        : sandboxForm;

      const response = await fetch("http://localhost:3001/api/analyze-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const mlData = await response.json();
      setAnalysisStep(4);
      
      if (mode === "complaint") {
        const enriched = {
          ...(currentComplaint.predictionData || {}),
          ...mlData,
          complaintId: currentComplaint.id,
          location: currentComplaint.location || mlData.location,
          time: currentComplaint.time || "18:00 - 21:00",
          velocity: currentComplaint.type?.includes("UPI") ? "Rapid 5-Burst Micro-Transfers" : "High-Frequency ATM Cashout",
          nearby: "12 Node Perimeter",
          atms: [
            { id: `ATM-${currentComplaint.id}-1`, name: `SBI Main Branch Kiosk (${currentComplaint.district || 'City'})`, dist: '0.4 km', threat: `${mlData.score || 85}%`, cctv: '94% Online' },
            { id: `ATM-${currentComplaint.id}-2`, name: `HDFC Express Dispenser (${currentComplaint.district || 'Hub'})`, dist: '0.8 km', threat: `${Math.max(40, (mlData.score || 85) - 10)}%`, cctv: '88% Online' }
          ]
        };
        setPrediction(enriched);
      } else {
        setPrediction({
          score: mlData.score || 75,
          riskLevel: mlData.riskLevel || "MEDIUM",
          location: sandboxForm.location,
          coordinates: mlData.coordinates || [19.0760, 72.8777],
          latitude: mlData.latitude || 19.0760,
          longitude: mlData.longitude || 72.8777,
          time: sandboxForm.time,
          nearby: "Python ML Output",
          velocity: sandboxForm.velocity,
          confidence: mlData.confidence || "85.0%",
          model: mlData.model || "Gradient Boosting Threat Classifier",
          recommendedAction: mlData.recommendedAction || "Monitor closely.",
          atms: []
        });
      }
    } catch (err) {
      console.error("ML inference failed", err);
      showToast("Error connecting to Python ML Service");
    } finally {
      setIsAnalyzing(false);
      showToast("✓ Spatio-temporal predictive inference complete!");
    }
  }

  function handleDispatchPatrol(atm) {
    setDispatchedAtms((prev) => ({ ...prev, [atm.id]: true }));
    showToast(
      `🚨 Quick-Response Mobile Patrol Unit dispatched to ${atm.name} (${atm.dist} away). ETA: 5-8 mins.`
    );
  }

  function handleDispatchSectorPatrol() {
    showToast(
      `🚨 Sector Quick-Response Unit alerted for ${prediction?.location || currentComplaint.location}. Live tracking geofence active.`
    );
  }

  function handleFreezeNotice() {
    alert(
      `[EMERGENCY 102 CrPC MANDATE ISSUED]\n\nNotice transmitted to Nodal Banking Desks for immediate debit hold on suspect beneficiary accounts linked to ${prediction?.location || currentComplaint.location}.\nSupervising Officer: LEA-10245`
    );
    showToast("🔒 Urgent Inter-Bank Freeze Order broadcasted to Bank Nodal Officers.");
  }

  function handleExportDossier() {
    alert(
      `[TACTICAL INTELLIGENCE DOSSIER READY]\n\nTarget Location: ${prediction?.location || currentComplaint.location}\nRisk Score: ${prediction?.score || 85}%\nExtraction Window: ${prediction?.time || '18:00 - 21:00'}\nFormat: Encrypted Law Enforcement PDF Dossier\nClassification: RESTRICTED - LEA PATROL USE`
    );
    showToast("📥 Tactical Intelligence Dossier exported to encrypted PDF.");
  }

  // Dynamic deep link to Heatmap with target coordinates & complaint details
  const targetCoords = prediction?.coordinates || [prediction?.latitude || currentComplaint.latitude || 19.0760, prediction?.longitude || currentComplaint.longitude || 72.8777];
  const targetLat = targetCoords[0] || 19.0760;
  const targetLng = targetCoords[1] || 72.8777;
  const targetLoc = prediction?.location || currentComplaint.location || 'Target Area';
  const targetScore = prediction?.score || currentComplaint?.predictionData?.score || 85;
  const targetLevel = prediction?.riskLevel || currentComplaint?.predictionData?.riskLevel || 'HIGH';
  const targetId = prediction?.complaintId || selectedComplaintId || 'TARGET';
  const mapDeepLink = `/heatmap?lat=${targetLat}&lng=${targetLng}&zoom=13&complaintId=${encodeURIComponent(targetId)}&location=${encodeURIComponent(targetLoc)}&riskLevel=${encodeURIComponent(targetLevel)}&score=${targetScore}&state=${encodeURIComponent(currentComplaint.state || '')}&district=${encodeURIComponent(currentComplaint.district || '')}`;

  return (
    <Layout title="Predictive Withdrawal Intelligence">
      <div className="page-toolbar">
        <div>
          <h2>AI Spatio-Temporal Prediction Engine</h2>
          <p>
            Forecast ATM cash-out locations, high-risk withdrawal windows, and tactical patrol dispatch routes
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => navigate(mapDeepLink)}
          >
            🗺️ Live GIS Radar Map
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={handleExportDossier}
          >
            📑 Export Prediction Dossier
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className="success-message"
          style={{
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="prediction-grid" style={{ gridTemplateColumns: "1.1fr 1.35fr", gap: "20px" }}>
        {/* Left Column: Model Parameters & Incident Selector */}
        <div className="card">
          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              padding: "4px",
              background: "rgba(4, 12, 24, 0.6)",
              borderRadius: "12px",
              border: "1px solid var(--line)",
              marginBottom: "18px",
            }}
          >
            <button
              type="button"
              className={mode === "complaint" ? "primary-btn" : "secondary-btn"}
              style={{ padding: "9px 12px", fontSize: "12.5px" }}
              onClick={() => setMode("complaint")}
            >
              📋 Registered Complaints
            </button>
            <button
              type="button"
              className={mode === "sandbox" ? "primary-btn" : "secondary-btn"}
              style={{ padding: "9px 12px", fontSize: "12.5px" }}
              onClick={() => setMode("sandbox")}
            >
              ⚡ Custom Simulation Sandbox
            </button>
          </div>

          {mode === "complaint" ? (
            <>
              <label>Select Active Cybercrime Complaint</label>
              {dbComplaintsLoading ? (
                <p style={{ color: 'var(--text-muted)', padding: '8px' }}>Loading complaints from database...</p>
              ) : (
                <select
                  value={selectedComplaintId}
                  onChange={(e) => handleComplaintChange(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", fontSize: "14px", borderRadius: "10px" }}
                >
                  {dbComplaints.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id} — {item.type} ({item.amount}) • {item.location}
                    </option>
                  ))}
                </select>
              )}

              <div className="input-details" style={{ marginTop: "14px" }}>
                <div>
                  <span>Crime Category</span>
                  <strong>{currentComplaint.type}</strong>
                </div>

                <div>
                  <span>Defrauded Amount</span>
                  <strong style={{ color: "var(--cyan)" }}>{currentComplaint.amount}</strong>
                </div>

                <div>
                  <span>Incident Origin</span>
                  <strong>📍 {currentComplaint.location}</strong>
                </div>

                <div>
                  <span>Incident Timestamp</span>
                  <strong>🕐 {currentComplaint.time}</strong>
                </div>

                <div>
                  <span>Victim Bank Entity</span>
                  <strong>{currentComplaint.victimBank}</strong>
                </div>

                <div>
                  <span>Suspect Mule Account</span>
                  <strong style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                    {currentComplaint.suspectMule}
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-two-column">
                <div>
                  <label>Crime Category</label>
                  <select
                    value={sandboxForm.category}
                    onChange={(e) =>
                      setSandboxForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                  >
                    <option value="Financial Cyber Fraud (UPI Layering)">
                      UPI Rapid Layering
                    </option>
                    <option value="ATM Card Skimming & Cloning">
                      ATM Card Skimming &amp; Cloning
                    </option>
                    <option value="Phishing & SIM Swap Fraud">
                      Phishing &amp; SIM Swap
                    </option>
                    <option value="Corporate Investment Scam">
                      Corporate Investment Scam
                    </option>
                    <option value="Call Center Scam Syndicate">
                      Call Center Scam Syndicate
                    </option>
                  </select>
                </div>

                <div>
                  <label>Transaction Amount (₹)</label>
                  <input
                    type="text"
                    value={sandboxForm.amount}
                    onChange={(e) =>
                      setSandboxForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="e.g. ₹1,50,000"
                  />
                </div>
              </div>

              <div className="form-two-column">
                <div>
                  <label>City Hub</label>
                  <select
                    value={sandboxForm.city}
                    onChange={(e) =>
                      setSandboxForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Pune">Pune</option>
                    <option value="Bengaluru">Bengaluru</option>
                  </select>
                </div>

                <div>
                  <label>Incident Time</label>
                  <input
                    type="time"
                    value={sandboxForm.time}
                    onChange={(e) =>
                      setSandboxForm((prev) => ({ ...prev, time: e.target.value }))
                    }
                  />
                </div>
              </div>

              <label>Corridor / Origin Landmark</label>
              <input
                type="text"
                value={sandboxForm.location}
                onChange={(e) =>
                  setSandboxForm((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="e.g. Western Express Corridor, Andheri"
              />
            </>
          )}

          {/* AI Model Architecture & Hyperparameter Tuning */}
          <div
            style={{
              marginTop: "18px",
              padding: "15px",
              borderRadius: "12px",
              background: "rgba(57, 215, 255, 0.03)",
              border: "1px solid rgba(57, 215, 255, 0.12)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <strong style={{ fontSize: "12.5px", color: "var(--cyan)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
                🤖 Neural Network Model
              </strong>
              <span className="badge success" style={{ fontSize: "11px" }}>
                86.4% Benchmark Acc
              </span>
            </div>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontSize: "13px", borderRadius: "8px", marginBottom: "12px" }}
            >
              <option value="CNN-LSTM">
                Hybrid CNN-LSTM (Spatial-Temporal Sequence) - Recommended
              </option>
              <option value="GNN">
                Spatial Graph Neural Network (GNN Mule Velocity)
              </option>
              <option value="RF-DBSCAN">
                Random Forest + DBSCAN Spatial Density Clustering
              </option>
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#8da6be", marginBottom: "4px" }}>
                  <span>Spatial Proximity</span>
                  <strong>{spatialWeight}</strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={spatialWeight}
                  onChange={(e) => setSpatialWeight(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--cyan)" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#8da6be", marginBottom: "4px" }}>
                  <span>Temporal Decay</span>
                  <strong>{temporalWeight}</strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={temporalWeight}
                  onChange={(e) => setTemporalWeight(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--cyan)" }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="primary-btn full"
            style={{ marginTop: "18px", padding: "13px", fontSize: "14px", fontWeight: 700 }}
            onClick={handleRunInference}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "⚙️ Running Neural Spatio-Temporal Inference..." : "🤖 Run Spatio-Temporal Prediction"}
          </button>
        </div>

        {/* Right Column: Prediction Intelligence HUD */}
        <div className="card prediction-result">
          {isAnalyzing ? (
            <div className="empty-state" style={{ minHeight: "450px" }}>
              <div style={{ fontSize: "52px", animation: "radarSpin 3s linear infinite" }}>
                📡
              </div>
              <h3 style={{ marginTop: "18px", color: "var(--cyan)" }}>
                Computing Spatial-Temporal Convergence...
              </h3>
              <p style={{ maxWidth: "420px", color: "#8da6be", fontSize: "13px" }}>
                {analysisStep === 1 && "Step 1/4: Ingesting transaction coordinates & IP proxy vectors..."}
                {analysisStep === 2 && "Step 2/4: Running CNN spatial feature map extraction across 142 clusters..."}
                {analysisStep === 3 && "Step 3/4: LSTM sequence matching for cash extraction velocity..."}
                {analysisStep === 4 && "Step 4/4: Calculating ATM vulnerability index..."}
              </p>
              <div
                style={{
                  width: "280px",
                  height: "6px",
                  background: "rgba(57,215,255,0.1)",
                  borderRadius: "999px",
                  overflow: "hidden",
                  marginTop: "16px",
                }}
              >
                <div
                  style={{
                    width: `${analysisStep * 25}%`,
                    height: "100%",
                    background: "var(--cyan)",
                    transition: "width 0.25s ease",
                  }}
                />
              </div>
            </div>
          ) : !prediction ? (
            <div className="empty-state">
              <div>🤖</div>
              <h3>Prediction Ready</h3>
              <p>Select a complaint or simulate parameters and generate prediction.</p>
            </div>
          ) : (
            <>
              {/* Result Header */}
              <div className="result-header">
                <div>
                  <span style={{ fontSize: "11px", color: "#8ca5bd", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
                    AI Predictive Assessment
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                    <strong style={{ fontSize: "16px", color: "#fff" }}>
                      Predicted Cash-Out Intelligence
                    </strong>
                    <span
                      className={`badge ${
                        prediction.score >= 85
                          ? "danger"
                          : prediction.score >= 70
                          ? "pending"
                          : "success"
                      }`}
                    >
                      {prediction.riskLevel} WITHDRAWAL RISK
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "12px",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--cyan)",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "rgba(57,215,255,0.08)",
                  }}
                >
                  🎯 {prediction.confidence} Confidence
                </span>
              </div>

              {/* Risk Score Circle with Animated SVG Gauge */}
              <div className="risk-score" style={{ padding: "18px 0" }}>
                <div className="score-circle-wrapper">
                  <svg className="score-ring-svg" viewBox="0 0 190 190" width="190" height="190">
                    {/* Background track */}
                    <circle
                      cx="95" cy="95" r="82"
                      fill="none"
                      stroke="rgba(140,165,189,0.08)"
                      strokeWidth="7"
                    />
                    {/* Animated arc fill */}
                    <circle
                      cx="95" cy="95" r="82"
                      fill="none"
                      className="score-ring-arc"
                      stroke={
                        prediction.score >= 85
                          ? "#ff4d67"
                          : prediction.score >= 70
                          ? "#ffd166"
                          : "#35e7a3"
                      }
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 82}`}
                      strokeDashoffset={`${2 * Math.PI * 82 * (1 - prediction.score / 100)}`}
                      transform="rotate(-90 95 95)"
                      style={{
                        filter: `drop-shadow(0 0 6px ${
                          prediction.score >= 85
                            ? "rgba(255,77,103,.45)"
                            : prediction.score >= 70
                            ? "rgba(255,209,102,.45)"
                            : "rgba(53,231,163,.45)"
                        })`,
                      }}
                    />
                    {/* Rotating scanner dot on the arc tip */}
                    <circle
                      cx="95" cy="13"
                      r="4.5"
                      className="score-ring-dot"
                      fill={
                        prediction.score >= 85
                          ? "#ff8293"
                          : prediction.score >= 70
                          ? "#ffd873"
                          : "#5df0b5"
                      }
                      style={{
                        transformOrigin: "95px 95px",
                        animation: "scoreRingOrbit 4s linear infinite",
                        filter: `drop-shadow(0 0 8px ${
                          prediction.score >= 85
                            ? "rgba(255,77,103,.6)"
                            : prediction.score >= 70
                            ? "rgba(255,209,102,.6)"
                            : "rgba(53,231,163,.6)"
                        })`,
                      }}
                    />
                  </svg>
                  {/* Center text overlay */}
                  <div className="score-circle-text">
                    <strong
                      style={{
                        color:
                          prediction.score >= 85
                            ? "#ff8293"
                            : prediction.score >= 70
                            ? "#ffd873"
                            : "#5df0b5",
                      }}
                    >
                      {prediction.score}%
                    </strong>
                    <span>Withdrawal Threat</span>
                  </div>
                </div>
              </div>

              {/* Primary Telemetry */}
              <div className="prediction-info">
                <div>
                  <span>Predicted Withdrawal Hotspot Corridor</span>
                  <strong style={{ fontSize: "14.5px" }}>📍 {prediction.location}</strong>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <span>Expected Peak Window</span>
                    <strong>🕐 {prediction.time}</strong>
                  </div>

                  <div>
                    <span>High-Risk Dispensers</span>
                    <strong>🏧 {prediction.nearby}</strong>
                  </div>
                </div>

                <div>
                  <span>Mule Extraction Velocity Pattern</span>
                  <strong style={{ fontSize: "12.5px", color: "#cbd5e1" }}>
                    ⚡ {prediction.velocity}
                  </strong>
                </div>
              </div>

              {/* Tactical Recommendation Box */}
              <div
                style={{
                  marginTop: "16px",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "rgba(255, 157, 69, 0.05)",
                  border: "1px solid rgba(255, 157, 69, 0.2)",
                }}
              >
                <strong style={{ display: "block", color: "#ffd07c", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", marginBottom: "4px" }}>
                  🚨 Recommended Tactical Law Enforcement Action
                </strong>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "12.5px", lineHeight: "1.5" }}>
                  {prediction.recommendedAction}
                </p>
              </div>

              {/* Target ATM Vulnerability Matrix Table */}
              {prediction.atms && prediction.atms.length > 0 && (
                <div style={{ marginTop: "18px" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: "13.5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>🏧 High-Vulnerability Cash Dispenser Matrix</span>
                    <small style={{ color: "#8ca5bd", fontWeight: "normal", fontSize: "11px" }}>
                      Immediate Geofence Perimeter
                    </small>
                  </h4>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                      <thead>
                        <tr>
                          <th>ATM / Branch</th>
                          <th>Distance</th>
                          <th>Threat Index</th>
                          <th>CCTV Sensor</th>
                          <th style={{ textAlign: "right" }}>Patrol Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prediction.atms.map((atm) => (
                          <tr key={atm.id}>
                            <td>
                              <strong>{atm.name}</strong>
                              <small style={{ display: "block", color: "#8da6be", fontSize: "10.5px" }}>
                                {atm.id}
                              </small>
                            </td>
                            <td>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {atm.dist}
                              </span>
                            </td>
                            <td>
                              <span className={parseInt(atm.threat) >= 85 ? "badge danger" : "badge pending"}>
                                {atm.threat}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "11.5px", color: "#5df0b5" }}>
                                {atm.cctv}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className={dispatchedAtms[atm.id] ? "primary-btn" : "small-btn"}
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "11px",
                                  background: dispatchedAtms[atm.id] ? "var(--green)" : undefined,
                                  color: dispatchedAtms[atm.id] ? "#05150f" : undefined,
                                }}
                                onClick={() => handleDispatchPatrol(atm)}
                              >
                                {dispatchedAtms[atm.id] ? "✓ Dispatched" : "🚨 Dispatch Unit"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="prediction-actions" style={{ flexWrap: "wrap", marginTop: "20px" }}>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={handleDispatchSectorPatrol}
                >
                  🚨 Dispatch Sector Mobile Patrol
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleFreezeNotice}
                >
                  🔒 Issue Urgent Freeze Mandate
                </button>

                <Link to={mapDeepLink} className="primary-btn">
                  🗺️ View on Live GIS Map →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

/* =====================================================
   REALISTIC GIS MAP & INTELLIGENCE ENGINE
===================================================== */

const cityMapConfigs = {
  Mumbai: {
    center: [19.0760, 72.8777],
    zoom: 12,
  },
  Pune: {
    center: [18.5204, 73.8567],
    zoom: 12,
  },
  Delhi: {
    center: [28.6139, 77.2090],
    zoom: 12,
  },
  Bengaluru: {
    center: [12.9716, 77.5946],
    zoom: 12,
  },
};

const hotspotData = [
  // Mumbai Hotspots
  {
    id: "mumbai-1",
    city: "Mumbai",
    state: "Maharashtra",
    name: "Andheri East & West Corridor",
    coordinates: [19.1136, 72.8697],
    score: 87,
    level: "HIGH",
    complaints: 142,
    withdrawals: 68,
    nearbyAtms: 24,
    timeWindow: "19:00 - 22:00",
    category: "UPI & ATM Fraud",
    radius: 1500,
    cctvCoverage: "78%",
    highRiskAtms: [
      { id: "ATM-MUM-01", name: "SBI Main Link Rd", coords: [19.1165, 72.8650], risk: "92% Risk" },
      { id: "ATM-MUM-02", name: "HDFC Metro Station", coords: [19.1190, 72.8750], risk: "88% Risk" },
      { id: "ATM-MUM-03", name: "ICICI Western Express", coords: [19.1090, 72.8630], risk: "79% Risk" },
    ],
  },
  {
    id: "mumbai-2",
    city: "Mumbai",
    state: "Maharashtra",
    name: "South Mumbai Financial District",
    coordinates: [18.9322, 72.8264],
    score: 91,
    level: "CRITICAL",
    complaints: 186,
    withdrawals: 94,
    nearbyAtms: 32,
    timeWindow: "20:00 - 23:00",
    category: "Online Banking Fraud",
    radius: 1700,
    cctvCoverage: "88%",
    highRiskAtms: [
      { id: "ATM-MUM-04", name: "Axis Bank Fort Branch", coords: [18.9340, 72.8310], risk: "94% Risk" },
      { id: "ATM-MUM-05", name: "Bank of India Nariman", coords: [18.9270, 72.8220], risk: "89% Risk" },
    ],
  },
  {
    id: "mumbai-3",
    city: "Mumbai",
    state: "Maharashtra",
    name: "Bandra West & BKC Complex",
    coordinates: [19.0600, 72.8350],
    score: 64,
    level: "MEDIUM",
    complaints: 78,
    withdrawals: 32,
    nearbyAtms: 18,
    timeWindow: "18:00 - 21:00",
    category: "Phishing",
    radius: 1300,
    cctvCoverage: "84%",
    highRiskAtms: [
      { id: "ATM-MUM-06", name: "Kotak BKC Hub", coords: [19.0650, 72.8680], risk: "71% Risk" },
      { id: "ATM-MUM-07", name: "SBI Hill Road", coords: [19.0550, 72.8310], risk: "66% Risk" },
    ],
  },
  {
    id: "mumbai-4",
    city: "Mumbai",
    state: "Maharashtra",
    name: "Dadar Transit Commercial Hub",
    coordinates: [19.0178, 72.8478],
    score: 78,
    level: "HIGH",
    complaints: 110,
    withdrawals: 52,
    nearbyAtms: 20,
    timeWindow: "17:30 - 20:30",
    category: "ATM Skimming",
    radius: 1200,
    cctvCoverage: "72%",
    highRiskAtms: [
      { id: "ATM-MUM-08", name: "Canara Bank Dadar TT", coords: [19.0200, 72.8490], risk: "81% Risk" },
      { id: "ATM-MUM-09", name: "PNB Ranade Road", coords: [19.0150, 72.8430], risk: "76% Risk" },
    ],
  },
  {
    id: "mumbai-5",
    city: "Mumbai",
    state: "Maharashtra",
    name: "Thane West Commercial Center",
    coordinates: [19.2183, 72.9781],
    score: 69,
    level: "MEDIUM",
    complaints: 88,
    withdrawals: 41,
    nearbyAtms: 16,
    timeWindow: "19:30 - 22:30",
    category: "UPI Fraud",
    radius: 1400,
    cctvCoverage: "69%",
    highRiskAtms: [
      { id: "ATM-MUM-10", name: "HDFC Viviana Mall", coords: [19.2090, 72.9720], risk: "73% Risk" },
    ],
  },

  // Pune Hotspots
  {
    id: "pune-1",
    city: "Pune",
    state: "Maharashtra",
    name: "Shivaji Nagar & FC Road Hub",
    coordinates: [18.5314, 73.8446],
    score: 83,
    level: "HIGH",
    complaints: 95,
    withdrawals: 44,
    nearbyAtms: 18,
    timeWindow: "18:00 - 21:00",
    category: "UPI Fraud",
    radius: 1400,
    cctvCoverage: "75%",
    highRiskAtms: [
      { id: "ATM-PUN-01", name: "SBI FC Road Kiosk", coords: [18.5280, 73.8420], risk: "86% Risk" },
    ],
  },
  {
    id: "pune-2",
    city: "Pune",
    state: "Maharashtra",
    name: "Hinjewadi IT Tech Corridor",
    coordinates: [18.5913, 73.7389],
    score: 72,
    level: "MEDIUM",
    complaints: 64,
    withdrawals: 28,
    nearbyAtms: 15,
    timeWindow: "19:00 - 22:00",
    category: "Phishing & SIM Swap",
    radius: 1500,
    cctvCoverage: "80%",
    highRiskAtms: [
      { id: "ATM-PUN-02", name: "ICICI Phase 1", coords: [18.5950, 73.7420], risk: "75% Risk" },
    ],
  },

  // Delhi Hotspots
  {
    id: "delhi-1",
    city: "Delhi",
    state: "Delhi",
    name: "Connaught Place Financial Circle",
    coordinates: [28.6315, 77.2167],
    score: 89,
    level: "HIGH",
    complaints: 162,
    withdrawals: 77,
    nearbyAtms: 28,
    timeWindow: "19:00 - 22:00",
    category: "Online Banking Fraud",
    radius: 1600,
    cctvCoverage: "92%",
    highRiskAtms: [
      { id: "ATM-DEL-01", name: "SBI Inner Circle", coords: [28.6330, 77.2190], risk: "91% Risk" },
    ],
  },
  {
    id: "delhi-2",
    city: "Delhi",
    state: "Delhi",
    name: "Karol Bagh Commercial Zone",
    coordinates: [28.6517, 77.1906],
    score: 76,
    level: "HIGH",
    complaints: 98,
    withdrawals: 46,
    nearbyAtms: 22,
    timeWindow: "18:30 - 21:30",
    category: "ATM Fraud",
    radius: 1300,
    cctvCoverage: "71%",
    highRiskAtms: [
      { id: "ATM-DEL-02", name: "HDFC Market Rd", coords: [28.6530, 77.1920], risk: "78% Risk" },
    ],
  },

  // Bengaluru Hotspots
  {
    id: "bengaluru-1",
    city: "Bengaluru",
    state: "Karnataka",
    name: "MG Road & Indiranagar Corridor",
    coordinates: [12.9716, 77.5946],
    score: 84,
    level: "HIGH",
    complaints: 128,
    withdrawals: 58,
    nearbyAtms: 26,
    timeWindow: "19:00 - 22:00",
    category: "UPI & Card Cloning",
    radius: 1400,
    cctvCoverage: "85%",
    highRiskAtms: [
      { id: "ATM-BLR-01", name: "Axis Bank Metro Station", coords: [12.9750, 77.6080], risk: "88% Risk" },
    ],
  },
  {
    id: "bengaluru-2",
    city: "Bengaluru",
    state: "Karnataka",
    name: "Electronic City Commercial Corridor",
    coordinates: [12.8452, 77.6602],
    score: 68,
    level: "MEDIUM",
    complaints: 74,
    withdrawals: 31,
    nearbyAtms: 19,
    timeWindow: "18:00 - 21:00",
    category: "Phishing",
    radius: 1500,
    cctvCoverage: "78%",
    highRiskAtms: [
      { id: "ATM-BLR-02", name: "SBI Phase 1 Hub", coords: [12.8480, 77.6630], risk: "70% Risk" },
    ],
  },
];

function GISMap({
  mapCenter,
  mapZoom,
  mapBounds,
  cityName,
  filteredHotspots,
  atms,
  selectedLocation,
  onSelectLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const baseLayersRef = useRef({});
  const activeBaseLayerRef = useRef(null);

  const [mapStyle, setMapStyle] = useState("dark"); // 'dark' | 'satellite' | 'streets'
  const [showHeat, setShowHeat] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showAtms, setShowAtms] = useState(true);
  const [showRadar, setShowRadar] = useState(true);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: mapCenter || cityMapConfigs.Mumbai.center,
        zoom: mapZoom || 11,
        zoomControl: false,
        attributionControl: false,
      });

      // Zoom control in bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Attribution
      L.control
        .attribution({ position: "bottomleft", prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors')
        .addTo(map);

      // Base tile layers (Free, No API Key)
      
      // Dark Cyber: Uses OSM with CSS filters applied via class
      const darkLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          className: "map-tiles-dark",
        }
      );

      // Streets: Standard OSM
      const streetsLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
        }
      );

      baseLayersRef.current = {
        dark: darkLayer,
        streets: streetsLayer,
      };

      // Set initial base layer
      darkLayer.addTo(map);
      activeBaseLayerRef.current = darkLayer;

      // Group for overlays
      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount if needed
    };
  }, []);

  // Update Base Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !baseLayersRef.current[mapStyle]) return;

    if (activeBaseLayerRef.current) {
      map.removeLayer(activeBaseLayerRef.current);
    }

    const nextLayer = baseLayersRef.current[mapStyle];
    nextLayer.addTo(map);
    activeBaseLayerRef.current = nextLayer;
  }, [mapStyle]);

  // Unified Viewport Controller — fitBounds when available, flyTo as fallback
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Highest priority: Selected Hotspot
    if (selectedLocation && selectedLocation.coordinates) {
      map.flyTo(selectedLocation.coordinates, 13.5, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
      return;
    }

    // Use bounds (fitBounds) when available — correct for all states/districts
    if (mapBounds) {
      map.fitBounds(mapBounds, { animate: true, duration: 1.2 });
      return;
    }

    // Fallback: flyTo center when no bounds available
    if (mapCenter) {
      map.flyTo(mapCenter, mapZoom || 7, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [mapCenter, mapZoom, mapBounds, selectedLocation]);

  // Render Overlays: Heat Circles, Hotspots, ATMs
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup) return;

    layersGroup.clearLayers();

    // 1. Render Heat Zones
    if (showHeat) {
      filteredHotspots.forEach((item) => {
        const isSelected = selectedLocation?.id === item.id;
        const color =
          item.score >= 85
            ? "#ff4d67"
            : item.score >= 70
            ? "#ff9d45"
            : "#ffd166";

        const circle = L.circle(item.coordinates, {
          radius: item.radius,
          color: color,
          fillColor: color,
          fillOpacity: isSelected ? 0.30 : 0.16,
          weight: isSelected ? 2.5 : 1.2,
          dashArray: isSelected ? "4, 6" : undefined,
          className: "heat-risk-circle",
        });

        circle.on("click", () => onSelectLocation(item));
        circle.addTo(layersGroup);
      });
    }

    // 2. Render Hotspot Markers
    if (showHotspots) {
      filteredHotspots.forEach((item) => {
        const isSelected = selectedLocation?.id === item.id;
        const colorClass =
          item.score >= 85
            ? "marker-critical"
            : item.score >= 70
            ? "marker-high"
            : "marker-medium";

        const iconHtml = `
          <div class="gis-hotspot-pin ${colorClass} ${isSelected ? "is-active" : ""}">
            <div class="pin-radar-ring"></div>
            <div class="pin-core">
              <span class="pin-score">${item.score}%</span>
            </div>
            <div class="pin-label">${item.name.split(" ")[0]}</div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: "custom-gis-div-icon",
          html: iconHtml,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -20],
        });

        const marker = L.marker(item.coordinates, { icon: customIcon });

        const popupContent = `
          <div class="gis-popup-card">
            <div class="gis-popup-header">
              <span class="gis-popup-badge ${item.level.toLowerCase()}">${item.level} RISK</span>
              <strong>${item.score}% Threat</strong>
            </div>
            <h4 class="gis-popup-title">📍 ${item.name}</h4>
            <div class="gis-popup-meta">
              <p><span>Expected:</span> <strong>${item.timeWindow}</strong></p>
              <p><span>Complaints:</span> <strong>${item.complaints} cases</strong></p>
              <p><span>Nearby ATMs:</span> <strong>${item.nearbyAtms} active</strong></p>
            </div>
            <button id="inspect-btn-${item.id}" class="gis-popup-btn">
              🎯 Inspect Intelligence Details
            </button>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: "cybex-leaflet-popup",
          closeButton: true,
        });

        marker.on("popupopen", () => {
          const btn = document.getElementById(`inspect-btn-${item.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectLocation(item);
              map.closePopup();
            };
          }
        });

        marker.on("click", () => {
          onSelectLocation(item);
        });

        marker.addTo(layersGroup);
      });
    }

    // 3. Render High-Risk ATM Nodes from real data
    if (showAtms && atms && atms.length > 0) {
      atms.forEach((atm) => {
        const atmIconHtml = `
          <div class="gis-atm-pin" title="${atm.name}">
            <div class="atm-badge">🏧</div>
          </div>
        `;

        const atmIcon = L.divIcon({
          className: "custom-atm-div-icon",
          html: atmIconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14],
        });

        const atmMarker = L.marker([atm.latitude, atm.longitude], { icon: atmIcon });

        const riskClass = atm.riskLevel === 'HIGH' || atm.riskLevel === 'CRITICAL' ? 'danger' : (atm.riskLevel === 'MEDIUM' ? 'warning' : 'safe');

        const atmPopup = `
          <div class="gis-popup-card atm-popup">
            <div class="gis-popup-header">
              <span class="gis-popup-badge ${riskClass}">${atm.riskScore}% RISK</span>
              <small>${atm.source || 'OpenStreetMap'}</small>
            </div>
            <h4 class="gis-popup-title">🏧 ${atm.name}</h4>
            <p class="gis-popup-subtitle">${atm.operator || 'Unknown Bank'} | ${atm.district}</p>
            <p style="font-size: 0.75rem; color: #a3b5c3; margin-top: 5px;">Nearby Complaints: ${atm.nearbyComplaintCount || 0}</p>
          </div>
        `;

        atmMarker.bindPopup(atmPopup, {
          className: "cybex-leaflet-popup",
        });

        atmMarker.addTo(layersGroup);
      });
    }
  }, [filteredHotspots, atms, selectedLocation, showHeat, showHotspots, showAtms]);

  return (
    <div className="gis-map-wrapper">
      {/* Real Interactive Leaflet Map Container */}
      <div ref={mapContainerRef} className="gis-leaflet-container" />

      {/* Optional Radar Sweep HUD */}
      {showRadar && <div className="gis-radar-sweep-overlay" />}

      {/* Floating HUD Controls */}
      <div className="gis-hud-top-left">
        <div className="gis-hud-pill">
          <span className="live-dot"></span>
          <strong>LIVE GIS ENGINE</strong>
          <span className="gis-city-tag">{(cityName || "INDIA").toUpperCase()}</span>
        </div>
      </div>

      <div className="gis-hud-top-right">
        {/* Base Layer Switcher */}
        <div className="gis-layer-switcher">
          <button
            type="button"
            className={mapStyle === "dark" ? "active" : ""}
            onClick={() => setMapStyle("dark")}
            title="Cyber Dark Matter"
          >
            🕶️ Dark Cyber
          </button>
          <button
            type="button"
            className={mapStyle === "streets" ? "active" : ""}
            onClick={() => setMapStyle("streets")}
            title="Daylight Street Navigation"
          >
            🗺️ Streets
          </button>
        </div>

        {/* Overlay Layer Toggles */}
        <div className="gis-toggle-strip">
          <button
            type="button"
            className={`gis-toggle-btn ${showHeat ? "on" : ""}`}
            onClick={() => setShowHeat(!showHeat)}
            title="Toggle Threat Heat Zones"
          >
            🔥 Heat
          </button>
          <button
            type="button"
            className={`gis-toggle-btn ${showHotspots ? "on" : ""}`}
            onClick={() => setShowHotspots(!showHotspots)}
            title="Toggle Hotspot Beacons"
          >
            📍 Hotspots
          </button>
          <button
            type="button"
            className={`gis-toggle-btn ${showAtms ? "on" : ""}`}
            onClick={() => setShowAtms(!showAtms)}
            title="Toggle High-Risk ATM Nodes"
          >
            🏧 ATMs
          </button>
          <button
            type="button"
            className={`gis-toggle-btn ${showRadar ? "on" : ""}`}
            onClick={() => setShowRadar(!showRadar)}
            title="Toggle Live Radar HUD"
          >
            📡 Radar
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend */}
      <div className="gis-hud-legend">
        <strong>THREAT LEVELS</strong>
        <div className="gis-legend-items">
          <span><i className="dot critical"></i> 85%+ Critical</span>
          <span><i className="dot high"></i> 70-84% High</span>
          <span><i className="dot medium"></i> &lt;70% Moderate</span>
          <span><i className="dot atm"></i> ATM Vulnerability</span>
        </div>
      </div>
    </div>
  );
}

function Heatmap() {
  const [searchParams] = useSearchParams();
  const paramLat = searchParams.get("lat");
  const paramLng = searchParams.get("lng");
  const paramZoom = searchParams.get("zoom");
  const paramComplaintId = searchParams.get("complaintId");
  const paramLocation = searchParams.get("location");
  const paramRiskLevel = searchParams.get("riskLevel");
  const paramScore = searchParams.get("score");
  const paramState = searchParams.get("state");
  const paramDistrict = searchParams.get("district");

  const [selectedState, setSelectedState] = useState(paramState || "Maharashtra");
  const [selectedDistrict, setSelectedDistrict] = useState(paramDistrict || "");
  const initialStateGeo = getStateGeo(paramState || "Maharashtra");
  
  const [mapCenter, setMapCenter] = useState(
    paramLat && paramLng
      ? [parseFloat(paramLat), parseFloat(paramLng)]
      : [initialStateGeo?.lat ?? 19.7515, initialStateGeo?.lng ?? 75.7139]
  );
  const [mapZoom, setMapZoom] = useState(
    paramZoom ? parseInt(paramZoom, 10) : (paramLat && paramLng ? 13 : (initialStateGeo?.zoom ?? 7))
  );
  const [mapBounds, setMapBounds] = useState(paramLat && paramLng ? null : (initialStateGeo?.bounds ?? null));
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTimeframe, setSelectedTimeframe] = useState("Today");

  const stateObj = statesData.states.find(s => s.state === selectedState);
  const districts = stateObj ? stateObj.districts : [];

  const [hotspots, setHotspots] = useState([]);
  const [atms, setAtms] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loadingHotspots, setLoadingHotspots] = useState(false);

  // Handle URL query parameters for deep linking from Prediction / Complaint
  useEffect(() => {
    if (paramLat && paramLng) {
      const latVal = parseFloat(paramLat);
      const lngVal = parseFloat(paramLng);
      setMapCenter([latVal, lngVal]);
      setMapZoom(paramZoom ? parseInt(paramZoom, 10) : 13);
      setMapBounds(null);
      if (paramState) setSelectedState(paramState);
      if (paramDistrict) setSelectedDistrict(paramDistrict);

      const targetPoint = {
        id: paramComplaintId || "target-incident",
        name: paramLocation || `${paramDistrict || paramState || "Incident"} Target Corridor`,
        state: paramState || selectedState,
        district: paramDistrict || "",
        level: paramRiskLevel || "HIGH",
        score: paramScore ? parseInt(paramScore, 10) : 85,
        coordinates: [latVal, lngVal],
        complaints: 1,
        category: "Predicted Withdrawal Threat",
        timeWindow: "18:00 - 21:00",
        withdrawals: 45,
        nearbyAtms: 15,
        cctvCoverage: "88%",
        radius: 1200,
        highRiskAtms: [
          { id: "ATM-DEEP-1", name: `SBI Sector Hub (${paramDistrict || 'Zone'})`, coords: [latVal + 0.005, lngVal + 0.005], risk: "88% Threat" },
          { id: "ATM-DEEP-2", name: `HDFC Express (${paramDistrict || 'Main'})`, coords: [latVal - 0.005, lngVal - 0.005], risk: "76% Threat" }
        ]
      };
      setSelectedLocation(targetPoint);
    }
  }, [paramLat, paramLng, paramZoom, paramComplaintId, paramLocation, paramRiskLevel, paramScore, paramState, paramDistrict]);

  // Fetch hotspots from Python ML Backend via Node API
  useEffect(() => {
    async function fetchMLHotspots() {
      setLoadingHotspots(true);
      try {
        const res = await fetch(`http://localhost:3001/api/hotspots/predict?state=${encodeURIComponent(selectedState)}&category=${encodeURIComponent(selectedCategory)}`);
        if(res.ok) {
          const data = await res.json();
          let fetchedHotspots = data.hotspots || [];

          // If a deep-linked location exists for this state, ensure it is prepended
          if (paramLat && paramLng) {
            const latVal = parseFloat(paramLat);
            const lngVal = parseFloat(paramLng);
            const exists = fetchedHotspots.some(h => Math.abs(h.coordinates[0] - latVal) < 0.01 && Math.abs(h.coordinates[1] - lngVal) < 0.01);
            if (!exists) {
              const deepSpot = {
                id: paramComplaintId || "target-incident",
                name: paramLocation || `${paramDistrict || "Active"} Incident Corridor`,
                state: paramState || selectedState,
                district: paramDistrict || "",
                level: paramRiskLevel || "HIGH",
                score: paramScore ? parseInt(paramScore, 10) : 85,
                coordinates: [latVal, lngVal],
                complaints: 1,
                category: "Predicted Withdrawal Threat",
                timeWindow: "18:00 - 21:00",
                withdrawals: 45,
                nearbyAtms: 15,
                cctvCoverage: "88%",
                radius: 1200,
                highRiskAtms: [
                  { id: "ATM-DEEP-1", name: `SBI Sector Hub (${paramDistrict || 'Zone'})`, coords: [latVal + 0.005, lngVal + 0.005], risk: "88% Threat" },
                  { id: "ATM-DEEP-2", name: `HDFC Express (${paramDistrict || 'Main'})`, coords: [latVal - 0.005, lngVal - 0.005], risk: "76% Threat" }
                ]
              };
              fetchedHotspots = [deepSpot, ...fetchedHotspots];
            }
          }

          setHotspots(fetchedHotspots);
          
          if (!selectedLocation && fetchedHotspots.length > 0) {
            setSelectedLocation(fetchedHotspots[0]);
          }
        }
      } catch(err) {
        console.error("Failed to fetch ML hotspots:", err);
      } finally {
        setLoadingHotspots(false);
      }
    }
    
    async function fetchATMs() {
      try {
        let url = `http://localhost:3001/api/atms?state=${encodeURIComponent(selectedState)}`;
        if (selectedDistrict) {
          url += `&district=${encodeURIComponent(selectedDistrict)}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setAtms(data);
        }
      } catch(err) {
        console.error("Failed to fetch ATMs:", err);
      }
    }

    fetchMLHotspots();
    fetchATMs();
  }, [selectedState, selectedDistrict, selectedCategory]);

  // Filter hotspots based on current filters (Category and District)
  const filteredHotspots = hotspots.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" ||
      (item.category && item.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    const matchesDistrict =
      !selectedDistrict ||
      (item.name && item.name.toLowerCase() === selectedDistrict.toLowerCase()) ||
      (item.district && item.district.toLowerCase() === selectedDistrict.toLowerCase());
    return matchesCategory && matchesDistrict;
  });

  function handleStateChange(newState) {
    setSelectedState(newState);
    setSelectedDistrict(""); // Always reset district when state changes
    setSelectedLocation(null);

    // Use canonical resolver — works for ALL 28 states + 8 UTs
    const geo = getStateGeo(newState);
    if (geo) {
      setMapCenter([geo.lat, geo.lng]);
      setMapZoom(geo.zoom || 7);
      setMapBounds(geo.bounds || null);
    } else {
      // Fallback: center of India
      setMapCenter([INDIA_DEFAULT.lat, INDIA_DEFAULT.lng]);
      setMapZoom(INDIA_DEFAULT.zoom);
      setMapBounds(INDIA_DEFAULT.bounds);
    }
  }

  function handleDistrictChange(newDistrict) {
    setSelectedDistrict(newDistrict);
    if (!newDistrict) {
      // No district selected — revert to state bounds
      const geo = getStateGeo(selectedState);
      if (geo) {
        setMapCenter([geo.lat, geo.lng]);
        setMapZoom(geo.zoom || 7);
        setMapBounds(geo.bounds || null);
      }
      return;
    }

    // Auto-select the hotspot for this district
    const districtHotspot = hotspots.find(h => h.name === newDistrict);
    if (districtHotspot) setSelectedLocation(districtHotspot);

    // Use canonical resolver with BOTH state + district to prevent cross-state collision
    const geo = getDistrictGeo(selectedState, newDistrict);
    if (geo) {
      setMapCenter([geo.lat, geo.lng]);
      setMapZoom(geo.zoom || 10);
      setMapBounds(geo.bounds || null);
    } else {
      // District not in local data — fall back to state-level view
      const stateGeo = getStateGeo(selectedState);
      if (stateGeo) {
        setMapCenter([stateGeo.lat, stateGeo.lng]);
        setMapZoom(stateGeo.zoom || 7);
        setMapBounds(stateGeo.bounds || null);
      }
    }
  }

  return (
    <Layout title="Risk Heatmap">
      <div className="page-toolbar">
        <div>
          <h2>Predictive Geospatial Intelligence</h2>
          <p>
            Interactive multi-layer GIS mapping of cyber fraud withdrawal risk
          </p>
        </div>
      </div>

      <div className="map-filters">
        <select
          value={selectedState}
          onChange={(e) => handleStateChange(e.target.value)}
        >
          {statesData.states.map(stateObj => (
            <option key={stateObj.state} value={stateObj.state}>{stateObj.state}</option>
          ))}
        </select>

        <select
          value={selectedDistrict}
          onChange={(e) => handleDistrictChange(e.target.value)}
        >
          <option value="">-- Select District --</option>
          {districts.map(dist => (
            <option key={dist} value={dist}>{dist}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Crime Categories</option>
          <option value="UPI">UPI Fraud</option>
          <option value="ATM">ATM Fraud & Skimming</option>
          <option value="Phishing">Phishing</option>
          <option value="Online Banking">Online Banking</option>
        </select>

        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value)}
        >
          <option value="Today">Today (Real-time)</option>
          <option value="Last 7 Days">Last 7 Days</option>
          <option value="Last 30 Days">Last 30 Days</option>
        </select>
      </div>

      <div className="map-layout">
        <div className="map-container">
          <GISMap
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            mapBounds={mapBounds}
            cityName={selectedDistrict || selectedState}
            filteredHotspots={filteredHotspots}
            atms={atms}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />
        </div>

        <div className="card location-card">
          <div className="card-header">
            <div>
              <h3>Intelligence Telemetry</h3>
              <p>Real-time threat inspection</p>
            </div>
            <span
              className={`badge ${
                (selectedLocation?.score || 0) >= 85
                  ? "danger"
                  : (selectedLocation?.score || 0) >= 70
                  ? "pending"
                  : "success"
              }`}
            >
              {selectedLocation?.level || "SAFE"}
            </span>
          </div>

          <div className="location-name">
            📍 {selectedLocation?.name || "No active threat selected"}
          </div>

          <div className="location-coords">
            <span>Coordinates:</span>{" "}
            <strong>
              {selectedLocation ? `${selectedLocation.coordinates[0].toFixed(4)}° N, ${selectedLocation.coordinates[1].toFixed(4)}° E` : "N/A"}
            </strong>
          </div>

          <div className="location-risk">
            <span>Risk Score</span>
            <strong className={(selectedLocation?.score || 0) >= 80 ? "red-text" : ""}>
              {selectedLocation?.score || 0}%
            </strong>
          </div>

          <div className="progress">
            <div
              style={{
                width: `${selectedLocation?.score || 0}%`,
                background:
                  (selectedLocation?.score || 0) >= 85
                    ? "linear-gradient(90deg, #ff405f, #ff8a91)"
                    : (selectedLocation?.score || 0) >= 70
                    ? "linear-gradient(90deg, #ff8d35, #ffc05c)"
                    : "linear-gradient(90deg, #ffd166, #ffdf88)",
              }}
            ></div>
          </div>

          <div className="location-details">
            <p>
              <span>Recent Complaints</span>
              <strong>{selectedLocation?.complaints || 0} cases</strong>
            </p>

            <p>
              <span>Predicted Time Window</span>
              <strong>🕐 {selectedLocation?.timeWindow || "N/A"}</strong>
            </p>

            <p>
              <span>Previous Withdrawals</span>
              <strong>{selectedLocation?.withdrawals || 0} detected</strong>
            </p>

            <p>
              <span>Nearby ATM Cluster</span>
              <strong>🏧 {selectedLocation?.nearbyAtms || 0} ATMs</strong>
            </p>

            <p>
              <span>CCTV Security Coverage</span>
              <strong>📹 {selectedLocation?.cctvCoverage || "N/A"}</strong>
            </p>

            <p>
              <span>Primary Threat Category</span>
              <strong className="red-text">{selectedLocation?.category || "None"}</strong>
            </p>
          </div>

          {selectedLocation?.highRiskAtms && selectedLocation.highRiskAtms.length > 0 && (
            <div className="location-atm-list">
              <strong>High Vulnerability ATMs:</strong>
              <div className="atm-pills">
                {selectedLocation.highRiskAtms.map((atm) => (
                  <div key={atm.id} className="atm-mini-pill">
                    <span>🏧 {atm.name}</span>
                    <b className="red-text">{atm.risk}</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="location-actions">
            <button
              type="button"
              className="primary-btn full"
              onClick={() => {
                if(selectedLocation) {
                  alert(
                    `Preventive Patrol Alert dispatched to Law Enforcement Units for ${selectedLocation.name}. Expected Risk Window: ${selectedLocation.timeWindow}`
                  )
                } else {
                  alert("No active threat selected to dispatch patrol.")
                }
              }}
            >
              🚨 Dispatch Patrol Alert
            </button>
            <Link to="/prediction" className="secondary-btn full">
              🤖 Run Deep Prediction
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* =====================================================
   OFFICER ALERTS
===================================================== */

function Alerts() {
  const [alertList, setAlertList] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(null);

  const fetchAlerts = () => {
    setAlertsLoading(true);
    setAlertsError(null);
    fetch('http://localhost:3001/api/alerts?limit=200')
      .then(res => { if (!res.ok) throw new Error('API error ' + res.status); return res.json(); })
      .then(data => {
        const list = data.alerts || (Array.isArray(data) ? data : []);
        setAlertList(list);
        setAlertsLoading(false);
      })
      .catch(err => { setAlertsError(err.message); setAlertsLoading(false); });
  };

  useEffect(() => { fetchAlerts(); }, []);

  const acknowledge = async (id) => {
    // Optimistic UI update
    setAlertList(prev => prev.map(a => a.id === id ? { ...a, status: 'Acknowledged' } : a));
    try {
      await fetch('http://localhost:3001/api/alerts/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Acknowledged' })
      });
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      fetchAlerts(); // revert on error
    }
  };

  // Summary counts from live data
  const highCount     = alertList.filter(a => a.status === 'Active' && (a.level === 'HIGH' || a.level === 'CRITICAL')).length;
  const mediumCount   = alertList.filter(a => a.status === 'Active' && a.level === 'MEDIUM').length;
  const resolvedCount = alertList.filter(a => a.status === 'Resolved').length;

  return (
    <Layout title="Alerts & Notifications">
      <div className="alert-summary">
        <div className="alert-summary-card danger-bg">
          <strong>{alertsLoading ? '...' : highCount}</strong>
          <span>High Risk Alerts</span>
        </div>

        <div className="alert-summary-card warning-bg">
          <strong>{alertsLoading ? '...' : mediumCount}</strong>
          <span>Medium Risk Alerts</span>
        </div>

        <div className="alert-summary-card safe-bg">
          <strong>{alertsLoading ? '...' : resolvedCount}</strong>
          <span>Resolved Alerts</span>
        </div>
      </div>

      <div className="alerts-list">
        {alertsLoading ? (
          <p style={{ color: 'var(--text-muted)', padding: '1.5rem' }}>Loading alerts from database...</p>
        ) : alertsError ? (
          <p style={{ color: 'var(--danger)', padding: '1.5rem' }}>Error: {alertsError}</p>
        ) : alertList.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1.5rem' }}>No alerts found in database.</p>
        ) : alertList.map((alert) => (
          <div
            className={`full-alert ${(alert.level || 'medium').toLowerCase()}`}
            key={alert.id}
          >
            <div className="full-alert-icon">
              🚨
            </div>

            <div className="full-alert-content">
              <div className="alert-title">
                <h3>
                  {alert.level} RISK DETECTED
                </h3>

                <span>{alert.status}</span>
              </div>

              <p>
                {alert.category || 'Cybercrime'} risk detected at{" "}
                <strong>{alert.location}</strong>.
                {alert.state ? ` State: ${alert.state}` : ''}
              </p>

              <div className="alert-meta">
                <span>
                  🎯 Risk Score: {alert.score}%
                </span>

                <span>
                  🕐 Expected: {alert.timeWindow || 'N/A'}
                </span>
              </div>
            </div>

            <button
              className="secondary-btn"
              disabled={alert.status === 'Acknowledged' || alert.status === 'Resolved'}
              onClick={() => acknowledge(alert.id)}
            >
              {alert.status === 'Acknowledged' || alert.status === 'Resolved'
                ? '✓ ' + alert.status
                : 'Acknowledge'}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}

/* =====================================================
   REPORTS
===================================================== */

function Reports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const reportViewRef = useRef(null);

  // Form state for custom report modal
  const [form, setForm] = useState({
    reportType: 'daily-risk',
    state: 'All',
    district: 'All',
    crimeCategory: 'All',
    description: '',
    dateFrom: '',
    dateTo: '',
    generatedBy: 'Intelligence Officer'
  });

  const allStateNames = Object.keys(statesDistrictsMap).sort();
  const statesList = ['All', ...allStateNames];
  const districtsList = form.state && form.state !== 'All' && statesDistrictsMap[form.state]
    ? ['All', ...statesDistrictsMap[form.state]]
    : ['All'];

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/reports');
      const data = await res.json();
      const reportList = Array.isArray(data) ? data : (data.reports || []);
      setReports(reportList);
      if (reportList.length > 0) {
        setSelectedReport(prev => {
          if (!prev) return reportList[0];
          const found = reportList.find(r => r.reportId === prev.reportId || r.id === prev.id);
          return found || reportList[0];
        });
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setTimeout(() => {
      reportViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const payload = {
        reportType: form.reportType,
        state: form.state === 'All' ? null : form.state,
        district: form.district === 'All' ? null : form.district,
        crimeCategory: form.crimeCategory === 'All' ? null : form.crimeCategory,
        description: form.description ? form.description.trim() : null,
        dateFrom: form.dateFrom || null,
        dateTo: form.dateTo || null,
        generatedBy: form.generatedBy || 'Intelligence Officer'
      };
      const res = await fetch('http://localhost:3001/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Generation failed');
      }
      const newReport = await res.json();
      setShowModal(false);
      setForm(prev => ({ ...prev, description: '' }));
      await fetchReports();
      setSelectedReport(newReport);
      setTimeout(() => {
        reportViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('Error generating report:', err);
      alert(`Failed to generate report: ${err.message || 'Please check filters and try again.'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = async () => {
    if (!selectedReport) return;
    setExportingCsv(true);
    try {
      const url = `http://localhost:3001/api/reports/${selectedReport.reportId || selectedReport.id}/export/csv`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('CSV export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${selectedReport.reportId || 'report'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('CSV export error:', err);
      alert('CSV export failed. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedReport) return;
    setExportingPdf(true);
    try {
      const url = `http://localhost:3001/api/reports/${selectedReport.reportId || selectedReport.id}/export/pdf`;
      window.open(url, '_blank');
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setTimeout(() => setExportingPdf(false), 1500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout title="Intelligence Reports">
      {/* Generate Custom Report Modal */}
      {showModal && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{
            background: 'var(--card-bg, #0f1923)', border: '1px solid rgba(57,215,255,0.18)',
            borderRadius: '14px', padding: '26px 30px', width: '100%', maxWidth: '580px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--cyan, #39d7ff)' }}>+ Generate Custom Report</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#a5bdd3', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleGenerateReport} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#a5bdd3', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>Report Type</label>
                <select value={form.reportType} onChange={e => setForm(f => ({...f, reportType: e.target.value}))} style={{ background: '#0a1526', border: '1px solid rgba(57,215,255,0.25)', borderRadius: '8px', padding: '10px 12px', color: '#e0f0ff', fontSize: '13px', colorScheme: 'dark' }}>
                  <option value="daily-risk" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Daily Risk &amp; Predictive Hotspot</option>
                  <option value="high-risk-intel" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>High Risk Intelligence Briefing</option>
                  <option value="gis-hotspot" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>GIS Geospatial Hotspot Analysis</option>
                  <option value="model-performance" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>ML Model Performance Report</option>
                  <option value="custom-report" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Custom Intelligence Dossier</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0, width: '100%' }}>
                  <label style={{ fontSize: '12px', color: '#a5bdd3', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>State / UT</label>
                  <select 
                    value={form.state} 
                    onChange={e => setForm(f => ({...f, state: e.target.value, district: 'All'}))} 
                    style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', background: '#0a1526', border: '1px solid rgba(57,215,255,0.25)', borderRadius: '8px', padding: '10px 12px', color: '#e0f0ff', fontSize: '13px', colorScheme: 'dark', textOverflow: 'ellipsis' }}
                  >
                    <option value="All" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>All States (Pan-India)</option>
                    {allStateNames.map(s => <option key={s} value={s} style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0, width: '100%' }}>
                  <label style={{ fontSize: '12px', color: '#a5bdd3', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>District</label>
                  <select 
                    value={form.district} 
                    onChange={e => setForm(f => ({...f, district: e.target.value}))} 
                    style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', background: '#0a1526', border: '1px solid rgba(57,215,255,0.25)', borderRadius: '8px', padding: '10px 12px', color: '#e0f0ff', fontSize: '13px', colorScheme: 'dark', textOverflow: 'ellipsis' }}
                  >
                    <option value="All" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>All Districts</option>
                    {districtsList.filter(d => d !== 'All').map(d => <option key={d} value={d} style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                <label style={{ fontSize: '12px', color: '#a5bdd3', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>Crime Category</label>
                <select 
                  value={form.crimeCategory} 
                  onChange={e => setForm(f => ({...f, crimeCategory: e.target.value}))} 
                  style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', background: '#0a1526', border: '1px solid rgba(57,215,255,0.25)', borderRadius: '8px', padding: '10px 12px', color: '#e0f0ff', fontSize: '13px', colorScheme: 'dark', textOverflow: 'ellipsis' }}
                >
                  <option value="All" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>All Categories</option>
                  <option value="UPI Fraud" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>UPI Fraud</option>
                  <option value="ATM Fraud & Card Skimming" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>ATM Fraud &amp; Card Skimming</option>
                  <option value="Online Banking & Corporate Phishing" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Online Banking &amp; Corporate Phishing</option>
                  <option value="Phishing & SIM Swap" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Phishing &amp; SIM Swap</option>
                  <option value="Call Center & Tech Support Scam" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Call Center &amp; Tech Support Scam</option>
                  <option value="Investment Scam" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Investment Scam</option>
                  <option value="Identity Theft & Aadhaar Fraud" style={{ backgroundColor: '#091424', color: '#e0f0ff' }}>Identity Theft &amp; Aadhaar Fraud</option>
                </select>
              </div>

              {/* Custom Scope & Description Notes Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                <label style={{ fontSize: '12px', color: '#a5bdd3', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Report Description / Intelligence Scope Notes
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="Enter specific investigation scope, FIR/case reference, or briefing instructions..."
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    background: '#0a1526',
                    border: '1px solid rgba(57,215,255,0.25)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#e0f0ff',
                    fontSize: '13px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    colorScheme: 'dark'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0, width: '100%' }}>
                  <label style={{ fontSize: '12px', color: '#a5bdd3', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>Date From</label>
                  <input type="date" value={form.dateFrom} onChange={e => setForm(f => ({...f, dateFrom: e.target.value}))} style={{ width: '100%', boxSizing: 'border-box', background: '#0a1526', border: '1px solid rgba(57,215,255,0.25)', borderRadius: '8px', padding: '10px 12px', color: '#e0f0ff', fontSize: '13px', colorScheme: 'dark' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0, width: '100%' }}>
                  <label style={{ fontSize: '12px', color: '#a5bdd3', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>Date To</label>
                  <input type="date" value={form.dateTo} onChange={e => setForm(f => ({...f, dateTo: e.target.value}))} style={{ width: '100%', boxSizing: 'border-box', background: '#0a1526', border: '1px solid rgba(57,215,255,0.25)', borderRadius: '8px', padding: '10px 12px', color: '#e0f0ff', fontSize: '13px', colorScheme: 'dark' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                <label style={{ fontSize: '12px', color: '#a5bdd3', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em' }}>Generated By (Officer Name)</label>
                <input type="text" value={form.generatedBy} onChange={e => setForm(f => ({...f, generatedBy: e.target.value}))} placeholder="Intelligence Officer" style={{ width: '100%', boxSizing: 'border-box', background: '#0a1526', border: '1px solid rgba(57,215,255,0.25)', borderRadius: '8px', padding: '10px 12px', color: '#e0f0ff', fontSize: '13px', colorScheme: 'dark' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', justifyContent: 'flex-end' }}>
                <button type="button" className="small-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={generating} style={{ padding: '9px 22px', fontSize: '13px' }}>
                  {generating ? '⏳ Generating...' : '⚡ Generate Report'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="page-toolbar">
        <div>
          <h2>Cybercrime Intelligence Reports</h2>
          <p>Generate and review actionable intelligence</p>
        </div>
        <button className="primary-btn" onClick={() => setShowModal(true)}>
          + Generate Custom Report
        </button>
      </div>

      <div className="reports-grid">
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#a5bdd3', fontFamily: "'JetBrains Mono', monospace" }}>
            ⏳ Loading intelligence reports...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#a5bdd3' }}>
            No reports found. Generate your first report above.
          </div>
        ) : (
          reports.map((report) => (
            <ReportCard
              key={report.reportId || report.id}
              icon={report.icon}
              title={report.title}
              description={report.description}
              date={report.date}
              active={selectedReport && selectedReport.reportId === report.reportId}
              onClick={() => handleViewReport(report)}
            />
          ))
        )}
      </div>

      {selectedReport && (
        <div className="card intelligence-report" id="report-view-container" ref={reportViewRef}>
          <div className="report-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2>{selectedReport.icon} {selectedReport.title}</h2>
                <span className={`badge ${selectedReport.priorityClass}`}>
                  {selectedReport.priority}
                </span>
              </div>
              <p>Report ID: {selectedReport.reportId} &bull; Generated: {selectedReport.date}</p>
              {selectedReport.generatedBy && (
                <p style={{ fontSize: '12px', color: '#a5bdd3', margin: '2px 0 0' }}>
                  Officer: {selectedReport.generatedBy}
                  {selectedReport.state ? ` · State: ${selectedReport.state}` : ''}
                  {selectedReport.district ? ` · District: ${selectedReport.district}` : ''}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" className="small-btn" onClick={handleExportPdf} disabled={exportingPdf}>
                {exportingPdf ? '⏳ Opening...' : '📥 Export PDF'}
              </button>
              <button type="button" className="small-btn" onClick={handleExportCsv} disabled={exportingCsv}>
                {exportingCsv ? '⏳ Exporting...' : '📊 Export CSV'}
              </button>
              <button type="button" className="small-btn" onClick={handlePrint}>
                🖨️ Print
              </button>
            </div>
          </div>

          <div className="report-grid">
            {(selectedReport.metrics || []).map((metric, idx) => (
              <div key={idx}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          <div className="report-summary-box" style={{ marginTop: "18px", padding: "14px 16px", borderRadius: "10px", background: "rgba(57,215,255,0.04)", border: "1px solid rgba(57,215,255,0.12)" }}>
            <strong style={{ display: "block", color: "var(--cyan)", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "4px" }}>
              Intelligence Executive Summary
            </strong>
            <p style={{ margin: 0, color: "#a5bdd3", fontSize: "13px", lineHeight: "1.6" }}>
              {selectedReport.summary}
            </p>
          </div>

          <div style={{ marginTop: "20px", overflowX: "auto" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "14.5px" }}>Detailed Target Telemetry Breakdown</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Location / Node / Target</th>
                  <th>Threat Metric / Volume</th>
                  <th>Time Window / Confidence</th>
                  <th>Enforcement Status</th>
                </tr>
              </thead>
              <tbody>
                {(selectedReport.tableData || []).map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.col1}</strong></td>
                    <td>{row.col2}</td>
                    <td><span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.col3}</span></td>
                    <td>
                      <span className={`badge ${row.badge || 'warning'}`}>
                        {row.col4}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedReport.actionPlan && (
            <div className="recommendation">
              <h3>Recommended Law Enforcement Action</h3>
              <p>{selectedReport.actionPlan}</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

// officerReportsData removed — reports now fetched live from /api/reports

function ReportCard({
  icon,
  title,
  description,
  date,
  active,
  onClick,
}) {
  return (
    <div className={`report-card ${active ? "is-active" : ""}`}>
      <div className="report-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>

      <small>Generated: {date}</small>

      <button
        type="button"
        className={active ? "primary-btn" : "small-btn"}
        style={active ? { padding: "7px 14px", fontSize: "12px" } : {}}
        onClick={onClick}
      >
        {active ? "👁️ Viewing Report" : "View Report →"}
      </button>
    </div>
  );
}

/* =====================================================
   OFFICER SETTINGS
===================================================== */

function Settings() {
  const [officerProfile, setOfficerProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("cybex-officer-profile");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: "LEA-10245",
      fullName: "",
      department: "",
      rank: "",
      badgeNo: "",
      email: "",
      phone: "",
    };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  function handleChange(field, value) {
    setOfficerProfile((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  }

  function handleSave(e) {
    e.preventDefault();
    try {
      localStorage.setItem("cybex-officer-profile", JSON.stringify(officerProfile));
    } catch {}
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  }

  return (
    <Layout title="Admin & Settings">
      <div className="settings-grid">
        <div className="card">
          <div className="profile-large">
            <div className="avatar large">
              {officerProfile.fullName.trim()
                ? officerProfile.fullName
                    .trim()
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "OF"}
            </div>

            <div>
              <h2>{officerProfile.fullName.trim() || "Officer User"}</h2>
              <p>
                {officerProfile.rank.trim() || "LEA Officer"} &bull;{" "}
                {officerProfile.id}
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div className="success-message" style={{ marginBottom: "18px" }}>
              ✓ Officer credentials updated and verified successfully!
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-two-column">
              <div>
                <label>Officer ID (System ID)</label>
                <input
                  value={officerProfile.id}
                  readOnly
                  disabled
                  placeholder="LEA-10245"
                  style={{ opacity: 0.75, cursor: "not-allowed" }}
                />
              </div>

              <div>
                <label>Officer Full Name</label>
                <input
                  type="text"
                  value={officerProfile.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="e.g. Insp. Vikram Singhania"
                  required
                />
              </div>
            </div>

            <div className="form-two-column">
              <div>
                <label>Department / Cyber Cell</label>
                <input
                  type="text"
                  value={officerProfile.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  placeholder="e.g. Special Cyber Crime Branch, Crime Cell"
                />
              </div>

              <div>
                <label>Designation / Rank</label>
                <input
                  type="text"
                  value={officerProfile.rank}
                  onChange={(e) => handleChange("rank", e.target.value)}
                  placeholder="e.g. Senior Cyber Crime Inspector"
                />
              </div>
            </div>

            <div className="form-two-column">
              <div>
                <label>Official LEA Email</label>
                <input
                  type="email"
                  value={officerProfile.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="e.g. vikram.cyber@police.gov.in"
                />
              </div>

              <div>
                <label>Official Contact / CUG</label>
                <input
                  type="tel"
                  value={officerProfile.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="e.g. +91 98200 12345"
                />
              </div>
            </div>

            <div style={{ marginTop: "22px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="submit" className="primary-btn">
                💾 Update Officer Profile
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  const empty = {
                    id: "LEA-10245",
                    fullName: "",
                    department: "",
                    rank: "",
                    badgeNo: "",
                    email: "",
                    phone: "",
                  };
                  setOfficerProfile(empty);
                  try {
                    localStorage.removeItem("cybex-officer-profile");
                  } catch {}
                  setSavedSuccess(false);
                }}
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3>🤖 ML Model Information</h3>

          <div className="model-info">
            <div>
              <span>Model</span>
              <strong>CNN-LSTM</strong>
            </div>

            <div>
              <span>Accuracy</span>
              <strong>86%</strong>
            </div>

            <div>
              <span>Precision</span>
              <strong>85%</strong>
            </div>

            <div>
              <span>Recall</span>
              <strong>84%</strong>
            </div>
          </div>

          <button className="secondary-btn">
            Update Model
          </button>
        </div>

        <div className="card">
          <h3>🔔 Notification Settings</h3>

          <SettingToggle
            title="High Risk Alerts"
            description="Receive alerts for high-risk locations"
          />

          <SettingToggle
            title="Email Notifications"
            description="Receive intelligence reports by email"
          />

          <SettingToggle
            title="Dashboard Notifications"
            description="Show real-time alerts"
          />
        </div>
      </div>
    </Layout>
  );
}

function SettingToggle({
  title,
  description,
}) {
  const [enabled, setEnabled] =
    useState(true);

  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <button
        className={
          enabled ? "toggle on" : "toggle"
        }
        onClick={() =>
          setEnabled(!enabled)
        }
      >
        <span></span>
      </button>
    </div>
  );
}

/* =====================================================
   CITIZEN SIDEBAR
===================================================== */

function CitizenSidebar() {
  const location = useLocation();

  const menu = [
    {
      path: "/citizen-dashboard",
      icon: "🏠",
      name: "Home",
    },
    {
      path: "/report-cybercrime",
      icon: "📝",
      name: "Report Cybercrime",
    },

    {
      path: "/my-complaints",
      icon: "📋",
      name: "My Complaints",
    },
    {
      path: "/track-complaint",
      icon: "🔍",
      name: "Track Complaint",
    },
    {
      path: "/citizen-alerts",
      icon: "🚨",
      name: "Safety Alerts",
    },
    {
      path: "/citizen-profile",
      icon: "👤",
      name: "My Profile",
    },
  ];

  return (
    <aside className="sidebar citizen-sidebar">
      <div className="logo">
        <div className="logo-icon">🛡️</div>

        <div>
          <h2>CybeX</h2>
          <span>Citizen Portal</span>
        </div>
      </div>

      <nav>
        {menu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={
              location.pathname === item.path
                ? "menu-item active"
                : "menu-item"
            }
          >
            <span>{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="security-status">
          <span className="status-dot"></span>
          Secure Portal
        </div>

        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("cybex_jwt_token");
            localStorage.removeItem("cybex_auth_user");
            window.location.href = "/";
          }}
          className="logout"
          style={{ background: "transparent", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}

function CitizenLayout({ children, title }) {
  return (
    <div className="app-layout">
      <CitizenSidebar />

      <main className="main-content">
        <Header title={title} />

        <div className="page-content page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}

/* =====================================================
   CITIZEN DASHBOARD
===================================================== */

function CitizenDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    underInvestigation: 0,
    resolved: 0,
    evidence: 0
  });

  useEffect(() => {
    fetch('http://localhost:3001/api/cases?limit=50')
      .then(res => res.json())
      .then(data => {
        const list = data.data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        const total = data.pagination?.total || list.length || 4;
        const underInv = list.filter(c => c.status === "Under Investigation").length || 2;
        const resolved = list.filter(c => c.status === "Resolved" || c.status === "Closed").length || 2;
        setStats({
          total: total > 50000 ? 6 : total,
          underInvestigation: underInv > 10 ? 2 : underInv,
          resolved: resolved > 10 ? 3 : resolved,
          evidence: 8
        });
      })
      .catch(() => {
        setStats({ total: 4, underInvestigation: 2, resolved: 2, evidence: 8 });
      });
  }, []);

  return (
    <CitizenLayout title="Citizen Dashboard">
      <div className="citizen-welcome">
        <div>
          <span>Welcome back</span>
          <h2>Citizen Portal</h2>
          <p>
            Report cybercrime, submit evidence and
            track your complaints securely.
          </p>
        </div>

        <div className="citizen-welcome-icon">
          🛡️
        </div>
      </div>

      <div className="stats-grid citizen-stats">
        <StatCard
          title="My Complaints"
          value={String(stats.total)}
          change="Active"
          icon="📋"
        />

        <StatCard
          title="Evidence Submitted"
          value={String(stats.evidence)}
          change="Secure"
          icon="📎"
        />

        <StatCard
          title="Under Investigation"
          value={String(stats.underInvestigation)}
          change="Processing"
          icon="🔎"
        />

        <StatCard
          title="Resolved"
          value={String(stats.resolved)}
          change="Completed"
          icon="✅"
        />
      </div>

      <div className="citizen-action-grid">
        <Link
          to="/report-cybercrime"
          className="citizen-action-card"
        >
          <span>📝</span>
          <h3>Report Cybercrime</h3>
          <p>
            Submit a new cybercrime complaint.
          </p>
        </Link>

        <Link
          to="/track-complaint"
          className="citizen-action-card"
        >
          <span>🔍</span>
          <h3>Track Complaint</h3>
          <p>
            Check the current status of your
            complaint.
          </p>
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Recent Complaints</h3>
            <p>Your latest submitted complaints from central database</p>
          </div>

          <Link
            to="/my-complaints"
            className="text-link"
          >
            View All →
          </Link>
        </div>

        <CitizenComplaintTable />
      </div>
    </CitizenLayout>
  );
}

/* =====================================================
   CITIZEN REPORT
===================================================== */

function ReportCybercrime() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [submitted, setSubmitted] = useState(false);
  // Evidence upload states (inline after complaint)
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceType, setEvidenceType] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [evidenceUploaded, setEvidenceUploaded] = useState(false);

  function submitComplaint(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  function handleEvidenceFile(e) {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setEvidenceFile(selectedFile);
      setEvidenceUploaded(false);
    }
  }

  function handleEvidenceUpload(e) {
    e.preventDefault();
    if (!evidenceFile) {
      alert("Please select an evidence file.");
      return;
    }
    if (!evidenceType) {
      alert("Please select evidence type.");
      return;
    }
    setEvidenceUploaded(true);
  }

  return (
    <CitizenLayout title="Report Cybercrime">
      <div className="form-page">
        <div className="card form-card">
          {!submitted ? (
            <>
              <div className="form-heading">
                <span>📝</span>

                <div>
                  <h2>Report Cybercrime</h2>

                  <p>
                    Provide details about the
                    cybercrime incident.
                  </p>
                </div>
              </div>

              <form onSubmit={submitComplaint}>
                <div className="form-two-column">
                  <div>
                    <label>Crime Category</label>

                    <select required>
                      <option value="">
                        Select category
                      </option>

                      <option>UPI Fraud</option>
                      <option>Phishing</option>
                      <option>ATM Fraud</option>
                      <option>Online Banking Fraud</option>
                      <option>Social Media Fraud</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label>Transaction Amount</label>

                    <input
                      type="number"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                <label>Incident Description</label>

                <textarea
                  rows="6"
                  required
                  placeholder="Describe what happened..."
                ></textarea>

                <label>Incident Location</label>

                <input
                  type="text"
                  placeholder="Enter city / location"
                />

                <div className="form-actions">
                  <button
                    type="submit"
                    className="primary-btn"
                  >
                    Submit Complaint
                  </button>

                  <Link
                    to="/citizen-dashboard"
                    className="secondary-btn"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="report-submitted-container">
              {/* Complaint Success */}
              <div className="success-state">
                <div className="success-icon">
                  ✓
                </div>

                <h2>Complaint Submitted</h2>

                <p>
                  Your complaint has been submitted
                  successfully.
                </p>

                <div className="complaint-id-box">
                  Complaint ID
                  <strong>CC-2026-00125</strong>
                </div>
              </div>

              {/* Inline Evidence Upload Section */}
              <div className="inline-evidence-section">
                <div className="form-heading">
                  <span>📎</span>
                  <div>
                    <h2>Submit Evidence</h2>
                    <p>Attach supporting evidence for complaint CC-2026-00125</p>
                  </div>
                </div>

                {!evidenceUploaded ? (
                  <form onSubmit={handleEvidenceUpload}>
                    <label>Evidence Type</label>
                    <select
                      value={evidenceType}
                      onChange={(e) => setEvidenceType(e.target.value)}
                    >
                      <option value="">Select evidence type</option>
                      <option>Transaction Screenshot</option>
                      <option>Bank Statement</option>
                      <option>Chat / Message Screenshot</option>
                      <option>Email</option>
                      <option>Document</option>
                      <option>Video</option>
                      <option>Other</option>
                    </select>

                    <label>Evidence File</label>
                    <div className="upload-box">
                      <div className="upload-icon">📤</div>
                      <h3>Drag & Drop Evidence</h3>
                      <p>or choose a file from your device</p>
                      <label className="file-btn">
                        Choose File
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.mp4,.webm"
                          onChange={handleEvidenceFile}
                        />
                      </label>

                      {evidenceFile && (
                        <div className="selected-file">
                          <span>📄</span>
                          <div>
                            <strong>{evidenceFile.name}</strong>
                            <small>
                              {(evidenceFile.size / 1024 / 1024).toFixed(2)} MB
                            </small>
                          </div>
                        </div>
                      )}
                    </div>

                    <label>Evidence Description</label>
                    <textarea
                      rows="4"
                      value={evidenceDesc}
                      onChange={(e) => setEvidenceDesc(e.target.value)}
                      placeholder="Briefly describe what this evidence proves..."
                    ></textarea>

                    <div className="evidence-note">
                      🔒 Your evidence will be treated as confidential and will be available to authorized investigators.
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="primary-btn">
                        📤 Upload Evidence
                      </button>
                      <Link to="/citizen-dashboard" className="secondary-btn">
                        Skip & Go to Dashboard
                      </Link>
                    </div>
                  </form>
                ) : (
                  <div className="success-state evidence-success-inline">
                    <div className="success-icon">✓</div>
                    <h2>Evidence Submitted</h2>
                    <p>Your evidence has been attached to complaint CC-2026-00125.</p>

                    <div className="evidence-result">
                      <div>
                        <span>Evidence ID</span>
                        <strong>EV-2026-00124</strong>
                      </div>
                      <div>
                        <span>File</span>
                        <strong>{evidenceFile?.name}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong className="green-text">Submitted</strong>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        className="secondary-btn"
                        onClick={() => {
                          setEvidenceUploaded(false);
                          setEvidenceFile(null);
                          setEvidenceType("");
                          setEvidenceDesc("");
                        }}
                      >
                        📎 Upload Another Evidence
                      </button>
                      <Link to="/citizen-dashboard" className="primary-btn">
                        Go to Dashboard
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </CitizenLayout>
  );
}

/* =====================================================
   CITIZEN EVIDENCE UPLOAD
===================================================== */

function UploadEvidence() {
  const [file, setFile] = useState(null);
  const [complaint, setComplaint] =
    useState("CC001");
  const [type, setType] = useState("");
  const [description, setDescription] =
    useState("");
  const [uploaded, setUploaded] =
    useState(false);

  function handleFile(e) {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      setFile(selectedFile);
      setUploaded(false);
    }
  }

  function handleUpload(e) {
    e.preventDefault();

    if (!file) {
      alert("Please select an evidence file.");
      return;
    }

    if (!type) {
      alert("Please select evidence type.");
      return;
    }

    setUploaded(true);
  }

  return (
    <CitizenLayout title="Upload Evidence">
      <div className="evidence-page">
        <div className="card evidence-card">
          <div className="form-heading">
            <span>📎</span>

            <div>
              <h2>Upload Evidence</h2>

              <p>
                Securely submit evidence related to
                your cybercrime complaint.
              </p>
            </div>
          </div>

          {!uploaded ? (
            <form onSubmit={handleUpload}>
              <label>Complaint ID</label>

              <select
                value={complaint}
                onChange={(e) =>
                  setComplaint(e.target.value)
                }
              >
                <option value="CC001">
                  CC001 - UPI Fraud
                </option>

                <option value="CC002">
                  CC002 - Phishing
                </option>

                <option value="CC003">
                  CC003 - ATM Fraud
                </option>
              </select>

              <label>Evidence Type</label>

              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value)
                }
              >
                <option value="">
                  Select evidence type
                </option>

                <option>
                  Transaction Screenshot
                </option>

                <option>
                  Bank Statement
                </option>

                <option>
                  Chat / Message Screenshot
                </option>

                <option>Email</option>

                <option>Document</option>

                <option>Video</option>

                <option>Other</option>
              </select>

              <label>Evidence File</label>

              <div className="upload-box">
                <div className="upload-icon">
                  📤
                </div>

                <h3>
                  Drag & Drop Evidence
                </h3>

                <p>
                  or choose a file from your device
                </p>

                <label className="file-btn">
                  Choose File

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.mp4,.webm"
                    onChange={handleFile}
                  />
                </label>

                {file && (
                  <div className="selected-file">
                    <span>📄</span>

                    <div>
                      <strong>
                        {file.name}
                      </strong>

                      <small>
                        {(
                          file.size /
                          1024 /
                          1024
                        ).toFixed(2)}{" "}
                        MB
                      </small>
                    </div>
                  </div>
                )}
              </div>

              <label>
                Evidence Description
              </label>

              <textarea
                rows="5"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Briefly describe what this evidence proves..."
              ></textarea>

              <div className="evidence-note">
                🔒 Your evidence will be treated as
                confidential and will be available
                to authorized investigators.
              </div>

              <button
                type="submit"
                className="primary-btn full"
              >
                📤 Upload Evidence
              </button>
            </form>
          ) : (
            <div className="success-state">
              <div className="success-icon">
                ✓
              </div>

              <h2>Evidence Submitted</h2>

              <p>
                Your evidence has been submitted
                successfully.
              </p>

              <div className="evidence-result">
                <div>
                  <span>Evidence ID</span>
                  <strong>
                    EV-2026-00124
                  </strong>
                </div>

                <div>
                  <span>Complaint</span>
                  <strong>{complaint}</strong>
                </div>

                <div>
                  <span>File</span>
                  <strong>{file?.name}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong className="green-text">
                    Submitted
                  </strong>
                </div>
              </div>

              <button
                className="secondary-btn"
                onClick={() => {
                  setUploaded(false);
                  setFile(null);
                  setType("");
                  setDescription("");
                }}
              >
                Upload Another Evidence
              </button>
            </div>
          )}
        </div>
      </div>
    </CitizenLayout>
  );
}

/* =====================================================
   CITIZEN COMPLAINTS
===================================================== */

function CitizenComplaintTable() {
  const [complaintsData, setComplaintsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/cases?limit=10')
      .then(res => res.json())
      .then(data => {
        const list = data.data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setComplaintsData(list);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p style={{ color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center' }}>Loading complaints from central database...</p>;
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Complaint ID</th>
            <th>Category</th>
            <th>Location</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {complaintsData.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                No complaints found.
              </td>
            </tr>
          ) : (
            complaintsData.map((item) => (
              <tr key={item.id || item.complaintId}>
                <td>
                  <strong>{item.complaintId || item.id}</strong>
                </td>
                <td>{item.type}</td>
                <td>{item.location || `${item.district || ''}, ${item.state || ''}`}</td>
                <td>{item.amount}</td>
                <td>{item.date}</td>
                <td>
                  <span
                    className={
                      item.status === "Resolved" || item.status === "Closed"
                        ? "badge success"
                        : item.status === "Under Investigation" || item.status === "Analyzed"
                        ? "badge warning"
                        : "badge pending"
                    }
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function MyComplaints() {
  return (
    <CitizenLayout title="My Complaints">
      <div className="page-toolbar">
        <div>
          <h2>My Complaints</h2>

          <p>
            View all complaints submitted by you.
          </p>
        </div>

        <Link
          to="/report-cybercrime"
          className="primary-btn"
        >
          + New Complaint
        </Link>
      </div>

      <div className="card">
        <CitizenComplaintTable />
      </div>
    </CitizenLayout>
  );
}

/* =====================================================
   TRACK COMPLAINT
===================================================== */

function TrackComplaint() {
  const [id, setId] = useState("");
  const [result, setResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function track(e) {
    e.preventDefault();
    if (!id.trim()) {
      alert("Enter Complaint ID.");
      return;
    }

    setIsSearching(true);
    setErrorMsg("");
    setResult(null);

    try {
      const q = id.trim();
      const res = await fetch(`http://localhost:3001/api/cases/${encodeURIComponent(q)}`);
      if (res.ok) {
        const item = await res.json();
        setResult(item);
      } else {
        const searchRes = await fetch(`http://localhost:3001/api/complaints/search?q=${encodeURIComponent(q)}&limit=1`);
        const list = await searchRes.json();
        if (Array.isArray(list) && list.length > 0) {
          setResult(list[0]);
        } else {
          setErrorMsg(`No complaint found with ID "${q}". Please check the ID and try again.`);
        }
      }
    } catch (err) {
      console.error("Track error:", err);
      setErrorMsg("Error searching for complaint. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  const isResolved = result && (result.status === "Resolved" || result.status === "Closed");
  const isInvestigating = result && (result.status === "Under Investigation" || result.status === "Analyzed");

  return (
    <CitizenLayout title="Track Complaint">
      <div className="track-page">
        <div className="card track-card">
          <div className="form-heading">
            <span>🔍</span>

            <div>
              <h2>Track Complaint</h2>

              <p>
                Enter your complaint ID to check
                the live real-time status from the central law enforcement database.
              </p>
            </div>
          </div>

          <form onSubmit={track}>
            <label>Complaint ID</label>

            <input
              placeholder="Example: CC-2026-0001 or CC0001"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />

            <button className="primary-btn full" disabled={isSearching}>
              {isSearching ? "Searching Database..." : "🔍 Track Complaint"}
            </button>
          </form>

          {errorMsg && (
            <div style={{ marginTop: '1rem', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '8px' }}>
              {errorMsg}
            </div>
          )}

          {result && (
            <div className="tracking-result">
              <h3>Complaint Found: {result.complaintId || result.id}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Type: <strong>{result.type}</strong> • Amount: <strong>{result.amount}</strong> • Location: <strong>{result.location}</strong>
              </p>

              <div className="tracking-step completed">
                <span>✓</span>
                <div>
                  <strong>Complaint Submitted</strong>
                  <small>Registered in Database ({result.date || 'Active'})</small>
                </div>
              </div>

              <div className="tracking-line"></div>

              <div className={`tracking-step ${isInvestigating || isResolved ? "completed" : "current"}`}>
                <span>{isInvestigating || isResolved ? "✓" : "●"}</span>
                <div>
                  <strong>Threat &amp; Evidence Analysis</strong>
                  <small>{isInvestigating || isResolved ? "Completed" : "In Progress"}</small>
                </div>
              </div>

              <div className="tracking-line"></div>

              <div className={`tracking-step ${isResolved ? "completed" : isInvestigating ? "current" : ""}`}>
                <span>{isResolved ? "✓" : isInvestigating ? "●" : "○"}</span>
                <div>
                  <strong>Under Police Investigation</strong>
                  <small>{isResolved ? "Completed" : isInvestigating ? "Active Investigation" : "Pending"}</small>
                </div>
              </div>

              <div className="tracking-line"></div>

              <div className={`tracking-step ${isResolved ? "completed" : ""}`}>
                <span>{isResolved ? "✓" : "○"}</span>
                <div>
                  <strong>Resolved &amp; Closed</strong>
                  <small>{isResolved ? "Case Successfully Resolved" : "Pending Resolution"}</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CitizenLayout>
  );
}

/* =====================================================
   CITIZEN ALERTS
===================================================== */

function CitizenAlerts() {
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/alerts?limit=6')
      .then(res => res.json())
      .then(data => {
        const list = data.alerts || (Array.isArray(data) ? data : []);
        setLiveAlerts(list);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <CitizenLayout title="Cyber Safety Alerts">
      <div className="page-toolbar">
        <div>
          <h2>Cyber Safety Alerts</h2>

          <p>
            Real-time cyber safety alerts and active threat advisories from law enforcement.
          </p>
        </div>
      </div>

      <div className="citizen-alert-grid">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading active advisories...</p>
        ) : liveAlerts.length > 0 ? (
          liveAlerts.map(alert => (
            <div
              key={alert.id}
              className={`safety-alert ${alert.level === 'CRITICAL' ? 'danger' : alert.level === 'HIGH' ? 'warning' : 'safe'}`}
            >
              <span>{alert.level === 'CRITICAL' ? '🚨' : alert.level === 'HIGH' ? '⚠️' : '🛡️'}</span>
              <div>
                <h3>{alert.category || 'Threat Alert'} ({alert.level})</h3>
                <p>High threat withdrawal risk detected around {alert.location}. Active window: {alert.timeWindow || '18:00 - 22:00'}.</p>
                <small>Score: {alert.score}% • Status: {alert.status}</small>
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="safety-alert danger">
              <span>🚨</span>
              <div>
                <h3>UPI Fraud Warning</h3>
                <p>Never share your UPI PIN or OTP with anyone claiming to be a bank official.</p>
                <small>Active Advisory</small>
              </div>
            </div>
            <div className="safety-alert warning">
              <span>⚠️</span>
              <div>
                <h3>Phishing Alert</h3>
                <p>Avoid clicking suspicious links received through SMS, WhatsApp or email.</p>
                <small>Active Advisory</small>
              </div>
            </div>
          </>
        )}
      </div>
    </CitizenLayout>
  );
}

/* =====================================================
   CITIZEN PROFILE
===================================================== */

function CitizenProfile() {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("cybex-citizen-profile");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      id: "CIT-10245",
      fullName: "",
      email: "",
      phone: "",
      city: "",
      address: "",
      emergencyContact: "",
    };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  function handleChange(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  }

  function handleSave(e) {
    e.preventDefault();
    try {
      localStorage.setItem("cybex-citizen-profile", JSON.stringify(profile));
    } catch {
      // ignore
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  }

  return (
    <CitizenLayout title="My Profile">
      <div className="profile-page">
        <div className="card">
          <div className="profile-large">
            <div className="avatar large">
              {profile.fullName.trim()
                ? profile.fullName
                    .trim()
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "CU"}
            </div>

            <div>
              <h2>{profile.fullName.trim() || "Citizen User"}</h2>
              <p>Registered Citizen &bull; ID: {profile.id}</p>
            </div>
          </div>

          {savedSuccess && (
            <div className="success-message" style={{ marginBottom: "18px" }}>
              ✓ Profile information updated and saved successfully!
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-two-column">
              <div>
                <label>Citizen ID (System ID)</label>
                <input
                  value={profile.id}
                  readOnly
                  disabled
                  placeholder="CIT-10245"
                  style={{ opacity: 0.75, cursor: "not-allowed" }}
                />
              </div>

              <div>
                <label>Full Name</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="e.g. Satyendra Sharma"
                  required
                />
              </div>
            </div>

            <div className="form-two-column">
              <div>
                <label>Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="e.g. citizen@example.com"
                  required
                />
              </div>

              <div>
                <label>Mobile Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                />
              </div>
            </div>

            <div className="form-two-column">
              <div>
                <label>City / Location</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="e.g. Mumbai, Maharashtra"
                />
              </div>

              <div>
                <label>Emergency Contact</label>
                <input
                  type="tel"
                  value={profile.emergencyContact}
                  onChange={(e) => handleChange("emergencyContact", e.target.value)}
                  placeholder="e.g. +91 91234 56789"
                />
              </div>
            </div>

            <label>Residential Address</label>
            <input
              type="text"
              value={profile.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="e.g. Flat 402, Sea View Apartments, Andheri West"
            />

            <div style={{ marginTop: "22px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="submit" className="primary-btn">
                💾 Save &amp; Update Profile
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  const resetState = {
                    id: "CIT-10245",
                    fullName: "",
                    email: "",
                    phone: "",
                    city: "",
                    address: "",
                    emergencyContact: "",
                  };
                  setProfile(resetState);
                  try {
                    localStorage.removeItem("cybex-citizen-profile");
                  } catch {}
                  setSavedSuccess(false);
                }}
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </CitizenLayout>
  );
}

/* =====================================================
   BANK SIDEBAR
===================================================== */

function BankSidebar() {
  const location = useLocation();

  const menu = [
    {
      path: "/bank-dashboard",
      icon: "🏠",
      name: "Overview",
    },
    {
      path: "/bank-risk-alerts",
      icon: "🚨",
      name: "Risk Alerts",
    },
    {
      path: "/suspicious-transactions",
      icon: "💳",
      name: "Suspicious Transactions",
    },
    {
      path: "/atm-risk",
      icon: "🏧",
      name: "ATM / Withdrawal Risk",
    },
    {
      path: "/fund-blocking",
      icon: "🔒",
      name: "Fund Blocking",
    },
    {
      path: "/bank-analytics",
      icon: "📊",
      name: "Analytics",
    },
    {
      path: "/bank-reports",
      icon: "📑",
      name: "Reports",
    },
    {
      path: "/bank-settings",
      icon: "⚙️",
      name: "Settings",
    },
  ];

  return (
    <aside className="sidebar bank-sidebar">
      <div className="logo">
        <div className="logo-icon">🛡️</div>

        <div>
          <h2>CybeX</h2>
          <span>Bank Portal</span>
        </div>
      </div>

      <nav>
        {menu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={
              location.pathname === item.path
                ? "menu-item active"
                : "menu-item"
            }
          >
            <span>{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="security-status">
          <span className="status-dot"></span>
          Secure Banking Portal
        </div>

        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("cybex_jwt_token");
            localStorage.removeItem("cybex_auth_user");
            window.location.href = "/";
          }}
          className="logout"
          style={{ background: "transparent", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}

function BankLayout({ children, title }) {
  return (
    <div className="app-layout">
      <BankSidebar />

      <main className="main-content">
        <Header title={title} />

        <div className="page-content page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}

/* =====================================================
   BANK DASHBOARD
===================================================== */

function BankDashboard() {
  const [stats, setStats] = useState({
    activeAlerts: 127,
    suspiciousTxns: 146,
    fundsBlocked: "₹18.6L",
    atmsUnderWatch: 34
  });
  const [riskHotspots, setRiskHotspots] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setStats(prev => ({
            ...prev,
            activeAlerts: data.activeAlerts || 127,
            atmsUnderWatch: 34
          }));
        }
      })
      .catch(() => {});

    fetch('http://localhost:3001/api/hotspots/predict?state=Maharashtra')
      .then(res => res.json())
      .then(data => {
        if (data && data.hotspots && data.hotspots.length > 0) {
          setRiskHotspots(data.hotspots.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <BankLayout title="Bank Overview">
      <div className="bank-welcome">
        <div>
          <span>Welcome</span>

          <h2>ABC Bank - Cyber Fraud Portal</h2>

          <p>
            Monitor cyber fraud risks, suspicious
            transactions and withdrawal alerts from central database.
          </p>
        </div>

        <div className="bank-icon">🏦</div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Risk Alerts"
          value={String(stats.activeAlerts)}
          change="Live Active"
          icon="🚨"
        />

        <StatCard
          title="Suspicious Transactions"
          value={String(stats.suspiciousTxns)}
          change="+8.4%"
          icon="💳"
        />

        <StatCard
          title="Funds Blocked"
          value={stats.fundsBlocked}
          change="This Month"
          icon="🔒"
        />

        <StatCard
          title="ATMs Under Watch"
          value={String(stats.atmsUnderWatch)}
          change="Active"
          icon="🏧"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>High Risk Locations</h3>
              <p>
                Locations received from intelligence system
              </p>
            </div>
          </div>

          {riskHotspots.length > 0 ? (
            riskHotspots.map(h => (
              <BankRiskRow
                key={h.id || h.name}
                location={h.name}
                score={`${h.score || 85}%`}
              />
            ))
          ) : (
            <>
              <BankRiskRow
                location="Andheri, Mumbai"
                score="91%"
              />
              <BankRiskRow
                location="South Mumbai"
                score="87%"
              />
              <BankRiskRow
                location="Bandra, Mumbai"
                score="74%"
              />
              <BankRiskRow
                location="Dadar, Mumbai"
                score="68%"
              />
            </>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Quick Actions</h3>
              <p>Common banking operations</p>
            </div>
          </div>

          <div className="bank-quick-actions">
            <Link to="/bank-risk-alerts">
              🚨 Review Alerts
            </Link>

            <Link to="/suspicious-transactions">
              💳 Review Transactions
            </Link>

            <Link to="/fund-blocking">
              🔒 Block Funds
            </Link>

            <Link to="/atm-risk">
              🏧 Check ATM Risk
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Recent Suspicious Transactions</h3>
            <p>Requires bank review</p>
          </div>

          <Link
            to="/suspicious-transactions"
            className="text-link"
          >
            View All →
          </Link>
        </div>

        <BankTransactionTable />
      </div>
    </BankLayout>
  );
}

function BankRiskRow({
  location,
  score,
}) {
  return (
    <div className="bank-risk-row">
      <div>
        <strong>📍 {location}</strong>

        <span>
          Predicted withdrawal hotspot
        </span>
      </div>

      <strong className="red-text">
        {score}
      </strong>
    </div>
  );
}

/* =====================================================
   BANK RISK ALERTS
===================================================== */

function BankRiskAlerts() {
  const [bankAlerts, setBankAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/alerts?limit=50')
      .then(res => res.json())
      .then(data => {
        const list = data.alerts || (Array.isArray(data) ? data : []);
        setBankAlerts(list);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const criticalCount = bankAlerts.filter(a => a.level === 'CRITICAL').length || 12;
  const highMediumCount = bankAlerts.filter(a => a.level === 'HIGH' || a.level === 'MEDIUM').length || 16;
  const resolvedCount = bankAlerts.filter(a => a.status === 'Resolved').length || 45;

  return (
    <BankLayout title="Risk Alerts">
      <div className="alert-summary">
        <div className="alert-summary-card danger-bg">
          <strong>{criticalCount}</strong>
          <span>Critical Alerts</span>
        </div>

        <div className="alert-summary-card warning-bg">
          <strong>{highMediumCount}</strong>
          <span>High / Medium Alerts</span>
        </div>

        <div className="alert-summary-card safe-bg">
          <strong>{resolvedCount}</strong>
          <span>Resolved</span>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center' }}>Loading risk alerts from database...</p>
        ) : bankAlerts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center' }}>No active bank alerts.</p>
        ) : (
          bankAlerts.slice(0, 10).map((alert) => (
            <div
              className="bank-alert-row"
              key={alert.id}
            >
              <div className="bank-alert-icon">
                {alert.level === 'CRITICAL' ? '🚨' : alert.level === 'HIGH' ? '⚠️' : '🔔'}
              </div>

              <div>
                <strong>
                  {alert.location}
                </strong>

                <p>
                  {alert.category || 'Threat'} Risk Score:
                  <b> {alert.score}%</b> ({alert.level})
                </p>

                <small>
                  Expected Window: {alert.timeWindow || '18:00 - 22:00'} • Status: {alert.status}
                </small>
              </div>

              <Link to="/atm-risk" className="small-btn">
                Review ATM
              </Link>
            </div>
          ))
        )}
      </div>
    </BankLayout>
  );
}

/* =====================================================
   BANK TRANSACTIONS DATA & COMPONENTS
===================================================== */

const defaultBankTransactions = [
  {
    id: "TXN-82451",
    accountNo: "AC-78945612",
    beneficiary: "Rajesh S. (High Velocity)",
    amount: "₹95,000",
    rawAmount: 95000,
    location: "Andheri ATM-01, Mumbai",
    city: "Mumbai",
    risk: "92%",
    riskLevel: "Critical",
    status: "Review Required",
    pattern: "Rapid UPI Burst & Layering",
    timestamp: "28 Aug 2026, 14:10",
    ipAddress: "103.212.45.89 (High Risk Proxy)",
    ifsc: "SBIN0001245",
    complaintRef: "CC001 (Cyber Crime Unit)",
  },
  {
    id: "TXN-82452",
    accountNo: "AC-34567890",
    beneficiary: "Vikram K. (Layered Node)",
    amount: "₹48,500",
    rawAmount: 48500,
    location: "Bandra ATM-09, Mumbai",
    city: "Mumbai",
    risk: "74%",
    riskLevel: "High",
    status: "Monitoring",
    pattern: "Consecutive Zero-Balance Drainage",
    timestamp: "28 Aug 2026, 13:45",
    ipAddress: "49.36.12.102 (Mobile Broadband)",
    ifsc: "HDFC0000889",
    complaintRef: "CC002 (Phishing APK)",
  },
  {
    id: "TXN-82453",
    accountNo: "AC-90123456",
    beneficiary: "Deepak V. (ATM Extraction)",
    amount: "₹1,20,000",
    rawAmount: 120000,
    location: "Fort Branch, Mumbai",
    city: "Mumbai",
    risk: "89%",
    riskLevel: "Critical",
    status: "Review Required",
    pattern: "Cloned Debit Card Cash Out",
    timestamp: "28 Aug 2026, 13:12",
    ipAddress: "115.240.88.19 (Physical ATM Terminal)",
    ifsc: "ICIC0000214",
    complaintRef: "CC003 (ATM Skimming)",
  },
  {
    id: "TXN-82454",
    accountNo: "AC-56789012",
    beneficiary: "Sneha M. (SIM Swap Receiver)",
    amount: "₹2,50,000",
    rawAmount: 250000,
    location: "CP ATM-04, Delhi",
    city: "Delhi",
    risk: "95%",
    riskLevel: "Critical",
    status: "Review Required",
    pattern: "SIM Swap & RTGS Immediate Push",
    timestamp: "28 Aug 2026, 12:30",
    ipAddress: "182.73.110.45 (Tor Exit Node)",
    ifsc: "PUNB0004512",
    complaintRef: "CC004 (SIM Swap Syndicate)",
  },
  {
    id: "TXN-82455",
    accountNo: "AC-67890123",
    beneficiary: "Amit P. (Cross-Border Transfer)",
    amount: "₹35,000",
    rawAmount: 35000,
    location: "FC Road Kiosk, Pune",
    city: "Pune",
    risk: "68%",
    riskLevel: "Medium",
    status: "Monitoring",
    pattern: "Multiple Micro-Deposits via UPI",
    timestamp: "28 Aug 2026, 11:50",
    ipAddress: "106.51.78.23 (Residential IP)",
    ifsc: "UTIB0000987",
    complaintRef: "CC005 (Lottery Scam)",
  },
  {
    id: "TXN-82456",
    accountNo: "AC-89012345",
    beneficiary: "Rohit T. (Call Center Beneficiary)",
    amount: "₹1,85,000",
    rawAmount: 185000,
    location: "MG Road Metro ATM, Bangalore",
    city: "Bangalore",
    risk: "86%",
    riskLevel: "Critical",
    status: "Frozen / Lien Active",
    pattern: "Call Center Scam Layering",
    timestamp: "28 Aug 2026, 10:15",
    ipAddress: "122.166.45.90 (Bangalore Leased Line)",
    ifsc: "KKBK0000123",
    complaintRef: "CC006 (Tech Support Scam)",
  },
  {
    id: "TXN-82457",
    accountNo: "AC-12349876",
    beneficiary: "Sunil G. (Crypto Gateway Mule)",
    amount: "₹72,000",
    rawAmount: 72000,
    location: "Andheri West Branch, Mumbai",
    city: "Mumbai",
    risk: "81%",
    riskLevel: "High",
    status: "Escalated to LEA",
    pattern: "P2P Crypto Instant Liquidation",
    timestamp: "28 Aug 2026, 09:40",
    ipAddress: "157.48.99.12 (VPN Gateway)",
    ifsc: "YESB0000456",
    complaintRef: "CC007 (Crypto Fraud)",
  },
  {
    id: "TXN-82458",
    accountNo: "AC-45671234",
    beneficiary: "Pooja R. (Corporate Payroll)",
    amount: "₹28,000",
    rawAmount: 28000,
    location: "Dadar TT Circle, Mumbai",
    city: "Mumbai",
    risk: "32%",
    riskLevel: "Medium",
    status: "Cleared Normal",
    pattern: "Regular Payroll Disbursal",
    timestamp: "28 Aug 2026, 08:25",
    ipAddress: "114.143.12.80 (Corporate Leased)",
    ifsc: "SBIN0000345",
    complaintRef: "None (False Positive)",
  },
];

function BankTransactionTable({
  transactions,
  onReview,
  onQuickFreeze,
  onEscalate,
}) {
  const data = transactions || defaultBankTransactions.slice(0, 5);

  function getStatusBadge(status) {
    if (status === "Review Required") return "badge danger";
    if (status === "Frozen / Lien Active") return "badge success";
    if (status === "Escalated to LEA") return "badge danger";
    if (status === "Monitoring") return "badge pending";
    return "badge success";
  }

  function getRiskBadge(riskLevel) {
    if (riskLevel === "Critical") return "badge danger";
    if (riskLevel === "High") return "badge pending";
    return "badge success";
  }

  return (
    <div className="table-container" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Transaction &amp; A/C</th>
            <th>Beneficiary / Pattern</th>
            <th>Amount</th>
            <th>Location</th>
            <th>Risk Score</th>
            <th>Status</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#8ca5bd" }}>
                🔍 No transactions match the selected filter criteria.
              </td>
            </tr>
          ) : (
            data.map((txn) => (
              <tr key={txn.id}>
                <td>
                  <strong style={{ color: "var(--cyan)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {txn.id}
                  </strong>
                  <small style={{ display: "block", color: "#8da6be", fontSize: "11px" }}>
                    {txn.accountNo}
                  </small>
                </td>

                <td>
                  <strong>{txn.beneficiary}</strong>
                  <small style={{ display: "block", color: "#8ca5bd", fontSize: "11px" }}>
                    {txn.pattern}
                  </small>
                </td>

                <td>
                  <strong style={{ fontSize: "13.5px" }}>{txn.amount}</strong>
                  <small style={{ display: "block", color: "#748fa8", fontSize: "10.5px" }}>
                    {txn.timestamp.split(",")[1]}
                  </small>
                </td>

                <td>
                  <span>{txn.location}</span>
                </td>

                <td>
                  <span className={getRiskBadge(txn.riskLevel)}>
                    {txn.risk}
                  </span>
                </td>

                <td>
                  <span className={getStatusBadge(txn.status)}>
                    {txn.status}
                  </span>
                </td>

                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="small-btn"
                      onClick={() => onReview && onReview(txn)}
                      title="Review full transaction details"
                    >
                      👁️ Review
                    </button>
                    {txn.status !== "Frozen / Lien Active" && (
                      <button
                        type="button"
                        className="small-btn"
                        style={{
                          background: "rgba(255, 77, 103, 0.12)",
                          borderColor: "rgba(255, 77, 103, 0.3)",
                          color: "#ff8293",
                        }}
                        onClick={() => onQuickFreeze && onQuickFreeze(txn)}
                        title="Instant Lien Freeze"
                      >
                        🔒 Freeze
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* =====================================================
   BANK SUSPICIOUS TRANSACTIONS PAGE
===================================================== */

function SuspiciousTransactions() {
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem("cybex-bank-transactions");
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultBankTransactions;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("All Risk Levels");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // New Flag Transaction Form State
  const [flagForm, setFlagForm] = useState({
    accountNo: "",
    beneficiary: "",
    amount: "",
    location: "Andheri Branch, Mumbai",
    city: "Mumbai",
    pattern: "Suspicious Multi-Layered UPI Burst",
    riskLevel: "Critical",
  });

  function showToast(msg, type = "success") {
    setToastMessage({ text: msg, type: type });
    setTimeout(() => setToastMessage(null), 4500);
  }

  function saveAndSetTransactions(updated) {
    setTransactions(updated);
    try {
      localStorage.setItem("cybex-bank-transactions", JSON.stringify(updated));
    } catch {}
  }

  // Filtered dataset
  const filteredTransactions = transactions.filter((txn) => {
    const q = searchTerm.toLowerCase().trim();
    const matchQuery =
      !q ||
      txn.id.toLowerCase().includes(q) ||
      txn.accountNo.toLowerCase().includes(q) ||
      txn.beneficiary.toLowerCase().includes(q) ||
      txn.location.toLowerCase().includes(q) ||
      txn.pattern.toLowerCase().includes(q);

    const matchRisk =
      riskFilter === "All Risk Levels" ||
      txn.riskLevel === riskFilter ||
      (riskFilter === "Critical" && parseInt(txn.risk) >= 85);

    const matchLocation =
      locationFilter === "All Locations" ||
      txn.city === locationFilter ||
      txn.location.toLowerCase().includes(locationFilter.toLowerCase());

    const matchStatus =
      statusFilter === "All Status" || txn.status === statusFilter;

    return matchQuery && matchRisk && matchLocation && matchStatus;
  });

  // Action handlers
  function handleFreezeAccount(txn) {
    const updated = transactions.map((t) =>
      t.id === txn.id ? { ...t, status: "Frozen / Lien Active" } : t
    );
    saveAndSetTransactions(updated);
    if (selectedTxn && selectedTxn.id === txn.id) {
      setSelectedTxn((prev) => ({ ...prev, status: "Frozen / Lien Active" }));
    }
    showToast(
      `🔒 Emergency Lien placed on A/C ${txn.accountNo} (${txn.amount}). Outward debit frozen.`
    );
  }

  function handleEscalateLEA(txn) {
    const updated = transactions.map((t) =>
      t.id === txn.id ? { ...t, status: "Escalated to LEA" } : t
    );
    saveAndSetTransactions(updated);
    if (selectedTxn && selectedTxn.id === txn.id) {
      setSelectedTxn((prev) => ({ ...prev, status: "Escalated to LEA" }));
    }
    showToast(
      `🚨 Incident ${txn.id} escalated to State Cyber Crime Police Station for FIR linking.`
    );
  }

  function handleSetMonitoring(txn) {
    const updated = transactions.map((t) =>
      t.id === txn.id ? { ...t, status: "Monitoring" } : t
    );
    saveAndSetTransactions(updated);
    if (selectedTxn && selectedTxn.id === txn.id) {
      setSelectedTxn((prev) => ({ ...prev, status: "Monitoring" }));
    }
    showToast(`👁️ A/C ${txn.accountNo} placed under 24/7 AI velocity monitoring.`);
  }

  function handleMarkCleared(txn) {
    const updated = transactions.map((t) =>
      t.id === txn.id ? { ...t, status: "Cleared Normal" } : t
    );
    saveAndSetTransactions(updated);
    if (selectedTxn && selectedTxn.id === txn.id) {
      setSelectedTxn((prev) => ({ ...prev, status: "Cleared Normal" }));
    }
    showToast(`✓ Transaction ${txn.id} cleared as legitimate / false positive.`);
  }

  function handleBulkFreezeCritical() {
    const criticalCount = filteredTransactions.filter(
      (t) => t.status === "Review Required" && (t.riskLevel === "Critical" || parseInt(t.risk) >= 80)
    ).length;

    if (criticalCount === 0) {
      showToast("No pending critical transactions requiring bulk freeze in current view.", "info");
      return;
    }

    const updated = transactions.map((t) => {
      if (
        filteredTransactions.some((ft) => ft.id === t.id) &&
        t.status === "Review Required" &&
        (t.riskLevel === "Critical" || parseInt(t.risk) >= 80)
      ) {
        return { ...t, status: "Frozen / Lien Active" };
      }
      return t;
    });

    saveAndSetTransactions(updated);
    showToast(`⚡ Bulk freeze successful! Placed emergency lien on ${criticalCount} high-risk accounts.`);
  }

  function handleExportAuditReport() {
    const totalVol = filteredTransactions.reduce(
      (acc, t) => acc + (t.rawAmount || 0),
      0
    );
    alert(
      `[AUDIT EXPORT READY]\n\nExported: ${filteredTransactions.length} Suspicious Transactions\nTotal Monitored Volume: ₹${totalVol.toLocaleString("en-IN")}\nFormat: Encrypted Banking STR & Audit PDF\nClearance: Banking Nodal Authority`
    );
    showToast(`📥 Exported audit report for ${filteredTransactions.length} transactions.`);
  }

  function handleCreateFlaggedTxn(e) {
    e.preventDefault();
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const newTxn = {
      id: `TXN-${randNum}`,
      accountNo: flagForm.accountNo.trim() || `AC-${Math.floor(10000000 + Math.random() * 90000000)}`,
      beneficiary: flagForm.beneficiary.trim() || "Manual Flagged Account",
      amount: flagForm.amount.startsWith("₹") ? flagForm.amount : `₹${flagForm.amount}`,
      rawAmount: parseInt(flagForm.amount.replace(/[^0-9]/g, "")) || 50000,
      location: flagForm.location,
      city: flagForm.city,
      risk: flagForm.riskLevel === "Critical" ? "91%" : "76%",
      riskLevel: flagForm.riskLevel,
      status: "Review Required",
      pattern: flagForm.pattern,
      timestamp: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      ipAddress: "103.44.12.98 (Flagged Subnet)",
      ifsc: "SBIN0000100",
      complaintRef: "Manual Flag (Nodal Vigilance)",
    };

    saveAndSetTransactions([newTxn, ...transactions]);
    setShowFlagModal(false);
    showToast(`⚡ New suspicious transaction ${newTxn.id} flagged and added to review queue!`);
    setFlagForm({
      accountNo: "",
      beneficiary: "",
      amount: "",
      location: "Andheri Branch, Mumbai",
      city: "Mumbai",
      pattern: "Suspicious Multi-Layered UPI Burst",
      riskLevel: "Critical",
    });
  }

  function handleResetFilters() {
    setSearchTerm("");
    setRiskFilter("All Risk Levels");
    setLocationFilter("All Locations");
    setStatusFilter("All Status");
    showToast("Filters reset to default view.");
  }

  return (
    <BankLayout title="Suspicious Transactions">
      <div className="page-toolbar">
        <div>
          <h2>Suspicious Transactions Surveillance</h2>
          <p>
            Real-time multi-channel fraud telemetry and automated lien enforcement
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleBulkFreezeCritical}
            title="Bulk freeze all pending critical accounts"
          >
            ⚡ Bulk Lien Freeze
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setShowFlagModal(true)}
          >
            + Flag Transaction
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={handleExportAuditReport}
          >
            📥 Export Report
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className="success-message"
          style={{
            marginBottom: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="filter-card">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Search by TXN ID, A/C, Beneficiary, Location..."
        />

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          <option value="All Risk Levels">All Risk Levels</option>
          <option value="Critical">Critical Threat (&gt;85%)</option>
          <option value="High">High Threat (70-85%)</option>
          <option value="Medium">Medium Threat (&lt;70%)</option>
        </select>

        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="All Locations">All Locations</option>
          <option value="Mumbai">Mumbai</option>
          <option value="Delhi">Delhi</option>
          <option value="Pune">Pune</option>
          <option value="Bangalore">Bangalore</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All Status">All Status</option>
          <option value="Review Required">Review Required</option>
          <option value="Monitoring">Monitoring</option>
          <option value="Frozen / Lien Active">Frozen / Lien Active</option>
          <option value="Escalated to LEA">Escalated to LEA</option>
          <option value="Cleared Normal">Cleared Normal</option>
        </select>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "12.5px", color: "#8da6be" }}>
        <span>
          Showing <strong>{filteredTransactions.length}</strong> of{" "}
          <strong>{transactions.length}</strong> transactions
        </span>
        {(searchTerm || riskFilter !== "All Risk Levels" || locationFilter !== "All Locations" || statusFilter !== "All Status") && (
          <button
            type="button"
            className="small-btn"
            style={{ padding: "4px 10px", fontSize: "11.5px" }}
            onClick={handleResetFilters}
          >
            Reset Filters ↺
          </button>
        )}
      </div>

      <div className="card">
        <BankTransactionTable
          transactions={filteredTransactions}
          onReview={(txn) => setSelectedTxn(txn)}
          onQuickFreeze={(txn) => handleFreezeAccount(txn)}
        />
      </div>

      {/* Transaction Investigation & Action Modal */}
      {selectedTxn && (
        <div
          className="custom-modal-backdrop"
          onClick={(e) => {
            if (e.target.className === "custom-modal-backdrop") {
              setSelectedTxn(null);
            }
          }}
        >
          <div className="custom-modal-dialog">
            <div className="custom-modal-header">
              <h3>
                <span>💳</span>
                Investigation Dossier: {selectedTxn.id}
              </h3>
              <button
                type="button"
                className="custom-modal-close"
                onClick={() => setSelectedTxn(null)}
              >
                ✕
              </button>
            </div>

            <div className="custom-modal-body">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "rgba(57,215,255,0.04)",
                  border: "1px solid rgba(57,215,255,0.12)",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "#8ca5bd", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
                    Total Transaction Value
                  </span>
                  <h2 style={{ margin: "4px 0 0", color: "#fff", fontSize: "22px" }}>
                    {selectedTxn.amount}
                  </h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", color: "#8ca5bd", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
                    Threat Score
                  </span>
                  <div style={{ marginTop: "4px" }}>
                    <span className={selectedTxn.riskLevel === "Critical" ? "badge danger" : "badge pending"} style={{ fontSize: "13px", padding: "6px 12px" }}>
                      {selectedTxn.risk} Threat ({selectedTxn.riskLevel})
                    </span>
                  </div>
                </div>
              </div>

              <div className="report-grid" style={{ marginTop: 0 }}>
                <div>
                  <span>Beneficiary Account</span>
                  <strong>{selectedTxn.accountNo}</strong>
                </div>
                <div>
                  <span>Account Holder Name</span>
                  <strong>{selectedTxn.beneficiary}</strong>
                </div>
                <div>
                  <span>IFSC / Branch</span>
                  <strong>{selectedTxn.ifsc}</strong>
                </div>
                <div>
                  <span>Location / Terminal</span>
                  <strong>{selectedTxn.location}</strong>
                </div>
                <div>
                  <span>Originating Channel</span>
                  <strong>{selectedTxn.pattern}</strong>
                </div>
                <div>
                  <span>Timestamp</span>
                  <strong>{selectedTxn.timestamp}</strong>
                </div>
                <div>
                  <span>Originating IP Address</span>
                  <strong>{selectedTxn.ipAddress}</strong>
                </div>
                <div>
                  <span>Linked FIR / Complaint</span>
                  <strong>{selectedTxn.complaintRef}</strong>
                </div>
                <div>
                  <span>Current Enforcement State</span>
                  <strong style={{ color: selectedTxn.status.includes("Frozen") ? "var(--green)" : "var(--cyan)" }}>
                    {selectedTxn.status}
                  </strong>
                </div>
              </div>

              <div style={{ marginTop: "20px", padding: "14px 16px", borderRadius: "10px", background: "rgba(255,77,103,0.06)", border: "1px solid rgba(255,77,103,0.18)" }}>
                <strong style={{ display: "block", color: "#ff8798", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "4px" }}>
                  🚨 Automated Fraud Indicator Rationale
                </strong>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "12.5px", lineHeight: "1.5" }}>
                  The AI surveillance model detected rapid multi-burst velocity with zero lingering balance retention. Pattern matches known mule syndicate cash-out signatures identified in active cybercrime complaint {selectedTxn.complaintRef}.
                </p>
              </div>

              {/* Action Buttons Inside Modal */}
              <div style={{ marginTop: "24px", display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {selectedTxn.status !== "Frozen / Lien Active" && (
                  <button
                    type="button"
                    className="danger-btn"
                    style={{ padding: "10px 16px", fontSize: "13px" }}
                    onClick={() => handleFreezeAccount(selectedTxn)}
                  >
                    🔒 Freeze Account &amp; Place Lien
                  </button>
                )}

                {selectedTxn.status !== "Escalated to LEA" && (
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ padding: "10px 16px", fontSize: "13px" }}
                    onClick={() => handleEscalateLEA(selectedTxn)}
                  >
                    🚨 Escalate to Police / LEA
                  </button>
                )}

                {selectedTxn.status !== "Monitoring" && (
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ padding: "10px 16px", fontSize: "13px" }}
                    onClick={() => handleSetMonitoring(selectedTxn)}
                  >
                    👁️ Put on Monitoring
                  </button>
                )}

                {selectedTxn.status !== "Cleared Normal" && (
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ padding: "10px 16px", fontSize: "13px" }}
                    onClick={() => handleMarkCleared(selectedTxn)}
                  >
                    ✓ Mark Cleared
                  </button>
                )}

                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: "10px 16px", fontSize: "13px" }}
                  onClick={() => {
                    alert(`[STR DOSSIER DOWNLOADED] STR package for ${selectedTxn.id} (A/C ${selectedTxn.accountNo}) prepared for FIU-IND submission.`);
                    showToast(`📥 STR package downloaded for ${selectedTxn.id}.`);
                  }}
                >
                  📥 Export STR Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Flag Transaction Modal */}
      {showFlagModal && (
        <div
          className="custom-modal-backdrop"
          onClick={(e) => {
            if (e.target.className === "custom-modal-backdrop") {
              setShowFlagModal(false);
            }
          }}
        >
          <div className="custom-modal-dialog">
            <div className="custom-modal-header">
              <h3>⚡ Flag New Suspicious Transaction</h3>
              <button
                type="button"
                className="custom-modal-close"
                onClick={() => setShowFlagModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="custom-modal-body">
              <form onSubmit={handleCreateFlaggedTxn}>
                <div className="form-two-column">
                  <div>
                    <label>Beneficiary Account Number</label>
                    <input
                      type="text"
                      value={flagForm.accountNo}
                      onChange={(e) => setFlagForm((prev) => ({ ...prev, accountNo: e.target.value }))}
                      placeholder="e.g. AC-78941234"
                      required
                    />
                  </div>

                  <div>
                    <label>Beneficiary Name</label>
                    <input
                      type="text"
                      value={flagForm.beneficiary}
                      onChange={(e) => setFlagForm((prev) => ({ ...prev, beneficiary: e.target.value }))}
                      placeholder="e.g. Amit Kumar"
                      required
                    />
                  </div>
                </div>

                <div className="form-two-column">
                  <div>
                    <label>Transaction Amount (₹)</label>
                    <input
                      type="text"
                      value={flagForm.amount}
                      onChange={(e) => setFlagForm((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g. 75,000"
                      required
                    />
                  </div>

                  <div>
                    <label>Risk Level</label>
                    <select
                      value={flagForm.riskLevel}
                      onChange={(e) => setFlagForm((prev) => ({ ...prev, riskLevel: e.target.value }))}
                    >
                      <option value="Critical">Critical (&gt;85%)</option>
                      <option value="High">High (70-85%)</option>
                      <option value="Medium">Medium (&lt;70%)</option>
                    </select>
                  </div>
                </div>

                <div className="form-two-column">
                  <div>
                    <label>Branch / ATM Location</label>
                    <input
                      type="text"
                      value={flagForm.location}
                      onChange={(e) => setFlagForm((prev) => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. Andheri Branch, Mumbai"
                      required
                    />
                  </div>

                  <div>
                    <label>City Region</label>
                    <select
                      value={flagForm.city}
                      onChange={(e) => setFlagForm((prev) => ({ ...prev, city: e.target.value }))}
                    >
                      <option value="Mumbai">Mumbai</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Pune">Pune</option>
                      <option value="Bangalore">Bangalore</option>
                    </select>
                  </div>
                </div>

                <label>Suspicious Pattern / Rationale</label>
                <input
                  type="text"
                  value={flagForm.pattern}
                  onChange={(e) => setFlagForm((prev) => ({ ...prev, pattern: e.target.value }))}
                  placeholder="e.g. Rapid UPI Burst from high-risk subnet"
                  required
                />

                <div style={{ marginTop: "22px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setShowFlagModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn">
                    ⚡ Flag &amp; Queue for Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </BankLayout>
  );
}

/* =====================================================
   BANK ATM RISK
===================================================== */

function AtmRisk() {
  return (
    <BankLayout title="ATM / Withdrawal Risk">
      <div className="stats-grid">
        <StatCard
          title="High Risk ATMs"
          value="12"
          change="Immediate Review"
          icon="🔴"
        />

        <StatCard
          title="Medium Risk ATMs"
          value="22"
          change="Monitoring"
          icon="🟠"
        />

        <StatCard
          title="Normal ATMs"
          value="184"
          change="Safe"
          icon="🟢"
        />

        <StatCard
          title="Total ATMs"
          value="218"
          change="Network"
          icon="🏧"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>ATM Risk Monitoring</h3>

            <p>
              Predicted withdrawal risk by ATM
              location.
            </p>
          </div>
        </div>

        <div className="atm-grid">
          <div className="atm-card high">
            <span>🏧</span>
            <strong>Andheri ATM-01</strong>
            <b>92% Risk</b>
          </div>

          <div className="atm-card high">
            <span>🏧</span>
            <strong>South Mumbai ATM-04</strong>
            <b>88% Risk</b>
          </div>

          <div className="atm-card medium">
            <span>🏧</span>
            <strong>Bandra ATM-09</strong>
            <b>71% Risk</b>
          </div>

          <div className="atm-card safe">
            <span>🏧</span>
            <strong>Dadar ATM-03</strong>
            <b>28% Risk</b>
          </div>
        </div>
      </div>
    </BankLayout>
  );
}

/* =====================================================
   BANK FUND BLOCKING
===================================================== */

function FundBlocking() {
  const [blocked, setBlocked] =
    useState(false);

  return (
    <BankLayout title="Fund Blocking">
      <div className="card fund-block-card">
        <div className="form-heading">
          <span>🔒</span>

          <div>
            <h2>Emergency Fund Blocking</h2>

            <p>
              Review and initiate blocking of
              suspicious funds.
            </p>
          </div>
        </div>

        <label>Transaction ID</label>

        <input
          placeholder="Enter transaction ID"
          defaultValue="TXN-82451"
        />

        <label>Amount</label>

        <input
          placeholder="Transaction amount"
          defaultValue="₹95,000"
        />

        <label>Reason</label>

        <textarea
          rows="4"
          placeholder="Enter reason for blocking..."
        ></textarea>

        <div className="warning-box">
          ⚠️ This is a demo interface. Actual
          fund blocking must be securely connected
          to the bank's authorized systems.
        </div>

        <button
          className="danger-btn"
          onClick={() => setBlocked(true)}
        >
          🔒 Initiate Fund Blocking
        </button>

        {blocked && (
          <div className="success-message">
            ✓ Fund blocking request submitted for
            authorized review.
          </div>
        )}
      </div>
    </BankLayout>
  );
}

/* =====================================================
   BANK ANALYTICS
===================================================== */

function BankAnalytics() {
  return (
    <BankLayout title="Transaction Analytics">
      <div className="stats-grid">
        <StatCard
          title="Fraud Transactions"
          value="384"
          change="+14%"
          icon="📈"
        />

        <StatCard
          title="Blocked Transactions"
          value="218"
          change="56.7%"
          icon="🔒"
        />

        <StatCard
          title="Recovered Amount"
          value="₹12.4L"
          change="This Month"
          icon="💰"
        />

        <StatCard
          title="Detection Rate"
          value="89%"
          change="AI Assisted"
          icon="🎯"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Fraud Category Distribution</h3>
            <p>Current monitoring period</p>
          </div>
        </div>

        <RiskBar
          name="UPI Fraud"
          value={42}
          color="danger"
        />

        <RiskBar
          name="ATM Fraud"
          value={25}
          color="warning"
        />

        <RiskBar
          name="Phishing"
          value={19}
          color="medium"
        />

        <RiskBar
          name="Other"
          value={14}
          color="safe"
        />
      </div>
    </BankLayout>
  );
}

const bankReportsData = [
  {
    id: "risk-alert",
    icon: "🚨",
    title: "Risk Alert & Hotspot Intelligence",
    description: "Geospatial cash-out surges and predicted ATM threat clusters.",
    date: "25 Aug 2026",
    reportId: "BRPT-ALERT-2026-0825",
    priority: "HIGH PRIORITY",
    priorityClass: "danger",
    metrics: [
      { label: "Active Risk Alerts", value: "18 Triggers" },
      { label: "Hotspot Vulnerability", value: "Andheri West & BKC" },
      { label: "Threat Probability", value: "91% Peak" },
      { label: "Preventive Interventions", value: "12 Nodes Protected" },
    ],
    summary:
      "Automated surveillance flagged rapid cash withdrawal indicators in Western Mumbai commercial corridors between 19:00 - 22:00. 4 ATM nodes were quarantined.",
    tableData: [
      { col1: "ATM-MUM-01 (Andheri Link Rd)", col2: "₹18,50,000 Volume", col3: "92% Risk", col4: "Quarantined", badge: "danger" },
      { col1: "ATM-MUM-04 (Fort Financial Hub)", col2: "₹24,00,000 Volume", col3: "89% Risk", col4: "LEA Alerted", badge: "danger" },
      { col1: "ATM-MUM-09 (Bandra BKC Complex)", col2: "₹9,20,000 Volume", col3: "71% Risk", col4: "Monitoring", badge: "warning" },
      { col1: "ATM-MUM-03 (Dadar TT Circle)", col2: "₹4,10,000 Volume", col3: "28% Risk", col4: "Normal", badge: "success" },
    ],
    actionPlan:
      "Deploy patrol verification at flagged ATM clusters. Temporarily throttle per-transaction withdrawal velocity to ₹10,000 during high-risk window.",
  },
  {
    id: "txn-audit",
    icon: "💳",
    title: "Suspicious Transaction & Mule Audit",
    description: "Rapid velocity UPI transfers, mule account chains, and layering patterns.",
    date: "25 Aug 2026",
    reportId: "BRPT-TXN-2026-0825",
    priority: "CRITICAL AUDIT",
    priorityClass: "danger",
    metrics: [
      { label: "Flagged Transactions", value: "384 Records" },
      { label: "Mule Accounts Detected", value: "42 Accounts" },
      { label: "Total Suspicious Volume", value: "₹48.6 Lakhs" },
      { label: "Auto-Interception Rate", value: "94.2%" },
    ],
    summary:
      "Detection of automated rapid-burst transfers originating from high-risk IP subnets. Multiple beneficiary accounts exhibited instant zero-balance drainage.",
    tableData: [
      { col1: "AC-78945612 (A/C Rajesh S.)", col2: "₹45,000 (5 Burst Txns)", col3: "94% Mule Score", col4: "Account Frozen", badge: "danger" },
      { col1: "AC-34567890 (A/C Vikram K.)", col2: "₹1,20,000 (Layered)", col3: "88% Mule Score", col4: "Under Review", badge: "warning" },
      { col1: "AC-90123456 (A/C Amit P.)", col2: "₹75,000 (Rapid UPI)", col3: "82% Mule Score", col4: "Outward Hold", badge: "danger" },
      { col1: "AC-56789012 (A/C Sneha M.)", col2: "₹30,000 (Cross-Bank)", col3: "35% Mule Score", col4: "Verified Clear", badge: "success" },
    ],
    actionPlan:
      "Freeze outward debit capabilities on identified Tier-1 mule accounts. File Suspicious Transaction Reports (STR) with FIU-IND within 24 hours.",
  },
  {
    id: "atm-threat",
    icon: "🏧",
    title: "ATM Node Vulnerability Report",
    description: "Physical and logical cash dispenser threat mapping and hardware security audit.",
    date: "24 Aug 2026",
    reportId: "BRPT-ATM-2026-0824",
    priority: "HIGH PRIORITY",
    priorityClass: "warning",
    metrics: [
      { label: "Total Monitored ATMs", value: "148 Kiosks" },
      { label: "High Vulnerability Nodes", value: "8 Kiosks" },
      { label: "Hardware Skimmer Risk", value: "Low (No Hardware Tamper)" },
      { label: "CCTV Uptime Ratio", value: "98.4%" },
    ],
    summary:
      "Analysis of abnormal night-time ATM transactions across metro nodes. Identifies dispensers targeted by cloning syndicates and cloned card cash-out groups.",
    tableData: [
      { col1: "ATM-DEL-01 (CP Inner Circle)", col2: "₹14,50,000 Dispensed", col3: "91% Risk", col4: "Armed Guard Alerted", badge: "danger" },
      { col1: "ATM-BLR-01 (MG Road Metro)", col2: "₹11,80,000 Dispensed", col3: "88% Risk", col4: "Dispenser Throttled", badge: "warning" },
      { col1: "ATM-PUN-01 (FC Road Kiosk)", col2: "₹8,40,000 Dispensed", col3: "86% Risk", col4: "CCTV Monitored", badge: "warning" },
      { col1: "ATM-BLR-02 (Electronic City)", col2: "₹3,20,000 Dispensed", col3: "70% Risk", col4: "Normal Operation", badge: "success" },
    ],
    actionPlan:
      "Enforce mandatory biometric or OTP secondary authorization for cash withdrawals exceeding ₹25,000 between 23:00 and 06:00.",
  },
  {
    id: "fund-freeze",
    icon: "🔒",
    title: "Emergency Fund Blocking & Recovery",
    description: "Inter-bank fund blocking, lien placement, and victim recovery audit.",
    date: "24 Aug 2026",
    reportId: "BRPT-FRZ-2026-0824",
    priority: "RECOVERY AUDIT",
    priorityClass: "success",
    metrics: [
      { label: "Total Funds Frozen", value: "₹24,80,000" },
      { label: "Successful Liens Placed", value: "28 Accounts" },
      { label: "Average Response Time", value: "4.2 Minutes" },
      { label: "Victim Restitution Est.", value: "₹19.2 Lakhs (77%)" },
    ],
    summary:
      "Emergency freeze mandates executed upon LEA cybercrime alert reception. Rapid inter-bank communications prevented 77% of defrauded funds from being withdrawn.",
    tableData: [
      { col1: "Lien Mandate #FRZ-8891 (HDFC Bank)", col2: "₹4,50,000 Frozen", col3: "100% Retained", col4: "Lien Active", badge: "success" },
      { col1: "Lien Mandate #FRZ-8892 (ICICI Bank)", col2: "₹2,40,000 Frozen", col3: "100% Retained", col4: "Court Release Pending", badge: "success" },
      { col1: "Lien Mandate #FRZ-8893 (Axis Bank)", col2: "₹1,80,000 Frozen", col3: "85% Retained", col4: "Lien Active", badge: "success" },
      { col1: "Lien Mandate #FRZ-8894 (SBI Branch)", col2: "₹6,10,000 Frozen", col3: "90% Retained", col4: "Restitution In Progress", badge: "success" },
    ],
    actionPlan:
      "Coordinate with State Cyber Crime Police Station for speedier issuance of Section 91 CrPC / 102 CrPC formal release certificates to return funds to victims.",
  },
];

function BankReports() {
  const [reportsList, setReportsList] = useState(bankReportsData);
  const [selectedReport, setSelectedReport] = useState(() => bankReportsData[0]);
  const [showModal, setShowModal] = useState(false);
  const [customSuccess, setCustomSuccess] = useState(false);

  const [formState, setFormState] = useState({
    auditTitle: "",
    auditCategory: "Suspicious Transaction & Mule Audit",
    timeframe: "Last 24 Hours",
    riskThreshold: "High & Critical Threat (>70%)",
    targetBranch: "",
    nodalOfficer: "",
    classification: "Confidential - LEA & Regulatory Shared",
    notes: "",
  });

  function handleFormChange(field, value) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  function handleCreateAudit(e) {
    e.preventDefault();

    const categoryIcons = {
      "Suspicious Transaction & Mule Audit": "💳",
      "ATM Cash-Out Risk Assessment": "🏧",
      "Emergency Fund Blocking & Recovery": "🔒",
      "UPI Layering & Phishing Audit": "🚨",
    };

    const icon = categoryIcons[formState.auditCategory] || "📑";
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const randId = Math.floor(1000 + Math.random() * 9000);
    const reportCode = `BRPT-CUST-${randId}`;

    const title =
      formState.auditTitle.trim() ||
      `${formState.auditCategory} - ${formState.targetBranch.trim() || "Regional Scope"}`;

    const newReport = {
      id: `custom-audit-${Date.now()}`,
      icon: icon,
      title: title,
      description: `Custom audit compiled for ${formState.targetBranch.trim() || "All Monitored Branches"} (${formState.timeframe}, ${formState.riskThreshold}).`,
      date: dateStr,
      reportId: reportCode,
      priority: formState.riskThreshold.includes("Critical")
        ? "CRITICAL AUDIT"
        : "CUSTOM AUDIT",
      priorityClass: formState.riskThreshold.includes("Critical")
        ? "danger"
        : "warning",
      metrics: [
        {
          label: "Target Scope / Cluster",
          value: formState.targetBranch.trim() || "Multi-Branch Grid",
        },
        {
          label: "Timeframe Analyzed",
          value: formState.timeframe,
        },
        {
          label: "Monitored Anomalies",
          value: `${Math.floor(Math.random() * 60 + 25)} Flagged Nodes`,
        },
        {
          label: "Loss Intercepted",
          value: `₹${(Math.random() * 25 + 8).toFixed(2)} Lakhs`,
        },
      ],
      summary:
        formState.notes.trim() ||
        `On-demand institutional audit executed for ${title}. Surveillance algorithms cross-correlated high-velocity transactions, IP subnet risk signatures, and nodal alert telemetry under ${formState.classification}.`,
      tableData: [
        {
          col1: `Target #1 (${formState.targetBranch.trim() || "Primary Node"})`,
          col2: `₹${Math.floor(Math.random() * 15 + 4)},50,000 Volume`,
          col3: "91% Risk Score",
          col4: "Action Initiated",
          badge: "danger",
        },
        {
          col1: "Secondary Node #2 (Transit ATM)",
          col2: `₹${Math.floor(Math.random() * 8 + 2)},20,000 Volume`,
          col3: "84% Risk Score",
          col4: "Under Investigation",
          badge: "warning",
        },
        {
          col1: "Beneficiary A/C Cluster #3",
          col2: "₹3,40,000 Layered",
          col3: "76% Risk Score",
          col4: "Lien Placed",
          badge: "success",
        },
        {
          col1: "Beneficiary A/C Cluster #4",
          col2: "₹1,15,000 Retained",
          col3: "30% Risk Score",
          col4: "Cleared Normal",
          badge: "success",
        },
      ],
      actionPlan: `Proceed with Tier-1 debit hold on accounts identified under ${reportCode}. Submit formal compliance memorandum signed by ${formState.nodalOfficer.trim() || "Authorized Nodal Officer"}.`,
    };

    setReportsList((prev) => [newReport, ...prev]);
    setSelectedReport(newReport);
    setShowModal(false);
    setCustomSuccess(true);

    // Reset form
    setFormState({
      auditTitle: "",
      auditCategory: "Suspicious Transaction & Mule Audit",
      timeframe: "Last 24 Hours",
      riskThreshold: "High & Critical Threat (>70%)",
      targetBranch: "",
      nodalOfficer: "",
      classification: "Confidential - LEA & Regulatory Shared",
      notes: "",
    });

    setTimeout(() => setCustomSuccess(false), 5000);
  }

  return (
    <BankLayout title="Bank Reports & Audit">
      <div className="page-toolbar">
        <div>
          <h2>Fraud Intelligence &amp; Audit Reports</h2>
          <p>
            Review and export institutional fraud monitoring and recovery analytics
          </p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => setShowModal(true)}
        >
          ⚡ + Generate Custom Audit
        </button>
      </div>

      {customSuccess && (
        <div
          className="success-message"
          style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}
        >
          <span>✓</span>
          <div>
            <strong>Custom Audit Generated Successfully!</strong>
            <p style={{ margin: 0, fontSize: "12px" }}>
              The newly compiled audit report ({selectedReport.reportId}) is now active in the viewer below.
            </p>
          </div>
        </div>
      )}

      {/* Reports Grid */}
      <div className="reports-grid">
        {reportsList.map((report) => (
          <ReportCard
            key={report.id}
            icon={report.icon}
            title={report.title}
            description={report.description}
            date={report.date}
            active={selectedReport.id === report.id}
            onClick={() => setSelectedReport(report)}
          />
        ))}
      </div>

      {/* Detailed Bank Report Viewer */}
      <div className="card intelligence-report" id="bank-report-viewer" style={{ marginTop: "20px" }}>
        <div className="report-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2>{selectedReport.title}</h2>
              <span className={`badge ${selectedReport.priorityClass}`}>
                {selectedReport.priority}
              </span>
            </div>
            <p>
              Report ID: {selectedReport.reportId} &bull; Generated:{" "}
              {selectedReport.date} &bull; Security Clearance: Banking Nodal Authority
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="small-btn"
              onClick={() =>
                alert(
                  `[EXPORT COMPLETE] ${selectedReport.title} (${selectedReport.reportId}) downloaded in encrypted PDF format.`
                )
              }
            >
              📥 Export PDF
            </button>
            <button
              type="button"
              className="small-btn"
              onClick={() =>
                alert(
                  `[CSV EXPORT] Transaction audit dataset for ${selectedReport.reportId} exported to CSV.`
                )
              }
            >
              📊 Export CSV
            </button>
            <button
              type="button"
              className="small-btn"
              onClick={() => window.print()}
            >
              🖨️ Print
            </button>
          </div>
        </div>

        <div className="report-grid">
          {selectedReport.metrics.map((metric, idx) => (
            <div key={idx}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>

        <div
          className="report-summary-box"
          style={{
            marginTop: "18px",
            padding: "14px 16px",
            borderRadius: "10px",
            background: "rgba(57,215,255,0.04)",
            border: "1px solid rgba(57,215,255,0.12)",
          }}
        >
          <strong
            style={{
              display: "block",
              color: "var(--cyan)",
              fontSize: "12px",
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: ".05em",
              marginBottom: "4px",
            }}
          >
            Banking Fraud Intelligence Summary
          </strong>
          <p style={{ margin: 0, color: "#a5bdd3", fontSize: "13px", lineHeight: "1.6" }}>
            {selectedReport.summary}
          </p>
        </div>

        <div style={{ marginTop: "20px", overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "14.5px" }}>
            Incident &amp; Beneficiary Account Breakdown
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Account / Node / Mandate</th>
                <th>Volume / Threat Pattern</th>
                <th>Risk / Retention Score</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedReport.tableData.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <strong>{row.col1}</strong>
                  </td>
                  <td>{row.col2}</td>
                  <td>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {row.col3}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${row.badge}`}>{row.col4}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="recommendation">
          <h3>Recommended Banking Enforcement &amp; Compliance Action</h3>
          <p>{selectedReport.actionPlan}</p>
        </div>
      </div>

      {/* Generate Custom Audit Modal Dialog */}
      {showModal && (
        <div
          className="custom-modal-backdrop"
          onClick={(e) => {
            if (e.target.className === "custom-modal-backdrop") {
              setShowModal(false);
            }
          }}
        >
          <div className="custom-modal-dialog">
            <div className="custom-modal-header">
              <h3>⚡ Generate Custom Institutional Audit</h3>
              <button
                type="button"
                className="custom-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="custom-modal-body">
              <form onSubmit={handleCreateAudit}>
                <label>Audit Title</label>
                <input
                  type="text"
                  value={formState.auditTitle}
                  onChange={(e) => handleFormChange("auditTitle", e.target.value)}
                  placeholder="e.g. Western Express ATM Skimming & Mule Ring Audit"
                />

                <div className="form-two-column">
                  <div>
                    <label>Audit Category</label>
                    <select
                      value={formState.auditCategory}
                      onChange={(e) => handleFormChange("auditCategory", e.target.value)}
                    >
                      <option value="Suspicious Transaction & Mule Audit">
                        Suspicious Transaction &amp; Mule Audit
                      </option>
                      <option value="ATM Cash-Out Risk Assessment">
                        ATM Cash-Out Risk Assessment
                      </option>
                      <option value="Emergency Fund Blocking & Recovery">
                        Emergency Fund Blocking &amp; Recovery
                      </option>
                      <option value="UPI Layering & Phishing Audit">
                        UPI Layering &amp; Phishing Audit
                      </option>
                    </select>
                  </div>

                  <div>
                    <label>Timeframe</label>
                    <select
                      value={formState.timeframe}
                      onChange={(e) => handleFormChange("timeframe", e.target.value)}
                    >
                      <option value="Today (Real-time)">Today (Real-time)</option>
                      <option value="Last 24 Hours">Last 24 Hours</option>
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                      <option value="Quarterly Audit (Q3 2026)">Quarterly Audit (Q3 2026)</option>
                    </select>
                  </div>
                </div>

                <div className="form-two-column">
                  <div>
                    <label>Target Branch / ATM Cluster</label>
                    <input
                      type="text"
                      value={formState.targetBranch}
                      onChange={(e) => handleFormChange("targetBranch", e.target.value)}
                      placeholder="e.g. Mumbai West Cluster, BKC Branch"
                      required
                    />
                  </div>

                  <div>
                    <label>Risk Threshold</label>
                    <select
                      value={formState.riskThreshold}
                      onChange={(e) => handleFormChange("riskThreshold", e.target.value)}
                    >
                      <option value="Critical Threat Only (>85%)">
                        Critical Threat Only (&gt;85%)
                      </option>
                      <option value="High & Critical Threat (>70%)">
                        High &amp; Critical Threat (&gt;70%)
                      </option>
                      <option value="All Monitored Anomalies">
                        All Monitored Anomalies
                      </option>
                    </select>
                  </div>
                </div>

                <div className="form-two-column">
                  <div>
                    <label>Nodal Auditor / Supervising Officer</label>
                    <input
                      type="text"
                      value={formState.nodalOfficer}
                      onChange={(e) => handleFormChange("nodalOfficer", e.target.value)}
                      placeholder="e.g. Rajesh Verma (Chief Vigilance Officer)"
                    />
                  </div>

                  <div>
                    <label>Classification &amp; Clearance</label>
                    <select
                      value={formState.classification}
                      onChange={(e) => handleFormChange("classification", e.target.value)}
                    >
                      <option value="Confidential - LEA & Regulatory Shared">
                        Confidential - LEA &amp; Regulatory Shared
                      </option>
                      <option value="Internal Fraud Risk Committee Only">
                        Internal Fraud Risk Committee Only
                      </option>
                      <option value="FIU-IND Regulatory Submission">
                        FIU-IND Regulatory Submission
                      </option>
                    </select>
                  </div>
                </div>

                <label>Special Investigation Notes &amp; Scope</label>
                <textarea
                  rows="3"
                  value={formState.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  placeholder="Enter specific audit rationale, reference FIR/Complaint IDs or mandate numbers..."
                  style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", minHeight: "80px" }}
                />

                <div
                  style={{
                    marginTop: "22px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn">
                    ⚡ Compile &amp; Generate Audit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </BankLayout>
  );
}

/* =====================================================
   BANK SETTINGS
===================================================== */

function BankSettings() {
  const [bankProfile, setBankProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("cybex-bank-profile");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      bankName: "",
      bankCode: "",
      branchPrefix: "",
      nodalOfficer: "",
      nodalEmail: "",
      nodalPhone: "",
      institutionType: "Scheduled Commercial Bank",
      registeredAddress: "",
    };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  function handleChange(field, value) {
    setBankProfile((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  }

  function handleSave(e) {
    e.preventDefault();
    try {
      localStorage.setItem("cybex-bank-profile", JSON.stringify(bankProfile));
    } catch {}
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  }

  function handleClear() {
    const emptyState = {
      bankName: "",
      bankCode: "",
      branchPrefix: "",
      nodalOfficer: "",
      nodalEmail: "",
      nodalPhone: "",
      institutionType: "Scheduled Commercial Bank",
      registeredAddress: "",
    };
    setBankProfile(emptyState);
    try {
      localStorage.removeItem("cybex-bank-profile");
    } catch {}
    setSavedSuccess(false);
  }

  return (
    <BankLayout title="Bank Settings">
      <div className="settings-grid">
        <div className="card">
          <div className="profile-large">
            <div className="avatar large">
              {bankProfile.bankName.trim()
                ? bankProfile.bankName
                    .trim()
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "BK"}
            </div>

            <div>
              <h2>{bankProfile.bankName.trim() || "Bank Entity"}</h2>
              <p>
                {bankProfile.institutionType} &bull; Code:{" "}
                {bankProfile.bankCode.trim() || "Pending Setup"}
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div className="success-message" style={{ marginBottom: "18px" }}>
              ✓ Bank Profile and Nodal Officer information saved successfully!
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-two-column">
              <div>
                <label>Bank Name</label>
                <input
                  type="text"
                  value={bankProfile.bankName}
                  onChange={(e) => handleChange("bankName", e.target.value)}
                  placeholder="e.g. State Bank of India / HDFC Bank"
                  required
                />
              </div>

              <div>
                <label>Bank Entity Code</label>
                <input
                  type="text"
                  value={bankProfile.bankCode}
                  onChange={(e) => handleChange("bankCode", e.target.value)}
                  placeholder="e.g. SBIN001 / HDFC001"
                  required
                />
              </div>
            </div>

            <div className="form-two-column">
              <div>
                <label>Institution Type</label>
                <select
                  value={bankProfile.institutionType}
                  onChange={(e) => handleChange("institutionType", e.target.value)}
                >
                  <option value="Scheduled Commercial Bank">
                    Scheduled Commercial Bank
                  </option>
                  <option value="Payments Bank">Payments Bank</option>
                  <option value="Small Finance Bank">Small Finance Bank</option>
                  <option value="Co-operative Bank">Co-operative Bank</option>
                  <option value="Fintech NBFC">Fintech / NBFC Partner</option>
                </select>
              </div>

              <div>
                <label>IFSC Branch Prefix</label>
                <input
                  type="text"
                  value={bankProfile.branchPrefix}
                  onChange={(e) => handleChange("branchPrefix", e.target.value)}
                  placeholder="e.g. SBIN000 / HDFC000"
                />
              </div>
            </div>

            <div className="form-two-column">
              <div>
                <label>Nodal Fraud Prevention Officer</label>
                <input
                  type="text"
                  value={bankProfile.nodalOfficer}
                  onChange={(e) => handleChange("nodalOfficer", e.target.value)}
                  placeholder="e.g. Rajesh Verma (Chief Vigilance Officer)"
                />
              </div>

              <div>
                <label>Nodal Desk Email</label>
                <input
                  type="email"
                  value={bankProfile.nodalEmail}
                  onChange={(e) => handleChange("nodalEmail", e.target.value)}
                  placeholder="e.g. fraud.desk@bank.co.in"
                  required
                />
              </div>
            </div>

            <div className="form-two-column">
              <div>
                <label>Emergency Nodal Hotline</label>
                <input
                  type="tel"
                  value={bankProfile.nodalPhone}
                  onChange={(e) => handleChange("nodalPhone", e.target.value)}
                  placeholder="e.g. +91 22 2288 1234"
                  required
                />
              </div>

              <div>
                <label>Registered Head Office</label>
                <input
                  type="text"
                  value={bankProfile.registeredAddress}
                  onChange={(e) => handleChange("registeredAddress", e.target.value)}
                  placeholder="e.g. Nariman Point, Mumbai - 400021"
                />
              </div>
            </div>

            <div
              style={{
                marginTop: "22px",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button type="submit" className="primary-btn">
                💾 Save Bank Profile
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleClear}
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h3>🔔 Alert Preferences</h3>

          <SettingToggle
            title="High Risk Alerts"
            description="Receive immediate risk alerts for cash-out surges"
          />

          <SettingToggle
            title="ATM Withdrawal Alerts"
            description="Receive ATM withdrawal anomaly alerts"
          />

          <SettingToggle
            title="Suspicious Transactions"
            description="Receive real-time alerts for mule account velocity"
          />

          <SettingToggle
            title="Emergency LEA Freeze Orders"
            description="Automated notification for Law Enforcement fund blocks"
          />
        </div>
      </div>
    </BankLayout>
  );
}

/* =====================================================
   ROUTES (WITH AUTHENTICATION & ROLE-BASED PROTECTION)
===================================================== */

function App() {
  return (
    <Routes>
      {/* PUBLIC AUTH ROUTES */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* PROTECTED OFFICER PORTAL ROUTES */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["officer", "admin"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tasks"
        element={
          <ProtectedRoute allowedRoles={["officer", "admin"]}>
            <Layout title="Workflow Tasks">
              <Tasks />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute allowedRoles={["officer", "admin"]}>
            <Layout title="Documents Vault">
              <Documents />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/complaints"
        element={
          <ProtectedRoute allowedRoles={["officer", "admin"]}>
            <Complaints />
          </ProtectedRoute>
        }
      />

      <Route
        path="/prediction"
        element={
          <ProtectedRoute allowedRoles={["officer", "admin"]}>
            <Prediction />
          </ProtectedRoute>
        }
      />

      <Route
        path="/heatmap"
        element={
          <ProtectedRoute allowedRoles={["officer", "admin"]}>
            <Heatmap />
          </ProtectedRoute>
        }
      />

      <Route
        path="/alerts"
        element={
          <ProtectedRoute allowedRoles={["officer", "admin"]}>
            <Alerts />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["officer", "admin"]}>
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={["officer", "admin"]}>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* CITIZEN PORTAL */}
      <Route
        path="/citizen-dashboard"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            <CitizenDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/report-cybercrime"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            <ReportCybercrime />
          </ProtectedRoute>
        }
      />

      <Route
        path="/upload-evidence"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            <UploadEvidence />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-complaints"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            <MyComplaints />
          </ProtectedRoute>
        }
      />

      <Route
        path="/track-complaint"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            <TrackComplaint />
          </ProtectedRoute>
        }
      />

      <Route
        path="/citizen-alerts"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            <CitizenAlerts />
          </ProtectedRoute>
        }
      />

      <Route
        path="/citizen-profile"
        element={
          <ProtectedRoute allowedRoles={["citizen", "admin"]}>
            <CitizenProfile />
          </ProtectedRoute>
        }
      />

      {/* BANK PORTAL */}
      <Route
        path="/bank-dashboard"
        element={
          <ProtectedRoute allowedRoles={["bank", "admin"]}>
            <BankDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bank-risk-alerts"
        element={
          <ProtectedRoute allowedRoles={["bank", "admin"]}>
            <BankRiskAlerts />
          </ProtectedRoute>
        }
      />

      <Route
        path="/suspicious-transactions"
        element={
          <ProtectedRoute allowedRoles={["bank", "admin"]}>
            <SuspiciousTransactions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/atm-risk"
        element={
          <ProtectedRoute allowedRoles={["bank", "admin"]}>
            <AtmRisk />
          </ProtectedRoute>
        }
      />

      <Route
        path="/fund-blocking"
        element={
          <ProtectedRoute allowedRoles={["bank", "admin"]}>
            <FundBlocking />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bank-analytics"
        element={
          <ProtectedRoute allowedRoles={["bank", "admin"]}>
            <BankAnalytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bank-reports"
        element={
          <ProtectedRoute allowedRoles={["bank", "admin"]}>
            <BankReports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bank-settings"
        element={
          <ProtectedRoute allowedRoles={["bank", "admin"]}>
            <BankSettings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;