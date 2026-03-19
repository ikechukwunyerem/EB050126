// src/pages/BlogList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './BlogList.css';

export default function BlogList() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/blog/');
                if (!response.ok) throw new Error('Failed to fetch blog posts');
                const data = await response.json();

                // DRF ViewSets usually return paginated data natively as { count, next, previous, results }
                // Adjust this depending on whether you enabled pagination globally in Django settings
                setPosts(data.results || data);
            } catch (err) {
                console.error("Error fetching blog posts:", err);
                setError("Could not load the blog at this time.");
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    if (loading) return <div className="blog-status container">Loading the latest insights...</div>;
    if (error) return <div className="blog-status error container">{error}</div>;

    return (
        <div className="blog-list-page container">
            <header className="blog-header">
                <h1>The Efiko Blog</h1>
                <p>Insights, updates, and tutorials from our experts.</p>
            </header>

            {posts.length === 0 ? (
                <div className="no-posts">Check back soon for our first post!</div>
            ) : (
                <div className="blog-grid">
                    {posts.map(post => (
                        <Link to={`/blog/${post.slug}`} key={post.id} className="blog-card">
                            {post.cover_image && (
                                <div className="blog-card-image">
                                    <img src={post.cover_image} alt={post.title} />
                                </div>
                            )}
                            <div className="blog-card-content">
                                <h2>{post.title}</h2>
                                <p className="blog-excerpt">{post.excerpt || "Read more about this topic..."}</p>
                                <div className="blog-meta">
                                    <span>By {post.author_name || "Efiko Team"}</span>
                                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}