import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";
import "../style/login.scss";

const Login = () => {
  const { loading, handleLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const remembered = localStorage.getItem("Moodify_remember_email");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      await handleLogin({ email, password });

      if (rememberMe) {
        localStorage.setItem("Moodify_remember_email", email);
      } else {
        localStorage.removeItem("Moodify_remember_email");
      }

      navigate("/dashboard");
    } catch (err) {
      console.log(err);
      setError(err?.response?.data?.message || "Invalid email or password");
    }
  }

  const particles = Array.from({ length: 18 });

  return (
    <main className="login-page">
      <div className="login-bg-glow">
        <div className="glow-circle glow-circle-1" />
        <div className="glow-circle glow-circle-2" />
      </div>

      <div className="particles-container">
        {particles.map((_, idx) => {
          const duration = 12 + (idx % 5) * 4;
          const delay = (idx % 4) * 2;
          const left = `${(idx * 7) % 100}%`;
          const size = 12 + (idx % 3) * 8;

          return (
            <div
              key={idx}
              className="bg-particle"
              style={{
                left,
                width: `${size}px`,
                height: `${size}px`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="login-card glass-panel"
      >
        <div className="login-card__header">
          <div className="logo-glow-wrap">
            <svg
              className="headphone-logo"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9"
                strokeLinecap="round"
              />
              <path
                d="M21 14h-1.5c-1.38 0-2.5 1.12-2.5 2.5v2c0 1.38 1.12 2.5 2.5 2.5H21v-7z"
                fill="currentColor"
                opacity="0.2"
              />
              <path
                d="M3 14h1.5C5.88 14 7 15.12 7 16.5v2C7 19.88 5.88 21 4.5 21H3v-7z"
                fill="currentColor"
                opacity="0.2"
              />
            </svg>
            <div className="pulse-ring" />
          </div>

          <h1 className="app-title text-gradient-purple">Moodify</h1>
          <span className="app-subtitle">AI Emotion Music Player</span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-divider">
          <span>sign in with email</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label>Email Address</label>
            <div className="input-wrap">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <div className="label-row">
              <label>Password</label>
            </div>

            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-wrap">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="checkmark" />
              <span className="label-text">Remember Me</span>
            </label>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="submit-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "AUTHENTICATING..." : "SIGN IN"}
          </motion.button>
        </form>

        <div className="card-footer">
          <p>
            New to Moodify?{" "}
            <Link to="/register" className="signup-link">
              Create Account
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
};

export default Login;