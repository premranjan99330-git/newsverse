from django.apps import AppConfig


class FactcheckConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'factcheck'
    verbose_name = 'AI Credibility Verification'

    def ready(self):
        """
        Pre-warm the sentence-transformers model in the background
        when Django starts (avoids cold-start on first request).
        This is optional — comment out if you prefer lazy loading.
        """
        import threading

        def warm():
            try:
                from .services.similarity_engine import _get_sentence_transformer
                _get_sentence_transformer()
            except Exception:
                pass   # Non-fatal; will lazy-load on first request

        t = threading.Thread(target=warm, daemon=True)
        t.start()
