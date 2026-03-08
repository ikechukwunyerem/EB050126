// src/pages/Cart.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Cart.css';

export default function Cart() {
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.get('http://localhost:8000/api/cart/', {
                headers: headers,
                withCredentials: true
            });
            setCart(response.data);
        } catch (error) {
            console.error("Error fetching cart:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleProceedToCheckout = () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            alert("Please sign in to complete your purchase.");
            navigate('/login');
            return;
        }
        // Simply route them to the new dedicated checkout page
        navigate('/checkout');
    };

    if (loading) return <div className="container loading-text">Loading cart...</div>;

    if (!cart || cart.items.length === 0) {
        return (
            <div className="container empty-cart-page">
                <h2>Your Cart is Empty</h2>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <Link to="/products" className="continue-shopping-btn">Go to Store</Link>
            </div>
        );
    }

    return (
        <div className="container cart-page">
            <h1>Shopping Cart</h1>

            <div className="cart-layout">
                <div className="cart-items">
                    {cart.items.map(item => (
                        <div key={item.id} className="cart-item">
                            <div className="cart-item-info">
                                <h3>{item.product_name}</h3>
                                <p>Quantity: {item.quantity}</p>
                            </div>
                            <div className="cart-item-price">
                                ₦{parseFloat(item.subtotal).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="cart-summary">
                    <h2>Order Summary</h2>
                    <div className="summary-row">
                        <span>Items ({cart.total_items}):</span>
                        <span>₦{parseFloat(cart.grand_total).toLocaleString()}</span>
                    </div>
                    <hr className="summary-divider" />
                    <div className="summary-row total-row">
                        <span>Total:</span>
                        <span>₦{parseFloat(cart.grand_total).toLocaleString()}</span>
                    </div>

                    <button className="checkout-btn" onClick={handleProceedToCheckout}>
                        Proceed to Checkout
                    </button>
                </div>
            </div>
        </div>
    );
}