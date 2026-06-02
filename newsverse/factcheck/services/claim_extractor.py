"""
Claim Extractor Service
Extracts core verifiable claims from raw text (WhatsApp forwards, articles, etc.)
No external API required - uses rule-based + optional Gemini extraction.
"""

import re
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ExtractedClaim:
    original_text: str
    core_claim: str
    claim_type: str          # statistical | political | health | general | event
    entities: list[str]      # named entities (people, places, orgs)
    keywords: list[str]      # key terms for search
    sensationalism_score: float   # 0.0 - 1.0
    propaganda_flags: list[str]
    is_question: bool
    truncated: bool          # True if input was very long


# ── Sensational / propaganda language patterns ─────────────────────────────
SENSATIONAL_PATTERNS = [
    r'\b(SHOCKING|BREAKING|EXPOSED|BOMBSHELL|EXPLOSIVE|UNBELIEVABLE|INCREDIBLE)\b',
    r'\b(MUST\s+SHARE|SHARE\s+IMMEDIATELY|FORWARD\s+THIS|VIRAL)\b',
    r'\b(SECRET|HIDDEN\s+TRUTH|THEY\s+DON\'T\s+WANT\s+YOU\s+TO\s+KNOW)\b',
    r'\b(100\s*%\s+PROVEN|SCIENTIFICALLY\s+PROVEN|DOCTORS\s+HATE)\b',
    r'[!]{2,}',             # multiple exclamation marks
    r'[A-Z]{5,}',           # long all-caps runs
]

PROPAGANDA_PATTERNS = {
    'fear_mongering': [
        r'\b(threat|danger|crisis|catastrophe|invasion|takeover|replace)\b',
        r'\b(wake\s*up|sheeple|asleep|brainwashed|propaganda)\b',
    ],
    'false_urgency': [
        r'\b(urgent|immediately|before\s+it\'s\s+deleted|act\s+now|last\s+chance)\b',
        r'\b(share\s+before|they\s+will\s+delete|censored)\b',
    ],
    'us_vs_them': [
        r'\b(elites?|deep\s+state|mainstream\s+media|globalists?|cabal)\b',
        r'\b(corrupt\s+(politicians?|government|media))\b',
    ],
    'appeal_to_authority_fake': [
        r'\b(doctors\s+confirm|scientists\s+say|experts\s+agree|studies\s+show)\b(?!\s+that\s+\w)',
        r'\b(harvard\s+study|stanford\s+research)\b(?!\s+\d{4})',
    ],
    'statistical_manipulation': [
        r'\b\d+\s*%\s+of\s+(all\s+)?(people|voters|indians?|muslims?|hindus?)\b',
        r'\b(statistics\s+show|data\s+proves?|numbers\s+don\'t\s+lie)\b',
    ],
}

CLAIM_TYPE_PATTERNS = {
    'statistical': [
        r'\b\d+[\.,]?\d*\s*(%|percent|crore|lakh|million|billion|thousand)\b',
        r'\b(survey|poll|study|research|report|data)\b',
        r'\b(increased?|decreased?|rose|fell|grew)\s+by\s+\d+',
    ],
    'political': [
        r'\b(government|minister|pm|president|bjp|congress|aap|parliament|lok\s*sabha|rajya\s*sabha)\b',
        r'\b(policy|law|bill|act|amendment|election|vote|voter)\b',
        r'\b(modi|rahul|kejriwal|shah|yogi)\b',
    ],
    'health': [
        r'\b(cure|treatment|medicine|vaccine|virus|disease|cancer|covid|health)\b',
        r'\b(doctors?|hospital|who|icmr|aiims)\b',
    ],
    'event': [
        r'\b(happened|occurred|took\s+place|incident|attack|protest|riot)\b',
        r'\b(yesterday|today|last\s+(week|month|year)|recently|just\s+now)\b',
    ],
}

# Phrases to strip from WhatsApp forwards before analysis
WHATSAPP_NOISE = [
    r'^\s*(forwarded\s+many\s+times\.?\s*)',
    r'^\s*(\[?\s*forwarded\s*\]?\s*)',
    r'(please\s+share\s+this\s+message[\s\S]*$)',
    r'(जय\s+हिन्द|jai\s+hind|vande\s+mataram)',
    r'(good\s+morning|good\s+evening|good\s+night)\s*[🌅🌄🌙☀️🙏]*',
    r'(source\s*:\s*whatsapp)',
]


