"""
Serializers for the Fact-Check API endpoints.
Drop into your existing DRF app — no model changes required.
"""

from rest_framework import serializers


# ── Request ───────────────────────────────────────────────────────────────

class FactCheckRequestSerializer(serializers.Serializer):
    text = serializers.CharField(
        required=True,
        min_length=10,
        max_length=10000,
        help_text="Raw text to fact-check. Can be a WhatsApp forward, headline, or statement.",
        error_messages={
            'blank':     'Text cannot be blank.',
            'min_length': 'Text must be at least 10 characters.',
            'max_length': 'Text must not exceed 10,000 characters.',
        }
    )

    def validate_text(self, value):
        # Strip leading/trailing whitespace
        return value.strip()


# ── Response sub-serializers ──────────────────────────────────────────────

class SourceSerializer(serializers.Serializer):
    """Represents a supporting or contradicting source (article or fact-check)."""
    title       = serializers.CharField(required=False, default='')
    url         = serializers.URLField(required=False, allow_blank=True, default='')
    source      = serializers.CharField(required=False, default='')
    publisher   = serializers.CharField(required=False, default='')
    published_at = serializers.CharField(required=False, default='')
    similarity_score = serializers.FloatField(required=False, default=0.0)
    snippet     = serializers.CharField(required=False, default='')
    rating      = serializers.CharField(required=False, default='')
    claim       = serializers.CharField(required=False, default='')
    type        = serializers.CharField(required=False, default='article')


class RelatedArticleSerializer(serializers.Serializer):
    id           = serializers.IntegerField(required=False)
    title        = serializers.CharField()
    url          = serializers.URLField(required=False, allow_blank=True)
    source       = serializers.CharField(required=False, default='')
    published_at = serializers.CharField(required=False, default='')
    similarity_score = serializers.FloatField(required=False, default=0.0)
    snippet      = serializers.CharField(required=False, default='')


# ── Main response ─────────────────────────────────────────────────────────

class FactCheckResponseSerializer(serializers.Serializer):
    # Core
    verdict        = serializers.CharField()
    verdict_label  = serializers.CharField()
    verdict_icon   = serializers.CharField()
    confidence     = serializers.FloatField()
    confidence_label = serializers.CharField()
    explanation    = serializers.CharField()

    # Linguistic analysis
    sensationalism_score = serializers.FloatField()
    propaganda_flags     = serializers.ListField(child=serializers.CharField())

    # Sources
    supporting_sources   = SourceSerializer(many=True)
    contradicting_sources = SourceSerializer(many=True)
    related_articles     = RelatedArticleSerializer(many=True)

    # Claim info
    core_claim   = serializers.CharField()
    claim_type   = serializers.CharField()
    entities     = serializers.ListField(child=serializers.CharField())

    # Metadata
    signal_breakdown   = serializers.DictField()
    processing_time_ms = serializers.IntegerField()
