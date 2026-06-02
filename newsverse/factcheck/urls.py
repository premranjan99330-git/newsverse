"""
URL configuration for the fact-check app.

Add to your project's main urls.py:
    from django.urls import path, include
    urlpatterns = [
        ...
        path('api/fact-check/', include('factcheck.urls')),
    ]
"""

from django.urls import path
from .views import FactCheckView, FactCheckBatchView

app_name = 'factcheck'

urlpatterns = [
    path('',       FactCheckView.as_view(),      name='fact-check'),
    path('batch/', FactCheckBatchView.as_view(),  name='fact-check-batch'),
]
