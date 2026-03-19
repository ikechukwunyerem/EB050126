// src/pages/Pricing.jsx
import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Pricing.css';

export default function Pricing() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    // Track which specific button is loading so we don't disable all of them confusingly
    const [processingPlanId, setProcessingPlanId] = useState(null);

    useEffect(() => {
        axios.get('http://localhost:8000/api/subscriptions/plans/')
            .then(response => {
                setPlans(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching plans:", error);
                setLoading(false);
            });
    }, []);

    const getNairaPrice = (pricesArray) => {
        if (!pricesArray) return 'N/A';
        const ngnPrice = pricesArray.find(p => p.currency === 'NGN');
        return ngnPrice ? parseFloat(ngnPrice.amount).toLocaleString() : 'N/A';
    };

    const handleSubscribe = async (planId) => {
        if (!user) {
            alert("Please sign in to subscribe to a plan.");
            navigate('/login');
            return;
        }

        setProcessingPlanId(planId);

        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.post(
                'http://localhost:8000/api/payment/paystack/subscribe/',
                { plan_id: planId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Redirect to Paystack's secure hosted page
            window.location.href = response.data.authorization_url;

        } catch (error) {
            console.error("Subscription failed:", error);
            alert(error.response?.data?.error || "Failed to initialize subscription payment.");
            setProcessingPlanId(null);
        }
    };

    if (loading) return <div className="container loading-text">Loading premium plans...</div>;

    return (
        <div className="container pricing-page">
            <div className="pricing-header">
                <h1>Unlock Premium Access</h1>
                <p>Choose the plan that fits your learning journey and get instant access to our entire exclusive library.</p>
            </div>

            <div className="pricing-grid">
                {plans.map((plan, index) => {
                    const isFeatured = index === 1 || plans.length === 1;
                    const isProcessing = processingPlanId === plan.id;

                    return (
                        <div key={plan.id} className={`pricing-card ${isFeatured ? 'featured' : ''}`}>
                            {isFeatured && <div className="featured-badge">Most Popular</div>}

                            <h2 className="plan-name">{plan.name}</h2>
                            <p className="plan-description">{plan.description || `Full access for ${plan.duration_days} days.`}</p>

                            <div className="plan-price">
                                <span className="currency">₦</span>
                                <span className="amount">{getNairaPrice(plan.prices)}</span>
                            </div>
                            <p className="plan-duration">Billed every {plan.duration_days} days</p>

                            <ul className="plan-features">
                                <li>✅ Unlimited Library Access</li>
                                <li>✅ Premium Video Content</li>
                                <li>✅ Community Discussion Board</li>
                                <li>✅ Priority Support</li>
                            </ul>

                            <button
                                className={`subscribe-btn ${isFeatured ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={processingPlanId !== null}
                            >
                                {isProcessing ? 'Processing...' : `Choose ${plan.name}`}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}