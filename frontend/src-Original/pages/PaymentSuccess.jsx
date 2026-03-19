// src/pages/PaymentSuccess.jsx
import { Link, useSearchParams } from 'react-router-dom';
import './PaymentSuccess.css';

export default function PaymentSuccess() {
    // Paystack passes the reference back in the URL (e.g., ?reference=ORD-1234ABCD)
    const [searchParams] = useSearchParams();
    const reference = searchParams.get('reference');

    return (
        <div className="container success-page">
            <div className="success-card">
                <div className="success-icon">✅</div>
                <h1>Payment Successful!</h1>
                <p>Thank you for your purchase. Your transaction was completed successfully.</p>

                {reference && (
                    <div className="reference-box">
                        <p><strong>Order Reference:</strong></p>
                        <code>{reference}</code>
                    </div>
                )}

                <div className="success-actions">
                    <Link to="/library" className="btn-primary">Go to Library</Link>
                    <Link to="/products" className="btn-secondary">Continue Shopping</Link>
                </div>
            </div>
        </div>
    );
}