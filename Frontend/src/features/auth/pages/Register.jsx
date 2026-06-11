import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';
import { Mail, Lock, User, Check } from 'lucide-react';
import "../style/register.scss";

const Register = () => {
    const { loading, handleRegister, handleGoogleLogin } = useAuth();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    // Calculate password strength
    const getStrengthScore = (pwd) => {
        if (!pwd) return 0;
        let score = 0;
        if (pwd.length >= 6) score += 1;
        if (pwd.length >= 10) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
        return score;
    };

    const strengthScore = getStrengthScore(password);

    const getStrengthLabel = (score) => {
        if (score === 0) return { label: "", color: "transparent" };
        if (score <= 2) return { label: "Weak", color: "var(--red)" };
        if (score <= 4) return { label: "Medium", color: "var(--yellow)" };
        return { label: "Strong", color: "var(--cyan)" };
    };

    const strength = getStrengthLabel(strengthScore);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!fullName || !email || !password || !confirmPassword) {
            setError("All fields are required");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        try {
            // Standard registration (backend takes username, email, password)
            // We use fullName as username by sanitizing spaces, or pass both
            const sanitizedUsername = fullName.replace(/\s+/g, "").toLowerCase();
            await handleRegister({ username: sanitizedUsername, email, password });
            navigate("/dashboard");
        } catch (err) {
            setError(err.message || "Registration failed. Try again.");
        }
    }

    const handleGoogleAuth = async () => {
        setError("");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const fbUser = result.user;
            
            await handleGoogleLogin({
                email: fbUser.email,
                displayName: fbUser.displayName,
                photoURL: fbUser.photoURL,
                uid: fbUser.uid
            });
            
            navigate("/dashboard");
        } catch (err) {
            console.error("Firebase Google Auth Error:", err);
            setError(err.message || "Google Authentication failed");
        }
    };

    const particles = Array.from({ length: 18 });

    return (
        <main className="register-page">
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
                                animationDelay: `${delay}s`
                            }}
                        />
                    );
                })}
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="register-card glass-panel"
            >
                <div className="register-card__header">
                    <h1 className="app-title text-gradient-purple">Get Started</h1>
                    <span className="app-subtitle">Create your Moodify account</span>
                </div>

                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="error-banner"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Google OAuth SignUp */}
                <button 
                    type="button" 
                    className="google-btn"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                >
                    <svg className="google-logo-svg" viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: "4px" }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign up with Google</span>
                </button>

                <div className="form-divider">
                    <span>or register with email</span>
                </div>

                {/* SignUp Form */}
                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-field">
                        <label>Full Name</label>
                        <div className="input-wrap">
                            <User size={16} className="input-icon" />
                            <input 
                                type="text" 
                                placeholder="Ammar..."
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

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
                        <label>Password</label>
                        <div className="input-wrap">
                            <Lock size={16} className="input-icon" />
                            <input 
                                type="password" 
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {password && (
                            <div className="strength-meter-wrap">
                                <div className="strength-bar-container">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div 
                                            key={level}
                                            className={`strength-bar ${level <= strengthScore ? 'active' : ''}`}
                                            style={{
                                                backgroundColor: level <= strengthScore ? strength.color : 'rgba(255, 255, 255, 0.08)'
                                            }}
                                        />
                                    ))}
                                </div>
                                <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                            </div>
                        )}
                    </div>

                    <div className="form-field">
                        <label>Confirm Password</label>
                        <div className="input-wrap">
                            <Lock size={16} className="input-icon" />
                            <input 
                                type="password" 
                                placeholder="Repeat your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="submit-btn" 
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "CREATING ACCOUNT..." : "SIGN UP"}
                    </motion.button>
                </form>

                <div className="card-footer">
                    <p>Already have an account? <Link to="/login" className="signup-link">Sign In</Link></p>
                </div>
            </motion.div>
        </main>
    );
};

export default Register;
