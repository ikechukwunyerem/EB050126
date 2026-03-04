// src/pages/Library.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import './Library.css';
import { Link } from 'react-router-dom';

export default function Library() {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch data from our Django backend
        axios.get('http://localhost:8000/api/resources/')
            .then(response => {
                setResources(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching resources:", error);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="container loading-text">Loading library...</div>;
    }

    return (
        <div className="container library-page">
            <div className="library-header">
                <h1>Resource Library</h1>
                <p>Explore our premium collection of educational workbooks and videos.</p>
            </div>

            <div className="resource-grid">
                {resources.map(resource => (
                    <div key={resource.id} className="resource-card">
                        <div className="resource-image-container">
                            {resource.thumbnail ? (
                                <img src={resource.thumbnail} alt={resource.title} className="resource-image" />
                            ) : (
                                <div className="resource-image-fallback">
                                    <span>No Image</span>
                                </div>
                            )}
                            <span className="resource-badge">{resource.resource_type}</span>
                        </div>

                        <div className="resource-content">
                            <h3 className="resource-title">{resource.title}</h3>
                            <p className="resource-description">
                                {resource.description ? `${resource.description.substring(0, 80)}...` : 'No description available.'}
                            </p>

                            <div className="resource-footer">
                                <span className="resource-date">
                                    Added: {new Date(resource.created_at).toLocaleDateString()}
                                </span>

                                {/* Wrap the button in a Link pointing to the dynamic ID */}
                                <Link to={`/library/${resource.id}`}>
                                    <button className="view-btn">View Details</button>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}