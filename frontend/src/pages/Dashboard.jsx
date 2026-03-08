// src/pages/Dashboard.jsx
import { useEffect, useState, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [subscription, setSubscription] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Edit Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileFormData, setProfileFormData] = useState({ first_name: '', last_name: '', about: '' });
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // Address State
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [newAddress, setNewAddress] = useState({
        recipient_name: '', address_line1: '', city: '', phone_number: '', is_default_shipping: true
    });

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    useEffect(() => {
        if (user) fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            // Fetch Profile
            const profRes = await axios.get('http://localhost:8000/api/auth/profile/', { headers });
            setProfile(profRes.data);
            setProfileFormData({
                first_name: profRes.data.first_name || '',
                last_name: profRes.data.last_name || '',
                about: profRes.data.about || ''
            });

            // Fetch Subscription
            const subRes = await axios.get('http://localhost:8000/api/subscriptions/my-status/', { headers });
            setSubscription(subRes.data);

            // Fetch Addresses
            const addrRes = await axios.get('http://localhost:8000/api/auth/addresses/', { headers });
            setAddresses(addrRes.data);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Profile Handlers ---
    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('access_token');

        // We must use FormData because we are transmitting a file
        const formData = new FormData();
        formData.append('first_name', profileFormData.first_name);
        formData.append('last_name', profileFormData.last_name);
        formData.append('about', profileFormData.about);
        if (selectedImage) {
            formData.append('image', selectedImage);
        }

        try {
            const res = await axios.patch('http://localhost:8000/api/auth/profile/', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setProfile(res.data);
            setIsEditingProfile(false);
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Profile update failed:", error);
            alert("Failed to update profile.");
        }
    };

    // --- Address & Auth Handlers (Abbreviated for brevity, keep your existing ones) ---
    const handleAddAddress = async (e) => { /* Keep existing */ };
    const handleDeleteAddress = async (id) => { /* Keep existing */ };
    const handleLogout = () => { logout(); navigate('/'); };

    // Helper for Django media URLs
    const getImageUrl = (path) => {
        if (!path) return '/default-avatar.png'; // Make sure you have a default avatar in your public folder
        if (path.startsWith('http')) return path;
        return `http://localhost:8000${path}`;
    };

    if (!user) return null;

    return (
        <div className="container dashboard-page">
            <div className="dashboard-header">
                <h1>My Account</h1>
                <p>Manage your profile, addresses, and subscriptions.</p>
            </div>

            <div className="dashboard-grid">
                {/* --- Profile Card --- */}
                <div className="dashboard-card profile-card">
                    <div className="card-header-flex">
                        <h2>Profile Details</h2>
                        <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="btn-edit-profile">
                            {isEditingProfile ? 'Cancel' : 'Edit'}
                        </button>
                    </div>

                    {loading ? <p>Loading profile...</p> : isEditingProfile ? (
                        <form onSubmit={handleProfileSubmit} className="profile-edit-form">
                            <div className="avatar-edit-container">
                                <img
                                    src={imagePreview || getImageUrl(profile.image)}
                                    alt="Profile Preview"
                                    className="profile-avatar large"
                                />
                                <button type="button" onClick={() => fileInputRef.current.click()} className="btn-change-photo">
                                    Change Photo
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                            </div>

                            <div className="form-group">
                                <label>First Name</label>
                                <input type="text" value={profileFormData.first_name} onChange={e => setProfileFormData({ ...profileFormData, first_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input type="text" value={profileFormData.last_name} onChange={e => setProfileFormData({ ...profileFormData, last_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>About Me</label>
                                <textarea value={profileFormData.about} onChange={e => setProfileFormData({ ...profileFormData, about: e.target.value })} rows="3" />
                            </div>
                            <button type="submit" className="btn-save-profile">Save Changes</button>
                        </form>
                    ) : (
                        <div className="profile-info">
                            <div className="profile-header-display">
                                <img src={getImageUrl(profile?.image)} alt="Avatar" className="profile-avatar" />
                                <div>
                                    <h3>{profile?.first_name} {profile?.last_name}</h3>
                                    <p className="text-muted">{profile?.email}</p>
                                </div>
                            </div>

                            {profile?.about && (
                                <div className="info-group bio-group">
                                    <label>About</label>
                                    <p>{profile.about}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={handleLogout} className="btn-logout-large" style={{ marginTop: '30px' }}>Sign Out</button>
                </div>

                {/* Address Book Card */}
                <div className="dashboard-card address-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '2px solid #f4f7f6', paddingBottom: '10px' }}>
                        <h2 style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '0' }}>Address Book</h2>
                        <button onClick={() => setShowAddressForm(!showAddressForm)} className="btn-add-address">
                            {showAddressForm ? 'Cancel' : '+ Add New'}
                        </button>
                    </div>

                    {showAddressForm && (
                        <form onSubmit={handleAddAddress} className="address-form">
                            <input type="text" placeholder="Recipient Name" required value={newAddress.recipient_name} onChange={e => setNewAddress({ ...newAddress, recipient_name: e.target.value })} />
                            <input type="text" placeholder="Street Address" required value={newAddress.address_line1} onChange={e => setNewAddress({ ...newAddress, address_line1: e.target.value })} />
                            <div className="form-row">
                                <input type="text" placeholder="City" required value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} />
                                <input type="text" placeholder="Phone Number" required value={newAddress.phone_number} onChange={e => setNewAddress({ ...newAddress, phone_number: e.target.value })} />
                            </div>
                            <button type="submit" className="btn-submit-address">Save Address</button>
                        </form>
                    )}

                    {!loading && addresses.length === 0 && !showAddressForm && (
                        <p className="no-addresses">You have no saved addresses yet.</p>
                    )}

                    <div className="address-list">
                        {addresses.map(addr => (
                            <div key={addr.id} className="address-item">
                                {addr.is_default_shipping && <span className="default-badge">Default</span>}
                                <strong>{addr.recipient_name}</strong>
                                <p>{addr.address_line1}</p>
                                <p>{addr.city}, Nigeria</p>
                                <p>Phone: {addr.phone_number}</p>
                                <button onClick={() => handleDeleteAddress(addr.id)} className="btn-delete-address">Delete</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Subscription Card */}
                <div className="dashboard-card subscription-card">
                    <h2>Premium Access</h2>
                    {loading ? (
                        <p>Checking subscription...</p>
                    ) : subscription && subscription.is_valid ? (
                        <div className="active-subscription">
                            <div className="status-badge active">Active</div>
                            <h3>{subscription.plan_name}</h3>
                            <p className="billing-cycle">
                                <strong>Renews/Expires:</strong> {new Date(subscription.current_period_end).toLocaleDateString()}
                            </p>
                            <ul className="perks-list">
                                <li>✅ Full Library Access</li>
                                <li>✅ Priority Support</li>
                            </ul>
                        </div>
                    ) : (
                        <div className="inactive-subscription">
                            <div className="status-badge inactive">Inactive</div>
                            <p>You currently do not have an active premium membership.</p>
                            <Link to="/pricing" className="btn-upgrade">Upgrade Now</Link>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}