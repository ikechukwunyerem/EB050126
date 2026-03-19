// src/pages/Dashboard/SavedResources.jsx
// GET /api/resources/saved/
// DELETE /api/resources/:id/unsave/

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaBookmark, FaTrashAlt, FaArrowRight } from 'react-icons/fa';

import { getSavedResources, unsaveResource } from '../../api/resources';
import { toast }      from '../../components/ui/Toast/Toast';
import Pagination     from '../../components/ui/Pagination/Pagination';
import Spinner        from '../../components/ui/Spinner/Spinner';
import ResourceCard   from '../../components/cards/ResourceCard';
import styles from './Dashboard.module.css';
import SEO from '../../components/seo/SEO';

const PAGE_SIZE = 12;

export default function SavedResources() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['resources', 'saved', page],
    queryFn:  () => getSavedResources({ page, page_size: PAGE_SIZE }),
    staleTime: 60 * 1000,
  });

  const unsaveMutation = useMutation({
    mutationFn: (id) => unsaveResource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources', 'saved'] });
      toast.success('Resource removed from saved list.');
    },
    onError: () => toast.error('Could not remove resource.'),
  });

  const saved = data?.results || [];
  const total = data?.count   || 0;

  return (
    <div className={styles.page}>
      <SEO
        title="Saved Resources"
        description="View your saved Efiko Education resources."
        noindex
      />

      <div className="container">
        <div className={styles.inner}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>
              <FaBookmark aria-hidden="true" /> Saved Resources
            </h1>
            <p className={styles.subtitle}>{total > 0 ? `${total} saved resource${total !== 1 ? 's' : ''}` : 'Resources you bookmark will appear here.'}</p>
          </header>

          {isLoading ? (
            <Spinner fullPage message="Loading saved resources…" />
          ) : isError ? (
            <div className={styles.error} role="alert">Failed to load saved resources.</div>
          ) : saved.length === 0 ? (
            <div className={styles.empty}>
              <FaBookmark className={styles.emptyIcon} aria-hidden="true" />
              <h3>Nothing saved yet</h3>
              <p>Browse the library and bookmark resources to find them here.</p>
              <Link to="/resources" className={styles.emptyLink}>
                Browse Resources <FaArrowRight aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.savedGrid}>
                {saved.map(({ id: saveId, resource }) => (
                  <div key={saveId} className={styles.savedCardWrapper}>
                    <ResourceCard resource={resource} />
                    <button
                      type="button"
                      className={styles.unsaveBtn}
                      onClick={() => unsaveMutation.mutate(resource.id)}
                      disabled={unsaveMutation.isPending}
                      aria-label={`Remove ${resource.title} from saved`}
                    >
                      <FaTrashAlt aria-hidden="true" /> Remove
                    </button>
                  </div>
                ))}
              </div>
              {total > PAGE_SIZE && (
                <Pagination count={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
