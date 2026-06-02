"""
Verification Engine  ← Main Orchestrator
Ties together: ClaimExtractor → SimilarityEngine → FactCheckService → CredibilityEngine
Optionally calls Gemini for deeper reasoning on ambiguous claims.

Usage:
    engine = VerificationEngine()
    result = engine.verify("WhatsApp forward text here...")
"""

import logging
import time
from dataclasses import dataclass, field, asdict
from typing import Optional

from .claim_extractor import ClaimExtractor, ExtractedClaim
from .similarity_engine import SimilarityEngine, SimilarArticle
from .factcheck_service import FactCheckService, FactCheckResult
from .misinformation_reasoner import MisinformationReasoner
from .credibility_engine import CredibilityEngine, CredibilityResult

logger = logging.getLogger(__name__)


@dataclass
class VerificationResult:
    # Core output
    verdict: str
    verdict_label: str
    verdict_icon: str
    confidence: float
    confidence_label: str
    explanation: str

    # Linguistic analysis
    sensationalism_score: float
    propaganda_flags: list[str]

    # Source evidence
    supporting_sources: list[dict]
    contradicting_sources: list[dict]
    related_articles: list[dict]

    # Claim metadata
    core_claim: str
    claim_type: str
    entities: list[str]

    # Debug / transparency
    signal_breakdown: dict = field(default_factory=dict)
    processing_time_ms: int = 0
    fallback_used: bool = False


