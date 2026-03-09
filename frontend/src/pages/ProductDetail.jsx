// src/pages/ProductDetail.jsx
import { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './ProductDetail.css';

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        // Fetch the single product from Django
        axios.get(`http://localhost:8000/api/products/${id}/`)
            .then(response => {
                setProduct(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching product:", error);
                setLoading(false);
            });
    }, [id]);

    const handleQuantityChange = (type) => {
        if (type === 'decrease' && quantity > 1) {
            setQuantity(quantity - 1);
        } else if (type === 'increase') {
            setQuantity(quantity + 1);
        }
    };

    const addToCart = async () => {
        setAddingToCart(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.post(
                'http://localhost:8000/api/cart/',
                { product_id: product.id, quantity: quantity },
                {
                    headers: headers,
                    withCredentials: true // Preserves guest session if no token
                }
            );

            // 🚀 Tell the Navbar to update the red cart badge instantly!
            window.dispatchEvent(new Event('cartUpdated'));

            alert(`${product.name} added to cart!`);
        } catch (error) {
            console.error("Failed to add to cart:", error);
            alert("Error adding to cart. Please try again.");
        } finally {
            setAddingToCart(false);
        }
    };

    if (loading) return <div className="container loading-text">Loading product details...</div>;
    if (!product) return <div className="container loading-text">Product not found.</div>;

    return (
        <div className="container product-detail-page">
            <Link to="/products" className="back-link">← Back to Store</Link>

            <div className="detail-layout">
                {/* Left Column: Image */}
                <div className="detail-sidebar">
                    <div className="detail-image-box">
                        {product.cover_image ? (
                            <img src={product.cover_image} alt={product.name} />
                        ) : (
                            <div className="placeholder-image">No Image Available</div>
                        )}
                    </div>
                </div>

                {/* Right Column: Info & Actions */}
                <div className="detail-main">
                    <div className="product-meta-header">
                        <span className="product-category-badge">{product.category?.name || 'Item'}</span>
                    </div>

                    <h1 className="detail-title">{product.name}</h1>
                    <p className="detail-price">₦{parseFloat(product.price).toLocaleString()}</p>

                    <div className="detail-description">
                        <h3>Product Description</h3>
                        <p>{product.description || "No detailed description provided for this product."}</p>
                    </div>

                    <hr className="divider" />

                    {/* Purchasing Actions */}
                    <div className="purchase-actions">
                        <div className="quantity-selector">
                            <button onClick={() => handleQuantityChange('decrease')} disabled={quantity <= 1}>-</button>
                            <span className="quantity-display">{quantity}</span>
                            <button onClick={() => handleQuantityChange('increase')}>+</button>
                        </div>

                        <button
                            className="btn-add-to-cart-large"
                            onClick={addToCart}
                            disabled={addingToCart}
                        >
                            {addingToCart ? 'Adding to Cart...' : 'Add to Cart'}
                        </button>
                    </div>

                    {/* Optional Trust Badges */}
                    <div className="trust-badges">
                        <span>🔒 Secure Checkout</span>
                        <span>📦 Instant Digital Delivery (if applicable)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}