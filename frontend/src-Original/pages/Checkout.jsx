// src/pages/Checkout.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Checkout.css';

export default function Checkout() {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchCheckoutData();
    }, []);

    const fetchCheckoutData = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        try {
            // Fetch Cart
            const cartRes = await axios.get('http://localhost:8000/api/cart/', { headers });
            if (!cartRes.data || cartRes.data.items.length === 0) {
                navigate('/cart'); // Send them back if cart is empty
                return;
            }
            setCart(cartRes.data);

            // Fetch Addresses
            const addrRes = await axios.get('http://localhost:8000/api/auth/addresses/', { headers });
            setAddresses(addrRes.data);

            // Auto-select the default shipping address if it exists
            const defaultAddr = addrRes.data.find(a => a.is_default_shipping);
            if (defaultAddr) setSelectedAddressId(defaultAddr.id);
            else if (addrRes.data.length > 0) setSelectedAddressId(addrRes.data[0].id);

        } catch (error) {
            console.error("Error fetching checkout data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!selectedAddressId) {
            alert("Please select a delivery address to continue.");
            return;
        }

        setIsProcessing(true);
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            // 1. Create the Order with the selected address
            const orderRes = await axios.post(
                'http://localhost:8000/api/checkout/',
                { address_id: selectedAddressId },
                { headers }
            );

            // 2. Initialize Paystack
            const paystackRes = await axios.post(
                'http://localhost:8000/api/payment/paystack/initialize/',
                { order_number: orderRes.data.order_number },
                { headers }
            );

            // 3. Redirect to gateway
            window.location.href = paystackRes.data.authorization_url;

        } catch (error) {
            console.error("Payment initialization failed:", error);
            alert("Failed to initialize payment. Please try again.");
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: '50px', textAlign: 'center' }}>Loading secure checkout...</div>;

    return (
        <div className="container checkout-page">
            <h1>Secure Checkout</h1>

            <div className="checkout-layout">
                {/* Left Column: Delivery Logistics */}
                <div className="checkout-logistics">
                    <div className="checkout-section">
                        <h2>1. Delivery Address</h2>
                        {addresses.length === 0 ? (
                            <div className="no-address-warning">
                                <p>You need to add a delivery address before you can checkout.</p>
                                <button onClick={() => navigate('/dashboard')} className="btn-goto-dashboard">
                                    Go to Dashboard to Add Address
                                </button>
                            </div>
                        ) : (
                            <div className="address-selection-grid">
                                {addresses.map(addr => (
                                    <div
                                        key={addr.id}
                                        className={`selectable-address ${selectedAddressId === addr.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedAddressId(addr.id)}
                                    >
                                        <div className="radio-circle">
                                            {selectedAddressId === addr.id && <div className="radio-dot"></div>}
                                        </div>
                                        <div className="addr-details">
                                            <strong>{addr.recipient_name}</strong>
                                            <p>{addr.address_line1}</p>
                                            <p>{addr.city}, Nigeria</p>
                                            <p className="addr-phone">{addr.phone_number}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Order Summary & Payment */}
                <div className="checkout-summary-panel">
                    <h2>2. Order Summary</h2>
                    <div className="checkout-items-mini">
                        {cart.items.map(item => (
                            <div key={item.id} className="mini-item">
                                <span>{item.quantity}x {item.product_name}</span>
                                <span>₦{parseFloat(item.subtotal).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <hr className="summary-divider" />

                    <div className="summary-row total-row">
                        <span>Total to Pay:</span>
                        <span>₦{parseFloat(cart.grand_total).toLocaleString()}</span>
                    </div>

                    <button
                        className="btn-pay-now"
                        onClick={handlePayment}
                        disabled={isProcessing || addresses.length === 0}
                    >
                        {isProcessing ? 'Connecting to Paystack...' : 'Pay Securely Now'}
                    </button>
                    <p className="secure-badge">🔒 Encrypted & Secure Payment</p>
                </div>
            </div>
        </div>
    );
}