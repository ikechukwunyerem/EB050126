// src/pages/SearchResults.jsx
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './SearchResults.css';

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!query) return;

        const fetchResults = async () => {
            setLoading(true);
            setError(null);
            try {
                // Adjust the URL if your Django server is running on a different port/host
                const response = await fetch(`http://localhost:8000/api/search/?q=${encodeURIComponent(query)}`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setResults(data.results);
            } catch (err) {
                console.error("Search fetch error:", err);
                setError("Failed to fetch search results. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query]); // Re-run whenever the query string changes

    // Helper to generate the correct route based on the item type
    const getResultLink = (item) => {
        switch (item.type) {
            case 'resource':
                return `/library/${item.id}`; // Matches your App.jsx route
            case 'product':
                return `/products/${item.slug || item.id}`;
            case 'blog':
                return `/blog/${item.slug || item.id}`;
            default:
                return '#';
        }
    };

    return (
        <div className="search-results-page container">
            <h1 className="search-header">
                Search Results for "{query}"
            </h1>

            {loading && <div className="loading-spinner">Searching the platform...</div>}

            {error && <div className="error-message">{error}</div>}

            {!loading && !error && results.length === 0 && query && (
                <div className="no-results">
                    <p>We couldn't find anything matching "{query}".</p>
                    <p>Try checking your spelling or using more general terms.</p>
                </div>
            )}

            {!loading && !error && results.length > 0 && (
                <div className="results-list">
                    {results.map((item, index) => (
                        <Link to={getResultLink(item)} key={`${item.type}-${item.id}-${index}`} className="result-card">
                            <div className="result-badge" data-type={item.type}>
                                {item.type.toUpperCase()}
                            </div>
                            <div className="result-content">
                                <h3 className="result-title">{item.title}</h3>
                                {/* You can expand the Django API later to return an excerpt to display here */}
                                <span className="result-action">View Details →</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}