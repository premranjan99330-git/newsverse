from django.db import models
from django.contrib.auth.models import User
from news.models import NewsArticle


class Comment(models.Model):

    article = models.ForeignKey(
        NewsArticle,
        on_delete=models.CASCADE,
        related_name='comments'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies'
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    upvotes = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username} - {self.article.title}"