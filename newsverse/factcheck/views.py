"""
Views for the Fact-Check API.
Mount at /api/fact-check/ — see urls.py.
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from .serializers import FactCheckRequestSerializer, FactCheckResponseSerializer
from .services.verification_engine import VerificationEngine

logger = logging.getLogger(__name__)

# ── Singleton engine (loaded once per process) ────────────────────────────
# Avoids reloading sentence-transformers model on every request.

_engine_instance: VerificationEngine = None


def get_engine() -> VerificationEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = _build_engine()
    return _engine_instance


def _build_engine() -> VerificationEngine:
    """Build engine with optional Gemini support."""
    gemini_client = None
    try:
        from django.conf import settings
        gemini_key = getattr(settings, 'GEMINI_API_KEY', None)
        if gemini_key:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            gemini_client = genai.GenerativeModel('gemini-1.5-flash')
            logger.info("Gemini client initialised (gemini-1.5-flash)")
        else:
            logger.info("GEMINI_API_KEY not set. Gemini reasoning disabled.")
    except ImportError:
        logger.info("google-generativeai not installed. Gemini reasoning disabled.")
    except Exception as e:
        logger.warning(f"Gemini init failed: {e}")

    return VerificationEngine(
        gemini_client=gemini_client,
        use_gemini_for_ambiguous=True,
    )


# ── Throttling ────────────────────────────────────────────────────────────

class FactCheckAnonThrottle(AnonRateThrottle):
    rate = '20/hour'


class FactCheckUserThrottle(UserRateThrottle):
    rate = '100/hour'


# ── Main view ─────────────────────────────────────────────────────────────

class FactCheckView(APIView):
    """
    POST /api/fact-check/
    Body: { "text": "claim text here" }
    """
    throttle_classes = [FactCheckAnonThrottle, FactCheckUserThrottle]

    def post(self, request, *args, **kwargs):
        # Validate input
        req_serializer = FactCheckRequestSerializer(data=request.data)
        if not req_serializer.is_valid():
            return Response(
                {'error': 'Invalid input', 'details': req_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        text = req_serializer.validated_data['text']

        # Run verification
        engine = get_engine()
        result_dict = engine.verify_to_dict(text)

        # Serialize + return
        resp_serializer = FactCheckResponseSerializer(data=result_dict)
        if resp_serializer.is_valid():
            return Response(resp_serializer.validated_data, status=status.HTTP_200_OK)
        else:
            # Fallback: return raw dict (shouldn't happen, but safe)
            logger.warning(f"Response serializer errors: {resp_serializer.errors}")
            return Response(result_dict, status=status.HTTP_200_OK)

    def get(self, request, *args, **kwargs):
        """Health check endpoint."""
        return Response({
            'status': 'ok',
            'service': 'AI Credibility Verification Engine',
            'version': '1.0.0',
            'endpoints': {
                'POST /api/fact-check/': 'Verify a claim or text',
            }
        })


# ── Optional: Batch endpoint ──────────────────────────────────────────────

class FactCheckBatchView(APIView):
    """
    POST /api/fact-check/batch/
    Body: { "texts": ["claim1", "claim2", ...] }  (max 5)
    """
    throttle_classes = [FactCheckUserThrottle]

    def post(self, request, *args, **kwargs):
        texts = request.data.get('texts', [])
        if not isinstance(texts, list) or len(texts) == 0:
            return Response({'error': 'texts must be a non-empty list'}, status=400)
        if len(texts) > 5:
            return Response({'error': 'Maximum 5 texts per batch request'}, status=400)

        engine = get_engine()
        results = []
        for text in texts:
            if isinstance(text, str) and len(text.strip()) >= 10:
                results.append(engine.verify_to_dict(text.strip()))
            else:
                results.append({'error': 'Invalid text', 'text': str(text)[:50]})

        return Response({'results': results, 'count': len(results)})
