// src/pages/Login.jsx
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Login.css';

export default function Login() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            // 1. Send token to Django
            const response = await axios.post('http://localhost:8000/api/auth/google/', {
                credential: credentialResponse.credential,
            });

            console.log("Django Response:", response.data); // Helpful for debugging!

            // 2. Extract tokens safely (checking both common Django formats)
            const accessToken = response.data.access || response.data.access_token || (response.data.tokens && response.data.tokens.access);
            const refreshToken = response.data.refresh || response.data.refresh_token || (response.data.tokens && response.data.tokens.refresh);

            // 3. Update Global Auth State
            login(response.data.user, {
                access: accessToken,
                refresh: refreshToken
            });

            // 4. Redirect to Library
            navigate('/library');
        } catch (err) {
            console.error("Login Failed:", err);
            setError("Failed to authenticate with the server. Please try again.");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Welcome Back</h2>
                <p>Sign in to access premium educational resources.</p>

                {error && <div className="error-message">{error}</div>}

                <div className="google-btn-wrapper">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => {
                            setError("Google popup closed or failed.");
                        }}
                    />
                </div>
            </div>
        </div>
    );
}