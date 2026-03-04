// src/components/Navbar.jsx
import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
    // Pull the user state and logout function from our global context
    const { user, logout } = useContext(AuthContext);

    return (
        <nav className="navbar">
            <div className="navbar-container container">
                <Link to="/" className="navbar-logo">
                    Efiko Platform 🚀
                </Link>

                <ul className="navbar-menu">
                    <li><Link to="/library" className="nav-link">Library</Link></li>
                    <li><Link to="/pricing" className="nav-link">Pricing</Link></li>
                    <li><Link to="/products" className="nav-link">Store</Link></li>

                    {/* If 'user' exists, they are logged in */}
                    {user ? (
                        <>
                            <li><Link to="/cart" className="nav-link cart-link">Cart</Link></li>
                            <li>
                                <span style={{ marginRight: '15px', fontWeight: 'bold' }}>
                                    Hi, {user.first_name || user.email.split('@')[0]}
                                </span>
                                <button onClick={logout} className="nav-button logout-btn">Logout</button>
                            </li>
                        </>
                    ) : (
                        <li>
                            {/* For now, this just links to a login page we will build next */}
                            <Link to="/login">
                                <button className="nav-button login-btn">Sign In</button>
                            </Link>
                        </li>
                    )}
                </ul>
            </div>
        </nav>
    );
}