"""
Similarity Engine
Semantic + TF-IDF search against local NewsArticle DB.
Uses sentence-transformers when available; falls back to TF-IDF gracefully.
"""

import logging
import re
import math
from collections import Counter
from typing import Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Lazy imports - don't crash if not installed
_sentence_transformer = None
_torch = None


def _get_sentence_transformer():
    global _sentence_transformer
    if _sentence_transformer is None:
        try:
            from sentence_transformers import SentenceTransformer
            import torch
            _sentence_transformer = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Loaded sentence-transformers model: all-MiniLM-L6-v2")
        except ImportError:
            logger.warning("sentence-transformers not installed. Using TF-IDF fallback.")
            _sentence_transformer = False   # mark as unavailable
    return _sentence_transformer if _sentence_transformer is not False else None


@dataclass
class SimilarArticle:
    id: int
    title: str
    url: str
    source: str
    published_at: str
    similarity_score: float
    match_type: str     # 'semantic' | 'tfidf' | 'keyword'
    snippet: str        # 150-char excerpt


class SimilarityEngine:
    """
    Finds articles in the NewsArticle DB that are semantically similar
    to a given claim. Uses sentence-transformers or TF-IDF as fallback.
    """

    def __init__(self, max_results: int = 10, similarity_threshold: float = 0.25):
        self.max_results = max_results
        self.similarity_threshold = similarity_threshold
        self._tfidf_corpus: Optional[list] = None
        self._tfidf_matrix: Optional[list] = None
        self._tfidf_vocab: Optional[dict] = None

    # ── Public API ────────────────────────────────────────────────────────

    def find_similar(self, claim_text: str, keywords: list[str]) -> list[SimilarArticle]:
        """
        Search DB for articles related to the claim.
        Returns list of SimilarArticle sorted by score descending.
        """
        # Import here to avoid circular imports in Django
        from news.models import NewsArticle   # adjust app name as needed

        # Fetch candidate articles (keyword pre-filter for performance)
        candidates = self._fetch_candidates(NewsArticle, keywords, claim_text)
        if not candidates:
            return []

        model = _get_sentence_transformer()
        if model:
            results = self._semantic_search(claim_text, candidates, model)
        else:
            results = self._tfidf_search(claim_text, candidates)

        return sorted(results, key=lambda x: x.similarity_score, reverse=True)[:self.max_results]

    # ── DB Fetching ───────────────────────────────────────────────────────

    def _fetch_candidates(self, ArticleModel, keywords: list[str], claim_text: str):
        """
        Fetch up to 200 candidate articles via Django ORM.
        Uses keyword-based pre-filter to keep in-memory processing light.
        """
        from django.db.models import Q

        if not keywords:
            # No keywords: get recent 100 articles
            return list(ArticleModel.objects.order_by('-published_at').values(
                'id', 'title', 'content', 'url', 'source', 'published_at'
            )[:100])

        # Build OR query from top 5 keywords
        top_keywords = keywords[:5]
        q = Q()
        for kw in top_keywords:
            q |= Q(title__icontains=kw) | Q(content__icontains=kw)

        candidates = list(
            ArticleModel.objects.filter(q)
            .order_by('-published_at')
            .values('id', 'title', 'content', 'url', 'source', 'published_at')
            [:200]
        )

        # Fallback: if too few results, broaden
        if len(candidates) < 10:
            broader = list(
                ArticleModel.objects.order_by('-published_at')
                .values('id', 'title', 'content', 'url', 'source', 'published_at')
                [:100]
            )
            # Merge, dedupe by id
            existing_ids = {a['id'] for a in candidates}
            candidates += [a for a in broader if a['id'] not in existing_ids]

        return candidates

    # ── Semantic Search ───────────────────────────────────────────────────

    def _semantic_search(self, claim_text: str, candidates: list, model) -> list[SimilarArticle]:
        import numpy as np

        claim_embedding = model.encode(claim_text, convert_to_numpy=True)

        # Build title+snippet texts for embedding
        texts = []
        for a in candidates:
            content_preview = (a.get('content') or '')[:300]
            texts.append(f"{a['title']} {content_preview}")

        # Batch encode
        try:
            article_embeddings = model.encode(texts, batch_size=64, convert_to_numpy=True,
                                              show_progress_bar=False)
        except Exception as e:
            logger.error(f"Sentence transformer encode failed: {e}")
            return self._tfidf_search(claim_text, candidates)

        # Cosine similarity
        claim_norm = claim_embedding / (np.linalg.norm(claim_embedding) + 1e-8)
        article_norms = article_embeddings / (
            np.linalg.norm(article_embeddings, axis=1, keepdims=True) + 1e-8
        )
        scores = (article_norms @ claim_norm).tolist()

        results = []
        for article, score in zip(candidates, scores):
            if score >= self.similarity_threshold:
                results.append(self._make_similar(article, score, 'semantic'))

        return results

    # ── TF-IDF Fallback ───────────────────────────────────────────────────

    def _tfidf_search(self, claim_text: str, candidates: list) -> list[SimilarArticle]:
        """Simple TF-IDF cosine similarity without any external libraries."""
        documents = []
        for a in candidates:
            content = (a.get('content') or '')[:300]
            documents.append(f"{a['title']} {content}")

        # Build vocabulary
        tokenize = lambda t: re.findall(r'\b[a-z]{2,}\b', t.lower())
        stop = {'the','a','an','and','or','but','in','on','at','to','for','of',
                'with','by','is','are','was','were','this','that','it','as','be'}

        doc_tokens = [
            [w for w in tokenize(d) if w not in stop] for d in documents
        ]
        claim_tokens = [w for w in tokenize(claim_text) if w not in stop]

        # IDF
        N = len(doc_tokens)
        df = Counter()
        for tokens in doc_tokens:
            for w in set(tokens):
                df[w] += 1

        idf = {w: math.log((N + 1) / (df[w] + 1)) + 1 for w in df}

        def tfidf_vec(tokens):
            tf = Counter(tokens)
            total = len(tokens) or 1
            return {w: (count / total) * idf.get(w, 1.0) for w, count in tf.items()}

        def cosine(v1, v2):
            keys = set(v1) & set(v2)
            if not keys:
                return 0.0
            dot = sum(v1[k] * v2[k] for k in keys)
            mag1 = math.sqrt(sum(x ** 2 for x in v1.values()))
            mag2 = math.sqrt(sum(x ** 2 for x in v2.values()))
            return dot / (mag1 * mag2 + 1e-8)

        claim_vec = tfidf_vec(claim_tokens)
        results = []
        for article, tokens in zip(candidates, doc_tokens):
            if not tokens:
                continue
            doc_vec = tfidf_vec(tokens)
            score = cosine(claim_vec, doc_vec)
            if score >= self.similarity_threshold:
                results.append(self._make_similar(article, score, 'tfidf'))

        return results

    # ── Helpers ───────────────────────────────────────────────────────────

    def _make_similar(self, article: dict, score: float, match_type: str) -> SimilarArticle:
        content = article.get('content') or ''
        snippet = content[:150].replace('\n', ' ').strip()
        if len(content) > 150:
            snippet += '...'

        pub = article.get('published_at')
        published_str = pub.strftime('%Y-%m-%d') if hasattr(pub, 'strftime') else str(pub or '')

        return SimilarArticle(
            id=article['id'],
            title=article['title'],
            url=article.get('url', ''),
            source=article.get('source', ''),
            published_at=published_str,
            similarity_score=round(float(score), 4),
            match_type=match_type,
            snippet=snippet,
        )
