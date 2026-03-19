// src/pages/Resources/ResourceDetail.jsx
// GET /api/resources/:id/
// - file field is null if not entitled — frontend checks this, never enforces it
// - Comments/ratings shown read-only to all; auth prompt on interaction
// - Unauthenticated users see detail + locked download prompt

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FaDownload, FaLock, FaBookmark, FaRegBookmark,
  FaExclamationTriangle, FaCheckCircle, FaArrowLeft,
} from 'react-icons/fa';

import { getResource, saveResource, unsaveResource } from '../../api/resources';
import { getEngagementSummary, submitRating, getComments, postComment } from '../../api/engagement';
import { useAuthStore }          from '../../store/authStore';
import useSubscriptionStatus     from '../../hooks/useSubscriptionStatus';
import { toast }                 from '../../components/ui/Toast/Toast';
import Button                    from '../../components/ui/Button/Button';
import Spinner                   from '../../components/ui/Spinner/Spinner';
import StarRating                from '../../components/ui/StarRating/StarRating';
import Pagination                from '../../components/ui/Pagination/Pagination';
import { formatRelative }        from '../../utils/formatDate';
import styles from './ResourceDetail.module.css';
import SEO from '../../components/seo/SEO';

const TYPE_LABELS = {
  worksheet: 'Worksheet', lesson_plan: 'Lesson Plan', activity: 'Activity',
  assessment: 'Assessment', scheme: 'Scheme of Work',
  presentation: 'Presentation', flashcard: 'Flashcard', other: 'Resource',
};

