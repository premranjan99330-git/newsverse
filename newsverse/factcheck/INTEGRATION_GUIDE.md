# AI Credibility Verification Engine — Integration Guide

## Directory Structure (drop into your project root)

```
your_project/
├── factcheck/                    ← NEW — copy this entire folder
│   ├── __init__.py
│   ├── apps.py
│   ├── urls.py
│   ├── views.py
│   ├── serializers.py
│   └── services/
│       ├── __init__.py
│       ├── claim_extractor.py    ← Stage 1: parse raw text
│       ├── similarity_engine.py  ← Stage 2: search your DB
│       ├── factcheck_service.py  ← Stage 3: Google Fact Check API
│       ├── credibility_engine.py ← Stage 4: score + verdict
│       └── verification_engine.py ← Orchestrator
├── news/                         ← YOUR EXISTING APP (unchanged)
└── your_project/
    ├── settings.py               ← add 3 lines
    └── urls.py                   ← add 1 line
```

---

## Step 1 — Install Dependencies

```bash
# Required
pip install sentence-transformers torch

# Already in your project (assumed)
# djangorestframework, django

# Optional — for Gemini reasoning
pip install google-generativeai
```

**Minimal install (no GPU, no Gemini):** Only `sentence-transformers` is required.
It will download `all-MiniLM-L6-v2` (~80MB) on first run and cache locally.
TF-IDF fallback activates automatically if it fails.

---

## Step 2 — settings.py

```python
# Add to INSTALLED_APPS
INSTALLED_APPS = [
    ...
    'factcheck',   # ← add this
]

# Add API keys (all optional — engine degrades gracefully without them)
GOOGLE_FACTCHECK_API_KEY = env('GOOGLE_FACTCHECK_API_KEY', default=None)
GEMINI_API_KEY           = env('GEMINI_API_KEY', default=None)
```

**Getting API keys (both free tier):**
- Google Fact Check API: https://developers.google.com/fact-check/tools/api/reference/rest
  → Free: 10,000 requests/day
- Gemini API: https://makersuite.google.com/app/apikey
  → Free: 60 requests/minute on gemini-1.5-flash

---

## Step 3 — urls.py (project level)

```python
from django.urls import path, include

urlpatterns = [
    ...
    path('api/fact-check/', include('factcheck.urls')),   # ← add this line
]
```

---

## Step 4 — Adapt to your NewsArticle model

In `services/similarity_engine.py`, the import is:

```python
from news.models import NewsArticle   # line ~39
```

Change `news` to match your app name if different.

**Required fields on your model** (the engine uses these):
```
id, title, content, url, source, published_at
```

If your model uses different field names, edit the `.values(...)` calls in
`_fetch_candidates()` to match.

---

## Step 5 — Run and Test

```bash
python manage.py runserver

# Test with curl:
curl -X POST http://localhost:8000/api/fact-check/ \
  -H "Content-Type: application/json" \
  -d '{"text": "The Indian government has banned 500 apps linked to China"}'
```

**Health check:**
```bash
curl http://localhost:8000/api/fact-check/
```

---

## API Reference

### `POST /api/fact-check/`

**Request:**
```json
{ "text": "any text, WhatsApp forward, headline, or statement" }
```

**Response:**
```json
{
  "verdict":             "likely_false",
  "verdict_label":       "Likely False",
  "verdict_icon":        "❌",
  "confidence":          0.74,
  "confidence_label":    "high",
  "explanation":         "This claim is assessed as Likely False with 74% analysis confidence...",

  "sensationalism_score": 0.8,
  "propaganda_flags":    ["fear_mongering", "false_urgency"],

  "supporting_sources":  [ { "title": "...", "url": "...", "source": "..." } ],
  "contradicting_sources": [ { "publisher": "AFP", "rating": "False", "url": "..." } ],
  "related_articles":    [ { "title": "...", "url": "...", "snippet": "..." } ],

  "core_claim":  "The government has banned 500 Chinese apps",
  "claim_type":  "political",
  "entities":    ["Government", "China", "apps"],

  "signal_breakdown": {
    "factcheck_score":  -0.8,
    "similarity_score":  0.2,
    "sensationalism":    0.8,
    "propaganda_penalty": 0.3,
    "final_raw_score":  -0.45
  },
  "processing_time_ms": 320
}
```

