// src/components/Navbar.jsx
import { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
    FaShoppingCart, FaUserCircle, FaChevronDown, FaBars, FaTimes,
    FaSignOutAlt, FaUserEdit, FaListAlt, FaCog, FaSearch
} from 'react-icons/fa';

import './Navbar.css';

export default function Navbar() {
    const { user, profile, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    const dropdownRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
            navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
            setSearchQuery('');
            setIsMobileMenuOpen(false); // Close mobile menu if open
        }
    };

    // --- 1. Close dropdown when clicking outside ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- 2. Fetch Cart Count ---
    const fetchCartCount = async () => {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        try {
            const res = await axios.get('http://localhost:8000/api/cart/', {
                headers,
                withCredentials: true
            });
            setCartCount(res.data.total_items || 0);
        } catch (error) {
            console.error("Failed to fetch cart count:", error);
        }
    };

    useEffect(() => {
        fetchCartCount();

        // Listen for a custom event so other components (like Product pages) 
        // can trigger the Navbar to update its cart badge instantly
        window.addEventListener('cartUpdated', fetchCartCount);
        return () => window.removeEventListener('cartUpdated', fetchCartCount);
    }, [user]);

    // --- 3. Handlers ---
    const handleLogout = () => {
        setIsUserDropdownOpen(false);
        logout();
        navigate('/');
    };

    const toggleDropdown = () => setIsUserDropdownOpen(!isUserDropdownOpen);
    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    // --- 4. Helpers ---
    const getImageUrl = (path) => {
        if (!path) return `https://ui-avatars.com/api/?name=${user?.first_name || 'User'}&background=0D8ABC&color=fff`;
        if (path.startsWith('http')) return path;
        return `http://localhost:8000${path}`;
    };

    const userDisplayName = user?.first_name || user?.email?.split('@')[0] || "User";

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Brand Logo */}
                <Link to="/" className="navbar-brand" onClick={() => setIsMobileMenuOpen(false)}>
                    Efiko Education
                </Link>

                {/* Desktop Navigation Links & Search */}
                <div className={`navbar-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                    <Link to="/products" onClick={() => setIsMobileMenuOpen(false)}>Store</Link>
                    <Link to="/library" onClick={() => setIsMobileMenuOpen(false)}>Library</Link>
                    <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
                    <Link to="/blog" onClick={() => setIsMobileMenuOpen(false)}>Blog</Link>

                    {/* Search Form (Shows inside the menu on mobile) */}
                    <form className="nav-search-form" onSubmit={handleSearchSubmit}>
                        <input
                            type="text"
                            placeholder="Search Efiko..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="nav-search-input"
                        />
                        <button type="submit" className="nav-search-btn" aria-label="Search">
                            <FaSearch />
                        </button>
                    </form>
                </div>

                {/* Right Side Actions */}
                <div className="nav-actions">
                    {/* Cart Icon with Badge */}
                    <Link to="/cart" className="nav-cart-icon" title="View Cart">
                        <FaShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span className="cart-badge">{cartCount}</span>
                        )}
                    </Link>

                    {/* Authentication / User Dropdown */}
                    {user ? (
                        <div className="user-dropdown-container" ref={dropdownRef}>
                            <button className="user-dropdown-trigger" onClick={toggleDropdown}>
                                {profile?.image ? (
                                    <img
                                        src={getImageUrl(profile.image)}
                                        alt={userDisplayName}
                                        className="nav-avatar-img"
                                    />
                                ) : (
                                    <FaUserCircle className="nav-avatar-icon" />
                                )}
                                <span className="nav-user-name">{userDisplayName}</span>
                                <FaChevronDown className={`dropdown-arrow ${isUserDropdownOpen ? 'open' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isUserDropdownOpen && (
                                <div className="user-dropdown-menu">
                                    <Link to="/dashboard" className="dropdown-item" onClick={() => setIsUserDropdownOpen(false)}>
                                        <FaCog className="dropdown-icon" /> Dashboard
                                    </Link>
                                    <Link to="/dashboard" className="dropdown-item" onClick={() => setIsUserDropdownOpen(false)}>
                                        <FaUserEdit className="dropdown-icon" /> My Profile
                                    </Link>
                                    <Link to="/dashboard" className="dropdown-item" onClick={() => setIsUserDropdownOpen(false)}>
                                        <FaListAlt className="dropdown-icon" /> Order History
                                    </Link>

                                    <div className="dropdown-divider"></div>

                                    <button onClick={handleLogout} className="dropdown-item logout-btn">
                                        <FaSignOutAlt className="dropdown-icon" /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="nav-auth-links">
                            <Link to="/login" className="btn-login-link">Sign In</Link>
                            <Link to="/register" className="btn-register-link">Get Started</Link>
                        </div>
                    )}

                    {/* Mobile Hamburger Toggle */}
                    <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                        {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                    </button>
                </div>
            </div>
        </nav>
    );
}