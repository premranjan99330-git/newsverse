from rest_framework import serializers
from .models import NewsArticle
from comments.serializers import CommentSerializer


class NewsArticleSerializer(serializers.ModelSerializer):

    comments = serializers.SerializerMethodField()

    class Meta:
        model = NewsArticle
        fields = '__all__'

    def get_comments(self, obj):

        parent_comments = obj.comments.filter(parent=None)

        return CommentSerializer(
            parent_comments,
            many=True
        ).data