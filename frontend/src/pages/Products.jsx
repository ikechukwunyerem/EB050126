// src/pages/Products.jsx
import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from "react-router-dom";
import './Products.css';

export default function Products() {
    const { user } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(null); // Tracks which button is loading

    useEffect(() => {
        axios.get('http://localhost:8000/api/products/')
            .then(response => {
                setProducts(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching products:", error);
                setLoading(false);
            });
    }, []);

    const addToCart = async (productId) => {
        setAddingToCart(productId);
        try {
            // If the user is logged in, attach their token
            const token = localStorage.getItem('access_token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.post(
                'http://localhost:8000/api/cart/',
                { product_id: productId, quantity: 1 },
                {
                    headers: headers,
                    withCredentials: true // Important for guest session cookies if no token!
                }
            );

            // 🚀 THE MAGIC LINE: Dispatch the event so the Navbar instantly updates
            window.dispatchEvent(new Event('cartUpdated'));

            alert("Added to cart successfully!");
        } catch (error) {
            console.error("Failed to add to cart:", error);
            alert("Error adding to cart. Please try again.");
        } finally {
            setAddingToCart(null);
        }
    };

    if (loading) return <div className="container loading-text">Loading store...</div>;

    return (
        <div className="container products-page">
            <div className="products-header">
                <h1>Premium Store</h1>
                <p>Purchase official workbooks and exclusive digital products.</p>
            </div>

            <div className="product-grid">
                {products.map(product => (
                    <div key={product.id} className="product-card">
                        <div className="product-image-container">
                            {product.cover_image ? (
                                <img src={product.cover_image} alt={product.name} className="product-image" />
                            ) : (
                                <div className="product-image-fallback">No Image</div>
                            )}
                            <span className="product-badge">{product.category?.name || 'Item'}</span>
                        </div>

                        <div className="product-content">
                            <Link to={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <h3 className="product-title">{product.name}</h3>
                            </Link>
                            <p className="product-price">₦{parseFloat(product.price).toLocaleString()}</p>

                            <button
                                className="add-to-cart-btn"
                                onClick={() => addToCart(product.id)}
                                disabled={addingToCart === product.id}
                            >
                                {addingToCart === product.id ? 'Adding...' : 'Add to Cart'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}