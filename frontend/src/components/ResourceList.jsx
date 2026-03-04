// src/components/ResourceList.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ResourceList() {
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

    if (loading) return <p>Loading library...</p>;

    return (
        <div style={{ marginTop: '40px' }}>
            <h2>Platform Library</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {resources.map(resource => (
                    <div key={resource.id} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '8px', width: '300px' }}>
                        {resource.thumbnail ? (
                            <img
                                src={resource.thumbnail}
                                alt={resource.title}
                                style={{ width: '100%', height: '157px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '157px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                No Image
                            </div>
                        )}
                        <h3>{resource.title}</h3>
                        <p style={{ color: '#666', fontSize: '14px' }}>Type: {resource.resource_type}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}