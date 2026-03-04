// src/components/Comments.jsx
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Comments.css';

export default function Comments({ targetType, targetId }) {
    const { user } = useContext(AuthContext);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch comments on load
    useEffect(() => {
        fetchComments();
    }, [targetType, targetId]);

    const fetchComments = async () => {
        try {
            const response = await axios.get(`http://localhost:8000/api/engagement/${targetType}/${targetId}/comments/`);
            setComments(response.data);
        } catch (error) {
            console.error("Failed to fetch comments:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setIsSubmitting(true);

        try {
            // Securely grab the token from our global storage
            const token = localStorage.getItem('access_token');

            const response = await axios.post(
                `http://localhost:8000/api/engagement/${targetType}/${targetId}/comments/`,
                { content: newComment },
                {
                    headers: { Authorization: `Bearer ${token}` } // Verify identity with Django
                }
            );

            // Add the new comment to the top of the list instantly
            setComments([response.data, ...comments]);
            setNewComment(""); // Clear the box
        } catch (error) {
            console.error("Failed to post comment:", error);
            alert("Error posting comment. Please make sure you are logged in.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="comments-section">
            <h3>Community Discussion ({comments.length})</h3>

            {/* Comment Input Box */}
            {user ? (
                <form className="comment-form" onSubmit={handleSubmit}>
                    <textarea
                        className="comment-input"
                        placeholder={`Join the discussion as ${user.first_name || 'a member'}...`}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows="3"
                        required
                    />
                    <button type="submit" className="comment-submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </button>
                </form>
            ) : (
                <div className="login-prompt">
                    <p>You must be signed in to join the discussion.</p>
                </div>
            )}

            {/* Comment List */}
            <div className="comment-list">
                {comments.length === 0 ? (
                    <p className="no-comments">No comments yet. Be the first to start the discussion!</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="comment-card">
                            <div className="comment-header">
                                <strong>{comment.author_name}</strong>
                                <span className="comment-date">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="comment-content">{comment.content}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}