// src/pages/ResourceDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Comments from '../components/Comments'; // We will build this next!
import './ResourceDetail.css';

export default function ResourceDetail() {
    // Grab the :id from the URL
    const { id } = useParams();
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div className="container loading-text">Loading resource details...</div>;
    if (!resource) return <div className="container loading-text">Resource not found.</div>;

    return (
        <div className="container resource-detail-page">
            <Link to="/library" className="back-link">← Back to Library</Link>

            <div className="detail-layout">
                {/* Left Column: Image & Core Info */}
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
                    </div>
                </div>

                {/* Right Column: Content & Comments */}
                <div className="detail-main">
                    <h1 className="detail-title">{resource.title}</h1>

                    <div className="detail-description">
                        <h3>Description</h3>
                        <p>{resource.description || "No detailed description provided."}</p>
                    </div>

                    <hr className="divider" />

                    {/* This is where your advanced polymorphic engagement engine lives */}
                    <Comments targetType="resource" targetId={resource.id} />

                </div>
            </div>
        </div>
    );
}