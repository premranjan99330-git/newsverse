from rest_framework import generics
from django.contrib.auth.models import User

from .models import Comment
from .serializers import CommentSerializer


class CommentCreateView(generics.CreateAPIView):

    queryset = Comment.objects.all()

    serializer_class = CommentSerializer

    def perform_create(self, serializer):

        user = User.objects.first()

        serializer.save(user=user)