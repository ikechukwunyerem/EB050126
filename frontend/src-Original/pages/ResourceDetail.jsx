// src/pages/ResourceDetail.jsx
import { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Comments from '../components/Comments';
import './ResourceDetail.css';

export default function ResourceDetail() {
    const { id } = useParams();
    const { user } = useContext(AuthContext); // <-- 1. Get user state

    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false); // <-- 2. Track subscription

    useEffect(() => {
        // Fetch the single resource from Django
        axios.get(`http://localhost:8000/api/resources/${id}/`)
            .then(response => {
                setResource(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching resource:", error);
                setLoading(false);
            });
    }, [id]);

    // 3. If the user is logged in, check if they have premium access
    useEffect(() => {
        if (user) {
            const token = localStorage.getItem('access_token');
            axios.get('http://localhost:8000/api/subscriptions/my-status/', {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(response => {
                    setHasActiveSubscription(response.data.is_valid);
                })
                .catch(error => console.error("Error checking subscription:", error));
        }
    }, [user]);

    if (loading) return <div className="container loading-text">Loading resource details...</div>;
    if (!resource) return <div className="container loading-text">Resource not found.</div>;

    // 4. The Golden Rule: Can they download it?
    // (Assuming your Django model has a boolean field like 'is_free'. If not, just rely on the subscription check!)
    const canDownload = resource.is_free || hasActiveSubscription;

    return (
        <div className="container resource-detail-page">
            <Link to="/library" className="back-link">← Back to Library</Link>

            <div className="detail-layout">
                <div className="detail-sidebar">
                    <div className="detail-image-box">
                        {resource.cover_image ? (
                            <img src={resource.cover_image} alt={resource.title} />
                        ) : (
                            <div className="placeholder-image">No Cover Available</div>
                        )}
                    </div>
                    <div className="detail-meta">
                        <span className="badge">{resource.resource_type}</span>
                        <p><strong>Added:</strong> {new Date(resource.created_at).toLocaleDateString()}</p>
                        {/* Show a UI badge if the resource is free */}
                        {resource.is_free && <span className="free-badge">Free Resource</span>}
                    </div>
                </div>

                <div className="detail-main">
                    <h1 className="detail-title">{resource.title}</h1>

                    <div className="detail-description">
                        <h3>Description</h3>
                        <p>{resource.description || "No detailed description provided."}</p>
                    </div>

                    {/* --- SMART FILE DOWNLOAD SECTION --- */}
                    <div className="resource-actions">
                        {!resource.file ? (
                            <p className="no-file-text">No downloadable file attached to this resource.</p>
                        ) : canDownload ? (
                            // If they pass the check, show the real button
                            <a
                                href={resource.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-download"
                            >
                                📄 Open / Download Worksheet
                            </a>
                        ) : (
                            // If they FAIL the check, show the Paywall!
                            <div className="paywall-box">
                                <div className="paywall-icon">🔒</div>
                                <h3>Premium Content</h3>
                                <p>This worksheet is exclusive to Efiko Premium members.</p>

                                {!user ? (
                                    <Link to="/login" className="btn-paywall-login">Sign In to Access</Link>
                                ) : (
                                    <Link to="/pricing" className="btn-paywall-upgrade">Upgrade to Premium</Link>
                                )}
                            </div>
                        )}
                    </div>
                    {/* --------------------------------- */}

                    <hr className="divider" />

                    <Comments targetType="resource" targetId={resource.id} canPost={canDownload} />

                </div>
            </div>
        </div>
    );
}