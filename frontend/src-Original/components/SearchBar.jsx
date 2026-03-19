import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css';

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            // Push the user to the search results page with the query string
            navigate(`/search?q=${encodeURIComponent(query)}`);
            setQuery(''); // Clear the input after searching
        }
    };

    return (
        <form onSubmit={handleSearch} className="search-form">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses, products, blog..."
                className="search-input"
            />
            <button type="submit" className="search-btn">
                Search
            </button>
        </form>
    );
}