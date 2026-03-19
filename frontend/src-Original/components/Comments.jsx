// src/components/Comments.jsx
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Comments.css';

/**
 * @param {string} targetType - 'resource' or 'product' (polymorphic target)
 * @param {number} targetId - The ID of the specific item
 * @param {boolean} canPost - Logic passed from parent (is_free || hasActiveSubscription)
 */
export default function Comments({ targetType, targetId, canPost }) {
    const { user } = useContext(AuthContext);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch comments whenever the target resource changes
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

        // Safety check: if they somehow bypass the UI to hit submit
        if (!newComment.trim() || !canPost) return;

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('access_token');

            const response = await axios.post(
                `http://localhost:8000/api/engagement/${targetType}/${targetId}/comments/`,
                { content: newComment },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            // Optimistically update the UI by adding the new comment to the top
            setComments([response.data, ...comments]);
            setNewComment("");
        } catch (error) {
            console.error("Failed to post comment:", error);
            alert("Error posting comment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="comments-section">
            <h3>Community Discussion ({comments.length})</h3>

            {/* --- Auth & Permission Logic Flow --- */}
            {!user ? (
                // Case 1: User is not logged in
                <div className="login-prompt">
                    <p>You must be signed in to join the discussion.</p>
                </div>
            ) : !canPost ? (
                // Case 2: User is logged in but lacks the required subscription/access
                <div className="restricted-prompt">
                    <p>🔒 Discussion is reserved for <strong>Premium Members</strong>.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '5px' }}>
                        Upgrade your plan to ask questions or leave reviews.
                    </p>
                </div>
            ) : (
                // Case 3: User is logged in and has permission (Free resource or Active Sub)
                <form className="comment-form" onSubmit={handleSubmit}>
                    <textarea
                        className="comment-input"
                        placeholder={`Join the discussion as ${user.first_name || 'a member'}...`}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows="3"
                        required
                    />
                    <button
                        type="submit"
                        className="comment-submit-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </button>
                </form>
            )}

            {/* --- The List of Comments --- */}
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