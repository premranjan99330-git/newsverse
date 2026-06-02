import re


class MisinformationReasoner:

    HIGH_RISK_PATTERNS = [
        r"share immediately",
        r"do not ignore",
        r"save lives",
        r"scientists shocked",
        r"government hiding",
        r"media won't show",
        r"secret cure",
        r"miracle cure",
        r"100% guaranteed",
        r"forward this",
        r"urgent warning",
        r"they don't want you to know",
        r"instantly cures",
        r"causes cancer instantly",
        r"toxic reaction",
        r"deadly chemical",
        r"icu",
        r"liver failure",
        r"stomach paralysis",
    ]

    FAKE_AUTHORITY_PATTERNS = [
        r"world health center",
        r"international medical agency",
        r"top scientists",
        r"american research center",
        r"global health institute",
    ]

    def analyze(self, text):

        text_lower = text.lower()

        score = 0
        reasons = []

        # sensational punctuation
        exclamations = text.count("!")
        if exclamations >= 3:
            score += 10
            reasons.append("Excessive emotional punctuation")

        # urgency/fear patterns
        for pattern in self.HIGH_RISK_PATTERNS:
            if re.search(pattern, text_lower):
                score += 8
                reasons.append(f"Detected misinformation pattern: {pattern}")

        # fake authority patterns
        for pattern in self.FAKE_AUTHORITY_PATTERNS:
            if re.search(pattern, text_lower):
                score += 15
                reasons.append(f"Suspicious authority reference: {pattern}")

        # excessive caps
        caps_words = re.findall(r"\b[A-Z]{4,}\b", text)
        if len(caps_words) >= 3:
            score += 10
            reasons.append("Excessive capitalization")

        # unsupported medical claims
        medical_claims = [
            "cures cancer",
            "instant paralysis",
            "toxic buildup",
            "miracle treatment",
            "secret medicine",
        ]

        for claim in medical_claims:
            if claim in text_lower:
                score += 12
                reasons.append(f"Unsupported medical claim: {claim}")

        score = min(score, 100)

        return {
            "misinformation_score": score,
            "reasons": reasons
        }