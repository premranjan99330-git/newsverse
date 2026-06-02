import feedparser

from django.core.management.base import BaseCommand

from news.models import NewsArticle, NewsSource

from newspaper import Article

from bs4 import BeautifulSoup

from datetime import datetime

def detect_category(title, summary):

    text = f"{title} {summary}".lower()

    tech_keywords = [
        'ai', 'openai', 'startup', 'tech',
        'software', 'apple', 'google',
        'microsoft', 'spacex', 'robot'
    ]

    politics_keywords = [
        'government', 'election', 'trump',
        'minister', 'parliament', 'policy',
        'president'
    ]

    health_keywords = [
        'health', 'hospital', 'covid',
        'disease', 'medical', 'doctor',
        'vaccine'
    ]

    sports_keywords = [
        'football', 'cricket', 'nba',
        'fifa', 'sports', 'match'
    ]

    if any(word in text for word in tech_keywords):
        return 'Technology'

    if any(word in text for word in politics_keywords):
        return 'Politics'

    if any(word in text for word in health_keywords):
        return 'Healthcare'

    if any(word in text for word in sports_keywords):
        return 'Sports'

    return 'General'

def calculate_trending_score(title, summary):

    text = f"{title} {summary}".lower()

    score = 0

    high_priority_keywords = [
        'war',
        'attack',
        'ai',
        'openai',
        'spacex',
        'nasa',
        'election',
        'president',
        'government',
        'breaking',
        'earthquake',
        'covid',
        'startup',
        'nuclear',
        'military',
        'ukraine',
        'russia',
        'china',
        'india',
    ]

    medium_priority_keywords = [
        'technology',
        'science',
        'economy',
        'sports',
        'health',
        'robot',
        'iphone',
        'tesla',
        'google',
        'microsoft',
    ]

    for word in high_priority_keywords:

        if word in text:
            score += 20

    for word in medium_priority_keywords:

        if word in text:
            score += 10

    return score

class Command(BaseCommand):

    help = 'Fetch news from trusted RSS feeds'

    def handle(self, *args, **kwargs):

        sources = NewsSource.objects.filter(is_active=True)

        for source in sources:

            feed = feedparser.parse(source.rss_url)

            for entry in feed.entries[:10]:

                title = entry.get('title', '')

                link = entry.get('link', '')

                raw_summary = entry.get('summary', '')

                summary = BeautifulSoup(
                    raw_summary,
                    'html.parser'
                ).get_text()

                full_content = summary

                image_url = ''

                try:

                    news_article = Article(link)

                    news_article.download()

                    news_article.parse()

                    full_content = news_article.text

                    image_url = news_article.top_image
                    self.stdout.write(
    self.style.SUCCESS(
        f'Extracted full article: {title}'
    )
)

                except Exception as e:

                    self.stdout.write(
    self.style.ERROR(
        f'Extraction failed for {link}: {e}'
    )
)

                article, created = NewsArticle.objects.get_or_create(

                    source_url=link,

                    defaults={
                        'trending_score': calculate_trending_score(
                            title,
                            summary
                            ),                       
                        'category': detect_category(title, summary),

                        'title': title,

                        'source': source.name,

                        'source_ref': source,

                        'summary': summary,

                        'content': full_content,

                        'image_url': image_url,

                        'published_at': datetime.now()
                    }
                )

                if created:

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Added: {title}'
                        )
                    )