export default function ResourceDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const { isValid: hasSubscription } = useSubscriptionStatus();

  // ── Resource ──────────────────────────────────────────────────────────────
  const { data: resource, isLoading, isError } = useQuery({
    queryKey: ['resources', 'detail', id],
    queryFn:  () => getResource(id),
    enabled:  Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  // ── Engagement summary ─────────────────────────────────────────────────
  const { data: summary } = useQuery({
    queryKey: ['engagement', 'resource', id, 'summary'],
    queryFn:  () => getEngagementSummary('resource', id),
    enabled:  Boolean(id),
    staleTime: 60 * 1000,
  });

  // ── Save / unsave ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      resource?.is_saved_by_user ? unsaveResource(id) : saveResource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources', 'detail', id] });
      toast.success(resource?.is_saved_by_user ? 'Removed from saved.' : 'Resource saved!');
    },
    onError: () => toast.error('Could not update saved status.'),
  });

  const handleSave = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: `/resources/${id}` } } });
      return;
    }
    saveMutation.mutate();
  };

  // ── Entitlement ───────────────────────────────────────────────────────────
  const canDownload = Boolean(resource?.file);
  const isFree      = resource?.is_free || resource?.access_level === 'free';

  // ── Download click handler ────────────────────────────────────────────────
  const handleDownloadClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      navigate('/login', { state: { from: { pathname: `/resources/${id}` } } });
      return;
    }
    if (!canDownload) {
      e.preventDefault();
      navigate('/pricing');
    }
    // If canDownload is true, the <a> navigates to resource.file normally
  };

  // ── Rating ────────────────────────────────────────────────────────────────
  const ratingMutation = useMutation({
    mutationFn: (score) => submitRating('resource', id, score),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engagement', 'resource', id, 'summary'] });
      toast.success('Rating submitted!');
    },
    onError: () => toast.error('Could not submit rating.'),
  });

  const handleRate = (score) => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: `/resources/${id}` } } });
      return;
    }
    ratingMutation.mutate(score);
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className="container">
          <Spinner fullPage message="Loading resource…" />
        </div>
      </div>
    );
  }

  if (isError || !resource) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.errorState}>
            <FaExclamationTriangle className={styles.errorIcon} aria-hidden="true" />
            <h2>Resource not found</h2>
            <p>This resource may have been removed or doesn't exist.</p>
            <Button onClick={() => navigate('/resources')}>
              <FaArrowLeft aria-hidden="true" /> Back to Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const typeLabel = TYPE_LABELS[resource.resource_type] || 'Resource';

  return (
    <div className={styles.page}>
      <SEO
        title={resource.title}
        description={resource.description?.slice(0, 155) || undefined}
        image={resource.thumbnail_hero || resource.thumbnail_card || undefined}
        type="article"
      />

      <div className="container">

        {/* Back link */}
        <Link to="/resources" className={styles.backLink}>
          <FaArrowLeft aria-hidden="true" /> Resource Library
        </Link>

        <div className={styles.layout}>

          {/* ── Main content ── */}
          <main className={styles.main}>

            {/* Badges */}
            <div className={styles.badgeRow}>
              <span className={styles.typeBadge}>{typeLabel}</span>
              {isFree
                ? <span className={styles.freeBadge}>Free</span>
                : <span className={styles.premiumBadge}><FaLock aria-hidden="true" /> Premium</span>
              }
              {resource.is_featured && (
                <span className={styles.featuredBadge}>Featured</span>
              )}
            </div>

            {/* Title */}
            <h1 className={styles.title}>{resource.title}</h1>

            {/* Engagement summary */}
            {summary && summary.rating_count > 0 && (
              <div className={styles.ratingSummary}>
                <StarRating
                  rating={parseFloat(summary.avg_rating) || 0}
                  count={summary.rating_count}
                  size="md"
                />
                {summary.comment_count > 0 && (
                  <span className={styles.commentCount}>
                    {summary.comment_count} comment{summary.comment_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Preview image */}
            {(resource.thumbnail_hero || resource.thumbnail_card) && (
              <div className={styles.previewWrapper}>
                <img
                  src={resource.thumbnail_hero || resource.thumbnail_card}
                  alt={`Preview of ${resource.title}`}
                  className={styles.previewImage}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {!canDownload && (
                  <div className={styles.previewLockOverlay} aria-hidden="true">
                    <FaLock />
                    <span>Subscribe to download</span>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {resource.description && (
              <div className={styles.description}>
                <h2 className={styles.sectionTitle}>About this resource</h2>
                <p>{resource.description}</p>
              </div>
            )}

            {/* Category breadcrumb */}
            {resource.category && (
              <div className={styles.categoryRow}>
                <span className={styles.categoryLabel}>Category:</span>
                <Link
                  to={`/resources?category__slug=${resource.category.slug}`}
                  className={styles.categoryLink}
                >
                  {resource.category.name}
                </Link>
              </div>
            )}

            {/* Rate this resource */}
            <div className={styles.rateSection}>
              <h2 className={styles.sectionTitle}>Rate this resource</h2>
              {isLoggedIn ? (
                <StarRating
                  rating={0}
                  interactive
                  onRate={handleRate}
                  size="lg"
                />
              ) : (
                <p className={styles.loginPrompt}>
                  <Link to="/login" state={{ from: { pathname: `/resources/${id}` } }}>
                    Sign in
                  </Link>{' '}
                  to rate this resource.
                </p>
              )}
            </div>

            {/* Comments section */}
            <CommentsSection
              resourceId={id}
              isLoggedIn={isLoggedIn}
              resourcePath={`/resources/${id}`}
            />
          </main>

          {/* ── Sidebar actions ── */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <h2 className={styles.sidebarTitle}>Download</h2>

              {/* Entitlement message */}
              {!isLoggedIn && (
                <div className={styles.accessInfo}>
                  <p>Sign in to download this {isFree ? 'free' : 'resource'}.</p>
                </div>
              )}
              {isLoggedIn && !canDownload && !isFree && (
                <div className={styles.accessInfo}>
                  <FaLock aria-hidden="true" />
                  <p>An active subscription is required to download this resource.</p>
                  <Link to="/pricing" className={styles.upgradeCta}>
                    View Subscription Plans
                  </Link>
                </div>
              )}
              {canDownload && (
                <div className={styles.accessGranted}>
                  <FaCheckCircle aria-hidden="true" />
                  <p>You have access to this resource.</p>
                </div>
              )}

              {/* Download button */}
              {resource.file ? (
                <a
                  href={canDownload ? resource.file : '#'}
                  download={canDownload}
                  target={canDownload ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  onClick={handleDownloadClick}
                  className={`${styles.downloadBtn} ${!canDownload ? styles.downloadBtnLocked : ''}`}
                  aria-label={canDownload ? `Download ${resource.title}` : 'Subscription required to download'}
                >
                  {canDownload
                    ? <><FaDownload aria-hidden="true" /> Download File</>
                    : <><FaLock aria-hidden="true" /> {isLoggedIn ? 'Subscribe to Download' : 'Sign in to Download'}</>
                  }
                </a>
              ) : (
                <button className={styles.downloadBtn} disabled>
                  <FaDownload aria-hidden="true" /> Not Available
                </button>
              )}

              {/* Save button */}
              <button
                type="button"
                className={`${styles.saveBtn} ${resource.is_saved_by_user ? styles.saveBtnActive : ''}`}
                onClick={handleSave}
                disabled={saveMutation.isPending}
                aria-pressed={resource.is_saved_by_user}
              >
                {resource.is_saved_by_user
                  ? <><FaBookmark    aria-hidden="true" /> Saved</>
                  : <><FaRegBookmark aria-hidden="true" /> Save to List</>
                }
              </button>
            </div>

            {/* Resource meta */}
            <div className={styles.metaCard}>
              <dl className={styles.metaList}>
                <div className={styles.metaRow}>
                  <dt>Type</dt>
                  <dd>{typeLabel}</dd>
                </div>
                <div className={styles.metaRow}>
                  <dt>Access</dt>
                  <dd>{isFree ? 'Free' : 'Premium'}</dd>
                </div>
                {resource.category && (
                  <div className={styles.metaRow}>
                    <dt>Category</dt>
                    <dd>
                      <Link to={`/resources?category__slug=${resource.category.slug}`}>
                        {resource.category.name}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Comments section ──────────────────────────────────────────────────────────
function CommentsSection({ resourceId, isLoggedIn, resourcePath }) {
  const qc            = useQueryClient();
  const [page, setPage] = useState(1);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['engagement', 'resource', resourceId, 'comments', page],
    queryFn:  () => getComments('resource', resourceId, { page }),
    staleTime: 30 * 1000,
  });

  const comments   = data?.results || [];
  const totalCount = data?.count   || 0;

  const handlePost = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      await postComment('resource', resourceId, { content_input: body.trim() });
      setBody('');
      qc.invalidateQueries({ queryKey: ['engagement', 'resource', resourceId, 'comments'] });
      qc.invalidateQueries({ queryKey: ['engagement', 'resource', resourceId, 'summary'] });
      toast.success('Comment posted!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not post comment.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={styles.commentsSection}>
      <h2 className={styles.sectionTitle}>
        Comments {totalCount > 0 && <span className={styles.commentsBadge}>{totalCount}</span>}
      </h2>

      {/* Post form */}
      {isLoggedIn ? (
        <form className={styles.commentForm} onSubmit={handlePost}>
          <textarea
            className={styles.commentTextarea}
            placeholder="Share your thoughts on this resource…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            aria-label="Write a comment"
            disabled={posting}
          />
          <div className={styles.commentFormFooter}>
            <span className={styles.charCount}>{body.length}/2000</span>
            <Button type="submit" size="sm" isLoading={posting} disabled={!body.trim()}>
              Post Comment
            </Button>
          </div>
        </form>
      ) : (
        <p className={styles.loginPrompt}>
          <Link to="/login" state={{ from: { pathname: resourcePath } }}>Sign in</Link>{' '}
          to leave a comment.
        </p>
      )}

      {/* Comment list */}
      {isLoading ? (
        <Spinner size="md" />
      ) : comments.length === 0 ? (
        <p className={styles.noComments}>No comments yet. Be the first!</p>
      ) : (
        <ul className={styles.commentList}>
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </ul>
      )}

      {totalCount > 10 && (
        <Pagination count={totalCount} page={page} pageSize={10} onPageChange={setPage} />
      )}
    </div>
  );
}

function CommentItem({ comment }) {
  const isDeleted = comment.is_deleted;
  return (
    <li className={`${styles.commentItem} ${isDeleted ? styles.commentDeleted : ''}`}>
      <div className={styles.commentMeta}>
        <span className={styles.commentAuthor}>
          {isDeleted ? 'Deleted' : comment.author_name}
        </span>
        <span className={styles.commentTime}>{formatRelative(comment.created_at)}</span>
        {comment.edited_at && !isDeleted && (
          <span className={styles.commentEdited}>(edited)</span>
        )}
      </div>
      <p className={styles.commentBody}>
        {isDeleted ? <em>[This comment has been deleted]</em> : comment.content}
      </p>
      {comment.replies?.length > 0 && (
        <ul className={styles.replyList}>
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} />
          ))}
        </ul>
      )}
    </li>
  );
}