class ClaimExtractor:
    """
    Extracts a clean, searchable core claim from raw input text.
    Works entirely offline unless Gemini is configured.
    """

    def __init__(self, gemini_client=None):
        self.gemini = gemini_client   # optional; pass google.generativeai model
        self._compiled_sensational = [
            re.compile(p, re.IGNORECASE) for p in SENSATIONAL_PATTERNS
        ]
        self._compiled_propaganda = {
            flag: [re.compile(p, re.IGNORECASE) for p in patterns]
            for flag, patterns in PROPAGANDA_PATTERNS.items()
        }
        self._compiled_claim_types = {
            ctype: [re.compile(p, re.IGNORECASE) for p in patterns]
            for ctype, patterns in CLAIM_TYPE_PATTERNS.items()
        }

    # ── Public API ────────────────────────────────────────────────────────

    def extract(self, text: str) -> ExtractedClaim:
        """Main entry point. Returns structured claim from raw text."""
        text = text.strip()
        truncated = False

        # Cap at 2000 chars for processing; keep original for display
        original_text = text
        if len(text) > 2000:
            text = text[:2000]
            truncated = True

        cleaned = self._clean_whatsapp_noise(text)
        core_claim = self._extract_core_claim(cleaned)
        claim_type = self._detect_claim_type(cleaned)
        entities = self._extract_entities(cleaned)
        keywords = self._extract_keywords(cleaned, core_claim)
        sensationalism_score = self._score_sensationalism(text)  # use original for scoring
        propaganda_flags = self._detect_propaganda(text)
        is_question = cleaned.strip().endswith('?')

        return ExtractedClaim(
            original_text=original_text[:500],   # store first 500 chars
            core_claim=core_claim,
            claim_type=claim_type,
            entities=entities,
            keywords=keywords,
            sensationalism_score=sensationalism_score,
            propaganda_flags=propaganda_flags,
            is_question=is_question,
            truncated=truncated,
        )

    # ── Internal helpers ──────────────────────────────────────────────────

    def _clean_whatsapp_noise(self, text: str) -> str:
        for pattern in WHATSAPP_NOISE:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
        # Remove emoji-heavy lines (often just filler)
        lines = text.splitlines()
        cleaned_lines = []
        for line in lines:
            emoji_count = sum(1 for c in line if ord(c) > 0x1F300)
            word_count = len(line.split())
            if word_count == 0:
                continue
            if emoji_count / max(word_count, 1) < 0.8:   # keep if < 80% emoji
                cleaned_lines.append(line)
        return '\n'.join(cleaned_lines).strip()

    def _extract_core_claim(self, text: str) -> str:
        """
        Heuristic: take the first substantive sentence that contains
        a verb + subject. Falls back to first 200 chars.
        """
        if self.gemini:
            try:
                return self._gemini_extract(text)
            except Exception as e:
                logger.warning(f"Gemini extraction failed, falling back: {e}")

        sentences = re.split(r'(?<=[.!?])\s+', text)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 20:
                continue
            # Prefer sentences with verbs (simple heuristic)
            if re.search(r'\b(is|are|was|were|has|have|had|will|did|does|do|said|says|claims?|shows?|proves?|confirms?)\b',
                         sentence, re.IGNORECASE):
                return sentence[:300]

        # Fallback: first 200 chars of cleaned text
        return text[:200].strip()

    def _gemini_extract(self, text: str) -> str:
        prompt = (
            "Extract the single core verifiable claim from the following text. "
            "Return ONLY the claim as one concise sentence. "
            "Do not add explanation or commentary.\n\nText:\n" + text[:1500]
        )
        response = self.gemini.generate_content(prompt)
        return response.text.strip()[:300]

    def _detect_claim_type(self, text: str) -> str:
        scores = {}
        for ctype, patterns in self._compiled_claim_types.items():
            scores[ctype] = sum(1 for p in patterns if p.search(text))
        if not any(scores.values()):
            return 'general'
        return max(scores, key=scores.get)

    def _extract_entities(self, text: str) -> list[str]:
        """Simple regex-based NER for Indian context."""
        entities = []
        # Capitalized words (likely proper nouns)
        caps = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        # Filter common words
        stopwords = {'The', 'This', 'That', 'These', 'Those', 'When', 'Where',
                     'What', 'Why', 'How', 'Who', 'Which', 'According', 'Also',
                     'However', 'Therefore', 'Because', 'Since', 'While', 'After',
                     'Before', 'During', 'Between', 'Among', 'India', 'Indian'}
        entities = [e for e in caps if e not in stopwords and len(e) > 2]
        # Add known Indian political entities found in text
        known = ['BJP', 'Congress', 'AAP', 'RSS', 'Modi', 'Rahul Gandhi',
                 'Kejriwal', 'Amit Shah', 'Supreme Court', 'RBI', 'SEBI',
                 'Parliament', 'Lok Sabha', 'Rajya Sabha', 'EC', 'CBI', 'ED']
        for entity in known:
            if re.search(r'\b' + re.escape(entity) + r'\b', text, re.IGNORECASE):
                entities.append(entity)
        return list(dict.fromkeys(entities))[:10]   # dedupe, max 10

    def _extract_keywords(self, text: str, core_claim: str) -> list[str]:
        """TF-inspired keyword extraction from the core claim."""
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
            'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were',
            'be', 'been', 'have', 'has', 'had', 'will', 'would', 'could',
            'should', 'may', 'might', 'shall', 'do', 'does', 'did', 'not',
            'this', 'that', 'it', 'he', 'she', 'they', 'we', 'i', 'you',
            'his', 'her', 'their', 'our', 'its', 'said', 'says', 'according',
        }
        words = re.findall(r'\b[a-zA-Z]{3,}\b', core_claim.lower())
        keywords = [w for w in words if w not in stop_words]
        # Dedupe preserving order
        seen = set()
        result = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                result.append(kw)
        return result[:15]

    def _score_sensationalism(self, text: str) -> float:
        """Returns 0.0 (neutral) to 1.0 (highly sensational)."""
        hits = sum(1 for p in self._compiled_sensational if p.search(text))
        # Normalize: 5+ hits = 1.0
        return min(hits / 5.0, 1.0)

    def _detect_propaganda(self, text: str) -> list[str]:
        flags = []
        for flag, patterns in self._compiled_propaganda.items():
            if any(p.search(text) for p in patterns):
                flags.append(flag)
        return flags
