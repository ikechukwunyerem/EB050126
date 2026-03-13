# search/views.py
import hashlib
import logging

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.contrib.postgres.search import SearchQuery, SearchRank

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from core.pagination import StandardResultsSetPagination
from resources.models import Resource
from products.models import Product
from blog.models import Post
from .models import SavedSearch
from .serializers import SavedSearchSerializer

logger = logging.getLogger(__name__)

MIN_RANK         = getattr(settings, 'SEARCH_MIN_RANK', 0.05)
RESULTS_PER_TYPE = getattr(settings, 'SEARCH_RESULTS_PER_TYPE', 10)
CACHE_TTL        = getattr(settings, 'SEARCH_CACHE_TTL', 60)
MAX_QUERY_LENGTH = 200


# ---------------------------------------------------------------------------
# Result builder helpers
# ---------------------------------------------------------------------------

def _build_resource_result(r, request):
    thumbnail = None
    if r.cover_image:
        try:
            url = r.thumbnail_card.url
            thumbnail = request.build_absolute_uri(url) if request else url
        except Exception:
            pass
    return {
        'id': r.id,
        'type': 'resource',
        'title': r.title,
        'slug': r.slug,
        'description': r.description[:200] if r.description else None,
        'thumbnail': thumbnail,
        'access_level': r.access_level,
        'is_free': r.is_free,
    }


def _build_product_result(p, request):
    thumbnail = None
    if p.cover_image and p.thumbnail:
        try:
            thumbnail = request.build_absolute_uri(p.thumbnail.url) if request else p.thumbnail.url
        except Exception:
            pass
    return {
        'id': p.id,
        'type': 'product',
        'title': p.name,
        'slug': p.slug,
        'description': p.description[:200] if p.description else None,
        'thumbnail': thumbnail,
        'price': str(p.price),
    }


def _build_post_result(post, request):
    thumbnail = None
    if post.cover_image:
        try:
            url = post.cover_thumbnail.url
            thumbnail = request.build_absolute_uri(url) if request else url
        except Exception:
            pass
    return {
        'id': post.id,
        'type': 'blog',
        'title': post.title,
        'slug': post.slug,
        'description': post.excerpt[:200] if post.excerpt else None,
        'thumbnail': thumbnail,
    }


# ---------------------------------------------------------------------------
# Global Search
# ---------------------------------------------------------------------------

class GlobalSearchView(APIView):
    """
    GET /search/?q=<query>[&limit=<n>]

    Full-text search across Resources, Products, and Blog Posts.
    Results are merged and sorted by relevance rank.
    SearchLog is written asynchronously via Celery after the response is sent.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        q = request.query_params.get('q', '').strip()

        if not q:
            return Response({'results': [], 'total': 0, 'query': ''})

        if len(q) > MAX_QUERY_LENGTH:
            return Response(
                {'error': f'Search query must be {MAX_QUERY_LENGTH} characters or fewer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            per_type = min(int(request.query_params.get('limit', RESULTS_PER_TYPE)), RESULTS_PER_TYPE)
        except (ValueError, TypeError):
            per_type = RESULTS_PER_TYPE

        # Cache key from normalised query + per_type
        cache_key = 'search:' + hashlib.md5(f'{q.lower()}:{per_type}'.encode()).hexdigest()
        cached = cache.get(cache_key)
        if cached is not None:
            logger.debug('Search cache hit: q=%r', q)
            # Fire async log for the cache hit
            self._fire_log(request, q, cached['results'], was_cached=True)
            return Response(cached)

        query = SearchQuery(q, search_type='websearch')

        resources = (
            Resource.objects
            .filter(search_vector=query, status='published')
            .annotate(rank=SearchRank('search_vector', query))
            .filter(rank__gte=MIN_RANK)
            .order_by('-rank')
            .only('id', 'title', 'slug', 'description', 'cover_image', 'access_level')
            [:per_type]
        )

        products = (
            Product.objects
            .filter(search_vector=query, is_active=True)
            .annotate(rank=SearchRank('search_vector', query))
            .filter(rank__gte=MIN_RANK)
            .order_by('-rank')
            .only('id', 'name', 'slug', 'description', 'cover_image', 'thumbnail', 'price')
            [:per_type]
        )

        posts = (
            Post.objects
            .filter(search_vector=query, status='published')
            .annotate(rank=SearchRank('search_vector', query))
            .filter(rank__gte=MIN_RANK)
            .order_by('-rank')
            .only('id', 'title', 'slug', 'excerpt', 'cover_image')
            [:per_type]
        )

        ranked = []
        for r in resources:
            ranked.append((r.rank, _build_resource_result(r, request)))
        for p in products:
            ranked.append((p.rank, _build_product_result(p, request)))
        for post in posts:
            ranked.append((post.rank, _build_post_result(post, request)))

        ranked.sort(key=lambda x: x[0], reverse=True)
        output = [item for _, item in ranked]

        payload = {'query': q, 'total': len(output), 'results': output}
        cache.set(cache_key, payload, CACHE_TTL)

        logger.info(
            'Search: q=%r resources=%d products=%d posts=%d total=%d',
            q,
            sum(1 for r in output if r['type'] == 'resource'),
            sum(1 for r in output if r['type'] == 'product'),
            sum(1 for r in output if r['type'] == 'blog'),
            len(output),
        )

        self._fire_log(request, q, output, was_cached=False)
        return Response(payload)

    def _fire_log(self, request, q, results, was_cached):
        """
        Enqueues a Celery task to write a SearchLog row after the current
        DB transaction commits. Passes only primitives — no model instances.
        """
        from .tasks import log_search

        user_id = request.user.pk if request.user.is_authenticated else None
        resource_count = sum(1 for r in results if r['type'] == 'resource')
        product_count  = sum(1 for r in results if r['type'] == 'product')
        post_count     = sum(1 for r in results if r['type'] == 'blog')
        result_count   = len(results)

        transaction.on_commit(lambda: log_search.delay(
            user_id=user_id,
            query=q,
            result_count=result_count,
            resource_count=resource_count,
            product_count=product_count,
            post_count=post_count,
            was_cached=was_cached,
        ))


# ---------------------------------------------------------------------------
# Saved Searches
# ---------------------------------------------------------------------------

class SavedSearchListCreateView(generics.ListCreateAPIView):
    """
    GET  /search/saved/   — list the user's saved searches (paginated)
    POST /search/saved/   — save a new search bookmark

    Body: { query: "lesson plan", label: "My lesson plans" (optional) }
    """
    serializer_class = SavedSearchSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return SavedSearch.objects.filter(user=self.request.user).order_by('-created_at')


class SavedSearchDeleteView(generics.DestroyAPIView):
    """
    DELETE /search/saved/{id}/  — remove a saved search bookmark
    """
    serializer_class = SavedSearchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Scoped to the requesting user — can't delete someone else's saved search
        return SavedSearch.objects.filter(user=self.request.user)