class VerificationEngine:
    """
    Top-level orchestrator. Inject dependencies for testability.
    All sub-services degrade gracefully on missing config/dependencies.
    """

    def __init__(
        self,
        gemini_client=None,         # google.generativeai.GenerativeModel (optional)
        use_gemini_for_ambiguous: bool = True,
    ):
        self.claim_extractor   = ClaimExtractor(gemini_client=gemini_client)
        self.similarity_engine = SimilarityEngine()
        self.factcheck_service = FactCheckService()
        self.credibility_engine = CredibilityEngine()

        self.gemini = gemini_client
        self.use_gemini_for_ambiguous = use_gemini_for_ambiguous

    # ── Public API ────────────────────────────────────────────────────────

    def verify(self, text: str) -> VerificationResult:
        """
        Full verification pipeline. Safe to call from Django views.
        Never raises — returns an 'unverified' result on any internal error.
        """
        start = time.time()
        try:
            return self._run_pipeline(text, start)
        except Exception as e:
            logger.exception(f"VerificationEngine critical error: {e}")
            return self._error_result(text, str(e), start)

    def verify_to_dict(self, text: str) -> dict:
        """Convenience wrapper that returns a plain dict (for DRF serializers)."""
        result = self.verify(text)
        return asdict(result)

    # ── Pipeline ──────────────────────────────────────────────────────────

    def _run_pipeline(self, text: str, start: float) -> VerificationResult:

        # ── Stage 1: Extract claim ────────────────────────────────────────
        extracted: ExtractedClaim = self.claim_extractor.extract(text)
        logger.info(f"Claim extracted: {extracted.core_claim[:80]}... "
                    f"[type={extracted.claim_type}]")

        # ── Stage 2: Similarity search ────────────────────────────────────
        similar_articles: list[SimilarArticle] = []
        try:
            similar_articles = self.similarity_engine.find_similar(
                extracted.core_claim, extracted.keywords
            )
            logger.info(f"Found {len(similar_articles)} similar articles")
        except Exception as e:
            logger.warning(f"Similarity search failed (non-fatal): {e}")

        # ── Stage 3: Fact-check API ───────────────────────────────────────
        factcheck_results: list[FactCheckResult] = []
        try:
            # Build multiple search queries from claim + entities
            queries = self._build_factcheck_queries(extracted)
            factcheck_results = self.factcheck_service.search_multi(queries)
            logger.info(f"Got {len(factcheck_results)} fact-check results")
        except Exception as e:
            logger.warning(f"Fact-check API failed (non-fatal): {e}")

        # ── Stage 4: Gemini reasoning (optional, for ambiguous claims) ────
        gemini_analysis = None
        if self.gemini and self.use_gemini_for_ambiguous:
            try:
                gemini_analysis = self._gemini_reason(
                    extracted, similar_articles, factcheck_results
                )
            except Exception as e:
                logger.warning(f"Gemini reasoning failed (non-fatal): {e}")

        # ── Stage 5: Compute credibility ──────────────────────────────────
        cred: CredibilityResult = self.credibility_engine.compute(
            extracted, similar_articles, factcheck_results, gemini_analysis
        )

        # ── Stage 6: Build final result ───────────────────────────────────
        ms = int((time.time() - start) * 1000)
        return self._build_result(extracted, similar_articles, factcheck_results, cred, ms)

    # ── Helpers ───────────────────────────────────────────────────────────

    def _build_factcheck_queries(self, extracted: ExtractedClaim) -> list[str]:
        queries = [extracted.core_claim[:200]]
        # Add entity-enriched query
        if extracted.entities:
            entity_str = ' '.join(extracted.entities[:3])
            queries.append(f"{entity_str} {' '.join(extracted.keywords[:3])}")
        return queries[:3]

    def _gemini_reason(self, extracted, similar_articles, factcheck_results) -> Optional[dict]:
        """
        Use Gemini to provide additional reasoning. Only called when:
        - verdict is ambiguous (unverified / contested)
        - or claim is political/health type
        """
        article_summaries = '\n'.join(
            f"- {a.title} ({a.source})" for a in similar_articles[:5]
        )
        fc_summaries = '\n'.join(
            f"- {r.publisher}: {r.textual_rating} — {r.claim_text[:100]}"
            for r in factcheck_results[:3]
        )

        prompt = f"""You are a professional fact-checker. Analyze this claim:

CLAIM: {extracted.core_claim}
CLAIM TYPE: {extracted.claim_type}

RELATED ARTICLES:
{article_summaries or 'None found'}

FACT-CHECK RECORDS:
{fc_summaries or 'None found'}

Respond in JSON with:
{{
  "score": <float -1.0 to 1.0, where 1=true, -1=false, 0=uncertain>,
  "reasoning": "<one paragraph, max 100 words>",
  "key_issues": ["<issue1>", "<issue2>"]
}}
Only return JSON. Do not hallucinate certainty. If insufficient data, score = 0."""

        response = self.gemini.generate_content(prompt)
        import json, re
        text = response.text.strip()
        # Extract JSON safely
        match = re.search(r'\{[\s\S]+\}', text)
        if match:
            return json.loads(match.group())
        return None

    def _build_result(
        self,
        extracted: ExtractedClaim,
        similar_articles: list[SimilarArticle],
        factcheck_results: list[FactCheckResult],
        cred: CredibilityResult,
        ms: int,
    ) -> VerificationResult:

        # Classify similar articles into supporting / contradicting / related
        supporting = []
        contradicting = []
        related = []

        import re
        debunk_re = re.compile(
            r'\b(fake|false|hoax|misleading|wrong|debunk|myth|misinformation)\b',
            re.IGNORECASE
        )
        confirm_re = re.compile(
            r'\b(confirm|verify|true|correct|accurate|real|genuine)\b',
            re.IGNORECASE
        )

        for art in similar_articles:
            art_dict = {
                'id': art.id,
                'title': art.title,
                'url': art.url,
                'source': art.source,
                'published_at': art.published_at,
                'similarity_score': art.similarity_score,
                'snippet': art.snippet,
            }
            if debunk_re.search(art.title):
                contradicting.append(art_dict)
            elif confirm_re.search(art.title):
                supporting.append(art_dict)
            else:
                related.append(art_dict)

        # Add fact-check sources to supporting/contradicting
        for r in factcheck_results:
            fc_dict = {
                'publisher': r.publisher,
                'url': r.review_url,
                'rating': r.textual_rating,
                'claim': r.claim_text[:150],
                'type': 'fact_check',
            }
            if r.normalized_rating in ('likely_true', 'partially_true'):
                supporting.append(fc_dict)
            elif r.normalized_rating in ('likely_false', 'misleading'):
                contradicting.append(fc_dict)

        return VerificationResult(
            verdict=cred.verdict,
            verdict_label=cred.verdict_label,
            verdict_icon=cred.verdict_icon,
            confidence=cred.confidence,
            confidence_label=cred.confidence_label,
            explanation=cred.explanation,
            sensationalism_score=cred.sensationalism_score,
            propaganda_flags=cred.propaganda_flags,
            supporting_sources=supporting[:5],
            contradicting_sources=contradicting[:5],
            related_articles=related[:8],
            core_claim=extracted.core_claim,
            claim_type=extracted.claim_type,
            entities=extracted.entities,
            signal_breakdown=cred.signal_breakdown,
            processing_time_ms=ms,
            fallback_used=False,
        )

    def _error_result(self, text: str, error_msg: str, start: float) -> VerificationResult:
        ms = int((time.time() - start) * 1000)
        return VerificationResult(
            verdict='unverified',
            verdict_label='Unverified',
            verdict_icon='❓',
            confidence=0.0,
            confidence_label='low',
            explanation=f"Verification could not be completed due to an internal error. "
                        f"Please try again. (Error: {error_msg[:100]})",
            sensationalism_score=0.0,
            propaganda_flags=[],
            supporting_sources=[],
            contradicting_sources=[],
            related_articles=[],
            core_claim=text[:200],
            claim_type='general',
            entities=[],
            signal_breakdown={'error': error_msg[:100]},
            processing_time_ms=ms,
            fallback_used=True,
        )
