// src/pages/Dashboard.jsx
import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    // Security redirect: If they aren't logged in, kick them to the login page
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user) {
            fetchSubscriptionStatus();
        }
    }, [user]);

    const fetchSubscriptionStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get('http://localhost:8000/api/subscriptions/my-status/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubscription(response.data);
        } catch (error) {
            console.error("Error fetching subscription:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (!user) return null; // Prevent flicker while redirecting

    return (
        <div className="container dashboard-page">
            <div className="dashboard-header">
                <h1>My Account</h1>
                <p>Manage your profile, subscriptions, and purchases.</p>
            </div>

            <div className="dashboard-grid">
                {/* Left Column: Profile Card */}
                <div className="dashboard-card profile-card">
                    <h2>Profile Details</h2>
                    <div className="profile-info">
                        <div className="info-group">
                            <label>Name</label>
                            <p>{user.first_name} {user.last_name}</p>
                        </div>
                        <div className="info-group">
                            <label>Email Address</label>
                            <p>{user.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-logout-large">Sign Out</button>
                </div>

                {/* Right Column: Subscription Card */}
                <div className="dashboard-card subscription-card">
                    <h2>Premium Access</h2>

                    {loading ? (
                        <p>Checking subscription status...</p>
                    ) : subscription && subscription.is_valid ? (
                        <div className="active-subscription">
                            <div className="status-badge active">Active</div>
                            <h3>{subscription.plan_name}</h3>
                            <p className="billing-cycle">
                                <strong>Renews/Expires:</strong> {new Date(subscription.current_period_end).toLocaleDateString()}
                            </p>
                            <ul className="perks-list">
                                <li>✅ Full Library Access</li>
                                <li>✅ Priority Support</li>
                                <li>✅ Community Access</li>
                            </ul>
                        </div>
                    ) : (
                        <div className="inactive-subscription">
                            <div className="status-badge inactive">Inactive</div>
                            <p>You currently do not have an active premium membership.</p>
                            <Link to="/pricing" className="btn-upgrade">Upgrade Now</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}