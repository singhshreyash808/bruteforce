import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import "../Index.css"; // Ensure styles are applied

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // On successful login, the AuthContext state will update and we can redirect
      navigate("/"); // Redirect to dashboard or home
    } catch (err) {
      console.error(err);
      setError("Failed to sign in. Please check your credentials.");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#333' }}>Officers Portal Login</h2>
        
        {error && <div style={{ color: 'red', background: '#ffebee', padding: '10px', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>
          <button 
            type="submit"
            style={{ 
              background: '#0056b3', 
              color: 'white', 
              padding: '0.75rem', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
