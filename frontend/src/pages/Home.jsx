// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

export default function Home() {
    const [products, setProducts] = useState([]);
    const [worksheets, setWorksheets] = useState([]);

    // Dynamic slider content
    const [slides, setSlides] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Auto-play the slider
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
        }, 5000); // Change slide every 5 seconds
        return () => clearInterval(timer);
    }, [slides.length]);

    // Fetch the showcase data
    useEffect(() => {

        // Fetch Slides
        axios.get('http://localhost:8000/api/storefront/slides/')
            .then(res => setSlides(res.data))
            .catch(err => console.error("Error fetching slides:", err));

        // Fetch top 4 worksheets (resources)
        axios.get('http://localhost:8000/api/resources/')
            .then(res => setWorksheets(res.data.slice(0, 4)))
            .catch(err => console.error(err));

        // Fetch top 4 products
        axios.get('http://localhost:8000/api/products/')
            .then(res => setProducts(res.data.slice(0, 4)))
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (slides.length <= 1) return; // No need to slide if there's only 0 or 1 image

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <div className="home-page">
            {/* --- HERO SLIDER --- */}
            <div className="hero-slider">
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`slide ${index === currentSlide ? 'active' : ''}`}
                        style={{ backgroundImage: `url(${slide.image})` }}
                    >
                        <div className="slide-overlay">
                            <div className="slide-content">
                                {/* <h1>{slide.title}</h1>
                                <p>{slide.subtitle}</p>
                                <Link to={slide.link} className="btn-hero">{slide.btnText}</Link> */}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Slider Controls */}
                <div className="slider-dots">
                    {slides.map((_, index) => (
                        <span
                            key={index}
                            className={`dot ${index === currentSlide ? 'active' : ''}`}
                            onClick={() => setCurrentSlide(index)}
                        ></span>
                    ))}
                </div>
            </div>

            {/* --- WORKSHEETS ROW --- */}
            <section className="showcase-section">
                <div className="section-header">
                    <h2>Latest Worksheets & Resources</h2>
                    <Link to="/library" className="view-all-link">View All Library →</Link>
                </div>

                <div className="showcase-grid">
                    {worksheets.map(sheet => (
                        <div key={sheet.id} className="showcase-card">
                            <Link to={`/library/${sheet.id}`} className="card-img-wrapper">
                                {sheet.cover_image ? (
                                    <img src={sheet.cover_image} alt={sheet.title} />
                                ) : (
                                    <div className="fallback-img">Worksheet</div>
                                )}
                                {sheet.is_free && <span className="free-badge">Free</span>}
                            </Link>
                            <div className="card-info">
                                <h3><Link to={`/library/${sheet.id}`}>{sheet.title}</Link></h3>
                                <p className="card-meta">{sheet.resource_type}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- PRODUCTS ROW --- */}
            <section className="showcase-section bg-light">
                <div className="section-header">
                    <h2>Featured Hardware & Products</h2>
                    <Link to="/products" className="view-all-link">Shop All Products →</Link>
                </div>

                <div className="showcase-grid">
                    {products.map(product => (
                        <div key={product.id} className="showcase-card product-style">
                            <Link to={`/products/${product.id}`} className="card-img-wrapper">
                                {product.cover_image ? (
                                    <img src={product.cover_image} alt={product.name} />
                                ) : (
                                    <div className="fallback-img">Product</div>
                                )}
                            </Link>
                            <div className="card-info center-text">
                                <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
                                <p className="card-price">₦{parseFloat(product.price).toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}