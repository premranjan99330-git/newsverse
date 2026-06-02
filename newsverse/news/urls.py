from django.urls import path
from .views import NewsListView, NewsDetailView
from .views import trending_news
from .views import fact_check
urlpatterns = [
    path('', NewsListView.as_view(), name='news-list'),

    path('<int:pk>/', NewsDetailView.as_view(), name='news-detail'),
    path(
    'trending/',
    trending_news,
    name='trending-news'
    ),
    path(
    'fact-check/',
    fact_check
    ),
]