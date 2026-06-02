from django.db import models


class NewsSource(models.Model):

    name = models.CharField(max_length=255)

    domain = models.CharField(max_length=255, unique=True)

    rss_url = models.URLField()

    trust_score = models.FloatField(default=5.0)

    is_active = models.BooleanField(default=True)

    def __str__(self):

        return self.name


class NewsArticle(models.Model):

    title = models.CharField(max_length=500)

    source = models.CharField(max_length=255)

    source_url = models.URLField(unique=True)

    content = models.TextField()

    image_url = models.URLField(blank=True, null=True)

    published_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)

    upvotes = models.IntegerField(default=0)
    
    trending_score = models.IntegerField(default=0)

    source_ref = models.ForeignKey(
        NewsSource,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    summary = models.TextField(blank=True)

    category = models.CharField(
        max_length=100,
        blank=True
    )

    class Meta:

        ordering = ['-created_at']

    def __str__(self):

        return self.title