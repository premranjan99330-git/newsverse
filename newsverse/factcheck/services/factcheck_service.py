"""
Fact Check Service
Queries Google Fact Check Tools API and normalises results.
Falls back gracefully when API key is absent or quota exceeded.
"""

import logging
import hashlib
import time
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
import json

logger = logging.getLogger(__name__)

# ── Result structures ─────────────────────────────────────────────────────

@dataclass
class FactCheckResult:
    claim_text: str
    claimant: str
    claim_date: str
    review_url: str
    publisher: str
    textual_rating: str          # "False", "True", "Mostly True", etc.
    normalized_rating: str       # one of our verdict tokens
    language_code: str
    relevance_score: float       # 0-1, how relevant to our claim


RATING_MAP = {
    # False / Misleading
    'false': 'likely_false',
    'mostly false': 'likely_false',
    'pants on fire': 'likely_false',
    'incorrect': 'likely_false',
    'wrong': 'likely_false',
    'fabricated': 'likely_false',
    'fake': 'likely_false',
    'no evidence': 'likely_false',
    'baseless': 'likely_false',

    # Misleading
    'misleading': 'misleading',
    'missing context': 'misleading',
    'lacks context': 'misleading',
    'out of context': 'misleading',
    'half true': 'partially_true',
    'mostly true': 'partially_true',
    'partially true': 'partially_true',
    'partially false': 'partially_true',

    # True
    'true': 'likely_true',
    'correct': 'likely_true',
    'accurate': 'likely_true',
    'verified': 'likely_true',

    # Contested
    'disputed': 'contested',
    'contested': 'contested',
    'unproven': 'unverified',
    'unverified': 'unverified',
    'needs context': 'misleading',
}


def _normalize_rating(raw: str) -> str:
    cleaned = raw.lower().strip()
    for key, verdict in RATING_MAP.items():
        if key in cleaned:
            return verdict
    return 'unverified'


class FactCheckService:
    """
    Queries Google Fact Check Tools API.
    Results are cached in-memory (LRU-style) to minimise API calls.
    """

    BASE_URL = 'https://factchecktools.googleapis.com/v1alpha1/claims:search'

    def __init__(self, api_key: Optional[str] = None, cache_ttl: int = 3600):
        from django.conf import settings
        self.api_key = api_key or getattr(settings, 'GOOGLE_FACTCHECK_API_KEY', None)
        self.cache_ttl = cache_ttl
        self._cache: dict = {}   # query -> (timestamp, results)

    # ── Public API ────────────────────────────────────────────────────────

    def search(self, query: str, language_code: str = 'en') -> list[FactCheckResult]:
        """
        Search fact-check databases for the given query.
        Returns empty list if API key absent or on error.
        """
        if not self.api_key:
            logger.debug("No GOOGLE_FACTCHECK_API_KEY configured. Skipping.")
            return []

        cache_key = hashlib.md5(f"{query}:{language_code}".encode()).hexdigest()
        cached = self._cache.get(cache_key)
        if cached:
            ts, results = cached
            if time.time() - ts < self.cache_ttl:
                logger.debug(f"Fact-check cache hit for: {query[:50]}")
                return results

        try:
            results = self._fetch(query, language_code)
            self._cache[cache_key] = (time.time(), results)
            # Evict old cache entries if too large
            if len(self._cache) > 500:
                oldest = sorted(self._cache.items(), key=lambda x: x[1][0])[:100]
                for k, _ in oldest:
                    del self._cache[k]
            return results
        except Exception as e:
            logger.error(f"Fact check API error: {e}")
            return []

    def search_multi(self, queries: list[str]) -> list[FactCheckResult]:
        """Run multiple searches and merge results (deduped by review_url)."""
        all_results = []
        seen_urls = set()
        for q in queries[:3]:   # max 3 API calls per verification
            for r in self.search(q):
                if r.review_url not in seen_urls:
                    seen_urls.add(r.review_url)
                    all_results.append(r)
        return all_results

    # ── Internal ──────────────────────────────────────────────────────────

    def _fetch(self, query: str, language_code: str) -> list[FactCheckResult]:
        params = {
            'query': query[:200],
            'key': self.api_key,
            'languageCode': language_code,
            'pageSize': 10,
        }
        url = f"{self.BASE_URL}?{urlencode(params)}"
        req = Request(url, headers={'Accept': 'application/json'})

        with urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())

        claims = data.get('claims', [])
        results = []
        for claim in claims:
            for review in claim.get('claimReview', []):
                raw_rating = review.get('textualRating', 'unverified')
                results.append(FactCheckResult(
                    claim_text=claim.get('text', '')[:300],
                    claimant=claim.get('claimant', ''),
                    claim_date=claim.get('claimDate', ''),
                    review_url=review.get('url', ''),
                    publisher=review.get('publisher', {}).get('name', ''),
                    textual_rating=raw_rating,
                    normalized_rating=_normalize_rating(raw_rating),
                    language_code=review.get('languageCode', 'en'),
                    relevance_score=self._relevance(query, claim.get('text', '')),
                ))

        return results

    def _relevance(self, query: str, claim_text: str) -> float:
        """Simple word-overlap relevance score."""
        if not claim_text:
            return 0.0
        q_words = set(query.lower().split())
        c_words = set(claim_text.lower().split())
        overlap = len(q_words & c_words)
        return round(min(overlap / max(len(q_words), 1), 1.0), 3)
