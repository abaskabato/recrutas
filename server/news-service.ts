import fetch from 'node-fetch';

interface Article {
  title: string;
  description: string;
  url: string;
  source: {
    name: string;
  };
  publishedAt: string;
}

// Simple in-memory cache
let cachedNews: Article[] = [];
let lastFetchTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

class NewsService {
  private apiKey = process.env.NEWS_API_KEY;

  async getLayoffNews(): Promise<Article[]> {
    const now = Date.now();
    if (now - lastFetchTime < CACHE_DURATION && cachedNews.length > 0) {
      console.log('Serving layoff news from cache.');
      return cachedNews;
    }

    if (!this.apiKey) {
      console.error('NEWS_API_KEY is not set. Cannot fetch news.');
      return [];
    }

    console.log('Fetching layoff news from News API...');
    const query = 'layoffs OR "job cuts" OR downsizing';
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.status === 'ok') {
        lastFetchTime = now;
        cachedNews = data.articles;
        return cachedNews;
      } else {
        console.error('Error fetching news from News API:', data.message);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
      return [];
    }
  }
}

export const newsService = new NewsService();
