// src/pages/BlogPostDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './BlogPostDetail.css';

export default function BlogPostDetail() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/blog/${slug}/`);
                if (!response.ok) {
                    if (response.status === 404) throw new Error('Post not found');
                    throw new Error('Failed to load the article');
                }
                const data = await response.json();
                setPost(data);
            } catch (err) {
                console.error("Error fetching post details:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [slug]);

    if (loading) return <div className="post-detail-status container">Reading...</div>;

    if (error) return (
        <div className="post-detail-status error container">
            <h2>{error}</h2>
            <Link to="/blog" className="back-link">← Back to Blog</Link>
        </div>
    );

    return (
        <article className="post-detail-page container">
            <Link to="/blog" className="back-link">← Back to Blog</Link>

            <header className="post-header">
                <h1>{post.title}</h1>
                <div className="post-meta-large">
                    <span className="author">By {post.author_name || "Efiko Team"}</span>
                    <span className="date">Published on {new Date(post.created_at).toLocaleDateString()}</span>
                </div>
            </header>

            {post.cover_image && (
                <div className="post-hero-image">
                    <img src={post.cover_image} alt={post.title} />
                </div>
            )}

            {/* Note: If your Django content field contains raw HTML from a rich text editor, 
                you will need to use dangerouslySetInnerHTML here. Assuming plain text/markdown for now. */}
            <div className="post-content">
                {post.content.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}
            </div>
        </article>
    );
}