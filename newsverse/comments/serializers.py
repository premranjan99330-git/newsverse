from rest_framework import serializers
from .models import Comment


class RecursiveCommentSerializer(serializers.Serializer):

    def to_representation(self, value):
        serializer = CommentSerializer(value, context=self.context)
        return serializer.data


class CommentSerializer(serializers.ModelSerializer):

    replies = RecursiveCommentSerializer(
        many=True,
        read_only=True
    )

    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Comment

        fields = [
            'id',
            'article',
            'parent',
            'user',
            'content',
            'created_at',
            'upvotes',
            'replies'
        ]

        read_only_fields = [
            'user',
            'created_at',
            'upvotes'
        ]