"""
Credibility Engine
Combines signals from similarity search + fact-check API into a
credibility score and verdict. Never hallucinates certainty.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────

VERDICT_LABELS = {
    'likely_true':     'Likely True',
    'likely_false':    'Likely False',
    'misleading':      'Misleading',
    'partially_true':  'Partially True',
    'unverified':      'Unverified',
    'contested':       'Contested',
}

VERDICT_ICONS = {
    'likely_true':    '✅',
    'likely_false':   '❌',
    'misleading':     '⚠️',
    'partially_true': '🔶',
    'unverified':     '❓',
    'contested':      '⚖️',
}

# Confidence thresholds
HIGH_CONFIDENCE  = 0.75
MED_CONFIDENCE   = 0.50
LOW_CONFIDENCE   = 0.30


@dataclass
class CredibilityResult:
    verdict: str                        # one of 6 verdict tokens
    verdict_label: str
    verdict_icon: str
    confidence: float                   # 0.0 – 1.0
    confidence_label: str               # 'high' | 'medium' | 'low'
    explanation: str
    sensationalism_score: float
    propaganda_flags: list[str]
    supporting_count: int
    contradicting_count: int
    unverified_count: int
    signal_breakdown: dict = field(default_factory=dict)


class CredibilityEngine:
    """
    Scores claim credibility using a weighted signal model.

    Signal weights (total = 1.0):
      - Fact-check API matches     : 0.50  (highest trust)
      - Semantic DB similarity     : 0.30
      - Sensationalism penalty     : 0.10
      - Propaganda flag penalty    : 0.10
    """

    FACTCHECK_WEIGHT    = 0.50
    SIMILARITY_WEIGHT   = 0.30
    SENSATIONAL_WEIGHT  = 0.10
    PROPAGANDA_WEIGHT   = 0.10

    def compute(
        self,
        extracted_claim,         # ExtractedClaim
        similar_articles: list,  # list[SimilarArticle]
        factcheck_results: list, # list[FactCheckResult]
        gemini_analysis: Optional[dict] = None,
    ) -> CredibilityResult:

        # ── 1. Fact-check signal ──────────────────────────────────────────
        fc_signal = self._factcheck_signal(factcheck_results)

        # ── 2. Similarity signal ─────────────────────────────────────────
        sim_signal = self._similarity_signal(similar_articles)

        # ── 3. Sensationalism penalty ────────────────────────────────────
        # High sensationalism → lower credibility
        sens_penalty = extracted_claim.sensationalism_score * -1.0

        # ── 4. Propaganda penalty ────────────────────────────────────────
        prop_penalty = min(len(extracted_claim.propaganda_flags) * 0.15, 0.45) * -1.0

        # ── 5. Combine into raw score (-1 to +1) ─────────────────────────
        raw_score = (
            fc_signal['score']  * self.FACTCHECK_WEIGHT  +
            sim_signal['score'] * self.SIMILARITY_WEIGHT +
            sens_penalty        * self.SENSATIONAL_WEIGHT +
            prop_penalty        * self.PROPAGANDA_WEIGHT
        )

        # ── 6. Gemini override (if available) ────────────────────────────
        if gemini_analysis:
            raw_score = 0.6 * raw_score + 0.4 * gemini_analysis.get('score', raw_score)

        # ── 7. Determine verdict ─────────────────────────────────────────
        verdict = self._score_to_verdict(
            raw_score,
            fc_signal,
            sim_signal,
            extracted_claim.sensationalism_score,
            extracted_claim.propaganda_flags,
        )

        # ── 8. Compute confidence ─────────────────────────────────────────
        # Confidence is how much data we have, not how certain the verdict is
        evidence_count = (
            fc_signal['count'] +
            sim_signal['supporting'] +
            sim_signal['contradicting']
        )
        confidence = self._evidence_to_confidence(evidence_count, fc_signal['count'])

        # ── 9. Build explanation ──────────────────────────────────────────
        explanation = self._build_explanation(
            verdict, confidence,
            fc_signal, sim_signal,
            extracted_claim,
            gemini_analysis,
        )

        conf_label = ('high' if confidence >= HIGH_CONFIDENCE else
                      'medium' if confidence >= MED_CONFIDENCE else 'low')

        return CredibilityResult(
            verdict=verdict,
            verdict_label=VERDICT_LABELS[verdict],
            verdict_icon=VERDICT_ICONS[verdict],
            confidence=round(confidence, 3),
            confidence_label=conf_label,
            explanation=explanation,
            sensationalism_score=round(extracted_claim.sensationalism_score, 3),
            propaganda_flags=extracted_claim.propaganda_flags,
            supporting_count=sim_signal['supporting'],
            contradicting_count=sim_signal['contradicting'],
            unverified_count=sim_signal['unverified'],
            signal_breakdown={
                'factcheck_score':    round(fc_signal['score'], 3),
                'similarity_score':   round(sim_signal['score'], 3),
                'sensationalism':     round(extracted_claim.sensationalism_score, 3),
                'propaganda_penalty': round(abs(prop_penalty), 3),
                'final_raw_score':    round(raw_score, 3),
            },
        )

    # ── Signal builders ───────────────────────────────────────────────────

    def _factcheck_signal(self, results: list) -> dict:
        """Returns score (-1 to +1), counts, and dominant verdict."""
        if not results:
            return {'score': 0.0, 'count': 0, 'verdicts': [], 'dominant': None}

        verdict_scores = {
            'likely_true':    +1.0,
            'partially_true': +0.3,
            'misleading':     -0.4,
            'contested':       0.0,
            'unverified':      0.0,
            'likely_false':   -1.0,
        }

        scores = []
        verdicts = []
        for r in results:
            if r.relevance_score < 0.15:
                continue     # ignore low-relevance hits
            score = verdict_scores.get(r.normalized_rating, 0.0)
            # Weight by relevance
            weighted = score * min(r.relevance_score * 2, 1.0)
            scores.append(weighted)
            verdicts.append(r.normalized_rating)

        if not scores:
            return {'score': 0.0, 'count': 0, 'verdicts': [], 'dominant': None}

        avg_score = sum(scores) / len(scores)
        from collections import Counter
        dominant = Counter(verdicts).most_common(1)[0][0] if verdicts else None

        return {
            'score':    avg_score,
            'count':    len(scores),
            'verdicts': verdicts,
            'dominant': dominant,
        }

    def _similarity_signal(self, articles: list) -> dict:
        """
        Classify similar articles as supporting / contradicting / neutral
        based on title sentiment heuristics + similarity score.
        """
        supporting = 0
        contradicting = 0
        unverified = 0
        score_sum = 0.0

        debunk_words = re.compile(
            r'\b(fake|false|hoax|misleading|wrong|incorrect|debunk|myth|'
            r'no evidence|fabricat|rumor|misinformation)\b',
            flags=2  # re.IGNORECASE
        )
        confirm_words = re.compile(
            r'\b(confirm|verify|true|correct|accurate|real|genuine|official|'
            r'government confirm|court order)\b',
            flags=2
        )

        for art in articles:
            title = art.title.lower()
            sim = art.similarity_score

            if debunk_words.search(title):
                contradicting += 1
                score_sum -= sim
            elif confirm_words.search(title):
                supporting += 1
                score_sum += sim
            else:
                unverified += 1
                score_sum += sim * 0.1   # neutral - small positive lean

        total = max(supporting + contradicting + unverified, 1)
        net_score = score_sum / total

        return {
            'score':          net_score,
            'supporting':     supporting,
            'contradicting':  contradicting,
            'unverified':     unverified,
        }

    # ── Verdict determination ─────────────────────────────────────────────

    def _score_to_verdict(self, raw_score, fc_signal, sim_signal,
                          sensationalism, propaganda_flags) -> str:

        # If fact-check API gave us a clear answer, trust it heavily
        if fc_signal['count'] >= 2 and fc_signal['dominant']:
            dominant = fc_signal['dominant']
            # Still check for mixed signals
            verdicts = fc_signal['verdicts']
            true_count  = verdicts.count('likely_true') + verdicts.count('partially_true')
            false_count = verdicts.count('likely_false') + verdicts.count('misleading')
            if true_count > 0 and false_count > 0:
                return 'contested'
            return dominant

        # Single fact-check hit
        if fc_signal['count'] == 1 and fc_signal['dominant']:
            return fc_signal['dominant']

        # No fact-check data: use similarity + penalties
        if raw_score >= 0.40:
            return 'likely_true'
        elif raw_score <= -0.40:
            # High sensationalism AND negative score → misleading
            if sensationalism >= 0.5 or 'fear_mongering' in propaganda_flags:
                return 'misleading'
            return 'likely_false'
        elif -0.40 < raw_score < -0.10:
            return 'misleading' if sensationalism > 0.3 else 'partially_true'
        elif 0.10 <= raw_score < 0.40:
            return 'partially_true'
        else:
            # Score near 0; contested if mixed signals, else unverified
            if sim_signal['supporting'] > 0 and sim_signal['contradicting'] > 0:
                return 'contested'
            return 'unverified'

    # ── Confidence ────────────────────────────────────────────────────────

    def _evidence_to_confidence(self, total_evidence: int, fc_count: int) -> float:
        """
        More evidence → higher confidence in our verdict (not in the claim).
        Fact-check results are worth 3x local articles.
        """
        weighted = fc_count * 3 + max(total_evidence - fc_count, 0)
        # Sigmoid-like scaling: 0 evidence = 0.1, 10+ = ~0.9
        return min(0.10 + (weighted / (weighted + 5)) * 0.85, 0.95)

    # ── Explanation builder ───────────────────────────────────────────────

    def _build_explanation(self, verdict, confidence, fc_signal,
                           sim_signal, extracted_claim, gemini_analysis) -> str:
        parts = []

        verdict_label = VERDICT_LABELS.get(verdict, verdict)
        conf_pct = int(confidence * 100)

        parts.append(
            f"This claim is assessed as **{verdict_label}** "
            f"with {conf_pct}% analysis confidence."
        )

        # Fact-check sources
        if fc_signal['count'] > 0:
            parts.append(
                f"Found {fc_signal['count']} fact-check review(s) from verified publishers. "
                f"Dominant verdict from those checks: {VERDICT_LABELS.get(fc_signal['dominant'], fc_signal['dominant'])}."
            )
        else:
            parts.append(
                "No direct fact-check records found in Google Fact Check database. "
                "Assessment relies on related news articles and linguistic analysis."
            )

        # Article signals
        total_arts = sim_signal['supporting'] + sim_signal['contradicting'] + sim_signal['unverified']
        if total_arts > 0:
            parts.append(
                f"Matched {total_arts} related articles: "
                f"{sim_signal['supporting']} appear supportive, "
                f"{sim_signal['contradicting']} appear to contradict, "
                f"{sim_signal['unverified']} are neutral/unclassified."
            )

        # Sensationalism
        if extracted_claim.sensationalism_score >= 0.6:
            parts.append(
                "⚠️ The text contains highly sensational language (ALL-CAPS, multiple exclamation marks, "
                "urgent call-to-share phrases), which is a strong indicator of misinformation."
            )
        elif extracted_claim.sensationalism_score >= 0.3:
            parts.append(
                "The text uses moderately sensational language. Exercise caution."
            )

        # Propaganda flags
        if extracted_claim.propaganda_flags:
            flag_descriptions = {
                'fear_mongering':            'fear-mongering rhetoric',
                'false_urgency':             'false urgency / "share before deleted" tactics',
                'us_vs_them':                '"us vs them" framing (deep state, elites, etc.)',
                'appeal_to_authority_fake':  'unverified authority appeal',
                'statistical_manipulation':  'potentially manipulated statistics',
            }
            flag_texts = [flag_descriptions.get(f, f) for f in extracted_claim.propaganda_flags]
            parts.append(
                f"Detected propaganda/manipulation patterns: {', '.join(flag_texts)}."
            )

        # Gemini supplement
        if gemini_analysis and gemini_analysis.get('reasoning'):
            parts.append(f"AI reasoning: {gemini_analysis['reasoning'][:200]}")

        # Epistemic caveat
        parts.append(
            "Note: This is an automated assessment. Always verify claims through "
            "primary sources before sharing."
        )

        return ' '.join(parts)


# Need re for similarity signal
import re
