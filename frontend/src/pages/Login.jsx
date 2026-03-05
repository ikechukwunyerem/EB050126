// src/pages/Login.jsx
import { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Login.css';

export default function Login() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    // States for Email/Password Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- 1. Handle Traditional Email/Password Login ---
    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('http://localhost:8000/api/auth/login/', {
                email: email,
                password: password
            });

            // Using the custom serializer data: { access, refresh, user: {...} }
            login(response.data.user, {
                access: response.data.access,
                refresh: response.data.refresh
            });

            navigate('/library');
        } catch (err) {
            console.error("Email Login Failed:", err);
            setError(err.response?.data?.detail || "Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    // --- 2. Handle Google Login (Existing) ---
    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const response = await axios.post('http://localhost:8000/api/auth/google/', {
                credential: credentialResponse.credential,
            });

            const accessToken = response.data.access || (response.data.tokens && response.data.tokens.access);
            const refreshToken = response.data.refresh || (response.data.tokens && response.data.tokens.refresh);

            login(response.data.user, {
                access: accessToken,
                refresh: refreshToken
            });

            navigate('/library');
        } catch (err) {
            console.error("Google Login Failed:", err);
            setError("Google authentication failed. Please try again.");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Welcome Back</h2>
                <p>Sign in to access premium educational resources.</p>

                {error && <div className="error-message">{error}</div>}

                {/* Email and Password Form */}
                <form onSubmit={handleEmailLogin} className="email-login-form">
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="login-btn-full" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <div className="separator">
                    <span>OR</span>
                </div>

                {/* Google Login Button */}
                <div className="google-btn-wrapper">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError("Google popup closed or failed.")}
                    />
                </div>

                <p className="auth-switch-text">
                    Don't have an account? <Link to="/register" className="auth-link">Sign up here</Link>
                </p>
            </div>
        </div>
    );
}