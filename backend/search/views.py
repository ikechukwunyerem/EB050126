# search/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.postgres.search import SearchQuery, SearchRank

from resources.models import Resource
from products.models import Product
from blog.models import Post

class GlobalSearchView(APIView):
    # Anyone can search, but you can change this to IsAuthenticated if needed
    permission_classes = [AllowAny] 

    def get(self, request, *args, **kwargs):
        # Extract the search query parameter (e.g., /api/search/?q=networking)
        q = request.query_params.get('q', '').strip()
        
        if not q:
            return Response({"results": []})

        query = SearchQuery(q)
        
        # 1. Query Resources (Limit to top 10 matches, minimum rank 0.05 to filter junk)
        resources = Resource.objects.filter(search_vector=query).annotate(
            rank=SearchRank('search_vector', query)
        ).filter(rank__gte=0.05).order_by('-rank')[:10]

        # 2. Query Products
        products = Product.objects.filter(search_vector=query).annotate(
            rank=SearchRank('search_vector', query)
        ).filter(rank__gte=0.05).order_by('-rank')[:10]

        # 3. Query Blog Posts
        posts = Post.objects.filter(search_vector=query).annotate(
            rank=SearchRank('search_vector', query)
        ).filter(rank__gte=0.05).order_by('-rank')[:10]

        # 4. Normalize and Combine Results
        results = []
        
        for r in resources:
            results.append({
                "id": r.id,
                "title": r.title,
                "slug": r.slug,
                "type": "resource", # Tells the frontend which component to render
                "rank": r.rank
            })
            
        for p in products:
            results.append({
                "id": p.id,
                "title": p.name,    # Mapping 'name' to 'title' for uniform frontend rendering
                "slug": p.slug,
                "type": "product",
                "rank": p.rank
            })
            
        for post in posts:
            results.append({
                "id": post.id,
                "title": post.title,
                "slug": post.slug,
                "type": "blog",
                "rank": post.rank
            })

        # 5. Sort the combined list by rank (highest first) across all model types
        results.sort(key=lambda x: x['rank'], reverse=True)

        return Response({"results": results})