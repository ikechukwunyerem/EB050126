// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Register.css'; // Using the new dedicated CSS

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await axios.post('http://localhost:8000/api/auth/register/', formData);
            alert("Account created successfully! Please log in.");
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.email?.[0] || "Registration failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h2>Create Account</h2>
                <p>Join the Efiko community today.</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleRegister} className="register-form">
                    <div className="name-row">
                        <input
                            name="first_name"
                            placeholder="First Name"
                            onChange={handleChange}
                            required
                        />
                        <input
                            name="last_name"
                            placeholder="Last Name"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Create Password"
                        onChange={handleChange}
                        required
                    />
                    <button type="submit" className="register-submit-btn" disabled={loading}>
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <p className="auth-switch-text">
                    Already have an account? <Link to="/login" className="auth-link">Login here</Link>
                </p>
            </div>
        </div>
    );
}