**Verdict tokens:**
| Token | Label | Meaning |
|-------|-------|---------|
| `likely_true` | ✅ Likely True | Strong evidence supports the claim |
| `likely_false` | ❌ Likely False | Strong evidence contradicts it |
| `misleading` | ⚠️ Misleading | Technically possible but distorted/out of context |
| `partially_true` | 🔶 Partially True | Some truth, some falsehood |
| `unverified` | ❓ Unverified | Insufficient evidence either way |
| `contested` | ⚖️ Contested | Credible sources disagree |

### `POST /api/fact-check/batch/`
```json
{ "texts": ["claim1", "claim2"] }   // max 5
```

---

## Rate Limiting (built-in)

| User Type | Limit |
|-----------|-------|
| Anonymous | 20 requests/hour |
| Authenticated | 100 requests/hour |

Customize in `views.py` → `FactCheckAnonThrottle.rate`.

---

## Architecture Overview

```
Raw Text Input
      │
      ▼
┌─────────────────┐
│  ClaimExtractor  │  ← strips WhatsApp noise, detects sensationalism/propaganda
└────────┬─────────┘
         │ ExtractedClaim
         ▼
┌──────────────────┐        ┌──────────────────────┐
│ SimilarityEngine │        │   FactCheckService    │
│ sentence-trans / │        │  Google Fact Check API│
│ TF-IDF fallback  │        │  (cached, 5s timeout) │
└────────┬─────────┘        └──────────┬────────────┘
         │                             │
         └──────────┬──────────────────┘
                    ▼
         ┌─────────────────┐        ┌──────────────────┐
         │ CredibilityEngine│       │ Gemini (optional) │
         │ weighted scoring │◄──────│ ambiguous claims  │
         └────────┬─────────┘       └──────────────────┘
                  │
                  ▼
           VerificationResult
```

**Signal Weights:**
- Google Fact Check API hits: **50%** (highest trust)
- Semantic DB similarity: **30%**
- Sensationalism penalty: **10%**
- Propaganda flag penalty: **10%**

---

## Performance

| Condition | Typical Latency |
|-----------|----------------|
| sentence-transformers + no API | 150–400ms |
| + Google Fact Check API | 400–800ms |
| + Gemini reasoning | 1–2s |
| TF-IDF only (no ML) | 30–80ms |

The sentence-transformers model loads once and is shared across requests.
First request after server start will be slower (~3s) while the model loads.

---

## Frontend Integration (React — drop-in)

```jsx
// No changes to existing UI needed.
// Add this hook anywhere in your React app:

const useFactCheck = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const verify = async (text) => {
    setLoading(true);
    try {
      const res = await fetch('/api/fact-check/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return { verify, result, loading };
};
```

---

## Environment Variables (.env)

```env
# Optional — engine works without both, but these improve accuracy
GOOGLE_FACTCHECK_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

---

## Disabling Gemini (zero API cost mode)

In `views.py`, set:
```python
return VerificationEngine(gemini_client=None, use_gemini_for_ambiguous=False)
```

In this mode, 100% of processing is local. Only Google Fact Check API
is called (free tier: 10k requests/day).

---

## Troubleshooting

**`ImportError: sentence_transformers`**
```bash
pip install sentence-transformers
```
Engine auto-falls back to TF-IDF if unavailable.

**`ModuleNotFoundError: news.models`**
Edit `services/similarity_engine.py` line ~39 — change `news` to your app name.

**`OperationalError: no such table`**
No DB migration needed — the engine only reads from existing tables.

**Slow first request**
Normal — sentence-transformers model downloads on first use (~80MB).
Set `SENTENCE_TRANSFORMERS_HOME` env var to cache to a persistent volume.

**Google API quota exceeded**
Engine returns results without fact-check data. Verdict still generated
from DB similarity + linguistic analysis.
