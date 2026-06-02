from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import NewsArticle
from .serializers import NewsArticleSerializer


class NewsListView(generics.ListAPIView):

    serializer_class = NewsArticleSerializer

    def get_queryset(self):

        queryset = NewsArticle.objects.all().order_by(
            '-published_at'
        )

        category = self.request.GET.get('category')

        if category and category.lower() != 'all':

            category_mapping = {

                'tech': 'Technology',
                'technology': 'Technology',

                'politics': 'Politics',

                'health': 'Healthcare',
                'healthcare': 'Healthcare',

                'sports': 'Sports',

                'general': 'General',
            }

            mapped_category = category_mapping.get(
                category.lower(),
                category
            )

            queryset = queryset.filter(
                category__iexact=mapped_category
            )

        return queryset


class NewsDetailView(generics.RetrieveAPIView):

    queryset = NewsArticle.objects.all()

    serializer_class = NewsArticleSerializer


@api_view(['GET'])
def trending_news(request):

    articles = NewsArticle.objects.order_by(
        '-trending_score',
        '-published_at'
    )[:10]

    serializer = NewsArticleSerializer(
        articles,
        many=True
    )

    return Response(serializer.data)

import requests

from django.conf import settings

from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def fact_check(request):

    text = request.GET.get('text')

    if not text:

        return Response(
            {
                'status': 'error',
                'message': 'No text provided'
            },
            status=400
        )

    try:

        url = (
            'https://factchecktools.googleapis.com/v1alpha1/claims:search'
        )

        params = {
            'query': text,
            'key': settings.GOOGLE_FACTCHECK_API_KEY
        }

        response = requests.get(
            url,
            params=params
        )

        data = response.json()

        claims = data.get('claims', [])

        results = []

        for claim in claims[:5]:

            review = claim.get(
                'claimReview',
                [{}]
            )[0]

            results.append({

                'claim':
                claim.get('text'),

                'publisher':
                review.get(
                    'publisher',
                    {}
                ).get('name'),

                'rating':
                review.get('textualRating'),

                'url':
                review.get('url')
            })

        return Response({

            'status': 'success',

            'count': len(results),

            'results': results
        })

    except Exception as e:

        return Response({

            'status': 'error',

            'message': str(e)

        }, status=500)