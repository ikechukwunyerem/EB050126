// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="global-footer">
            <div className="footer-container">
                {/* Brand & About */}
                <div className="footer-column brand-column">
                    <h2>Efiko Education</h2>
                    <p>Empowering network engineers and IT professionals with premium digital resources, courses, and tools.</p>
                </div>

                {/* Quick Links */}
                <div className="footer-column">
                    <h3>Explore</h3>
                    <ul>
                        <li><Link to="/products">Premium Store</Link></li>
                        <li><Link to="/library">Resource Library</Link></li>
                        <li><Link to="/pricing">Pro Subscription</Link></li>
                        <li><Link to="/blog">Tech Blog</Link></li>
                    </ul>
                </div>

                {/* Support Links */}
                <div className="footer-column">
                    <h3>Support</h3>
                    <ul>
                        <li><Link to="/dashboard">My Account</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                        <li><Link to="/faq">FAQ</Link></li>
                        <li><Link to="/terms">Terms & Conditions</Link></li>
                    </ul>
                </div>

                {/* Newsletter */}
                <div className="footer-column newsletter-column">
                    <h3>Stay Updated</h3>
                    <p>Join our newsletter for the latest networking guides and store discounts.</p>
                    <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); alert('Subscribed successfully!'); }}>
                        <input type="email" placeholder="Enter your email" required />
                        <button type="submit">Subscribe</button>
                    </form>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} Efiko Education. All rights reserved.</p>
            </div>
        </footer>
    );
}