// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null); // NEW: Store the rich profile globally
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                setUser(JSON.parse(storedUser));
                // Fetch the rich profile (with avatar) on initial load
                try {
                    const res = await axios.get('http://localhost:8000/api/auth/profile/', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setProfile(res.data);
                } catch (error) {
                    console.error("Failed to fetch global profile", error);
                }
            }
            setLoading(false);
        };
        initializeAuth();
    }, []);

    const login = async (userData, tokens) => {
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        // Fetch profile immediately after a fresh login
        try {
            const res = await axios.get('http://localhost:8000/api/auth/profile/', {
                headers: { Authorization: `Bearer ${tokens.access}` }
            });
            setProfile(res.data);
        } catch (error) {
            console.error("Failed to fetch profile during login", error);
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, login, logout, loading, setProfile }}>
            {children}
        </AuthContext.Provider>
    );
};