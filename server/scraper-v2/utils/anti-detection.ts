/**
 * Anti-Detection Utilities
 * 
 * Rotates user agents, manages headers, and implements techniques
 * to avoid being blocked by anti-bot systems.
 */

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

const ACCEPT_HEADERS = [
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
];

const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.9',
  'en-US,en;q=0.8',
  'en-GB,en;q=0.9,en-US;q=0.8',
];

interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export class AntiDetection {
  private userAgentIndex = 0;
  private proxyIndex = 0;
  private proxies: ProxyConfig[] = [];

  constructor(proxies: ProxyConfig[] = []) {
    this.proxies = proxies;
  }

  /**
   * Get randomized headers that appear browser-like
   */
  getHeaders(url: string): Record<string, string> {
    const userAgent = this.getRandomUserAgent();
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      'Accept': this.getRandomAcceptHeader(),
      'Accept-Language': this.getRandomAcceptLanguage(),
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'DNT': '1',
    };

    // Add referer for some requests
    if (Math.random() > 0.3) {
      const domain = new URL(url).hostname;
      headers['Referer'] = `https://www.google.com/search?q=${domain}+careers`;
    }

    return headers;
  }

  /**
   * Get next proxy in rotation
   */
  getNextProxy(): ProxyConfig | undefined {
    if (this.proxies.length === 0) return undefined;
    
    const proxy = this.proxies[this.proxyIndex];
    this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
    return proxy;
  }

  /**
   * Generate a realistic browser fingerprint
   */
  getBrowserFingerprint() {
    const screenResolutions = [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 1440, height: 900 },
      { width: 1680, height: 1050 },
      { width: 1366, height: 768 },
    ];

    const resolution = screenResolutions[Math.floor(Math.random() * screenResolutions.length)];
    
    return {
      screen: resolution,
      colorDepth: 24,
      timezone: 'America/New_York',
      languages: ['en-US', 'en'],
      platform: 'MacIntel',
      hardwareConcurrency: 8,
      deviceMemory: 8,
    };
  }

  /**
   * Calculate a random delay to simulate human browsing
   */
  getRandomDelay(): number {
    // Normal distribution around 2-5 seconds
    const mean = 3500;
    const stdDev = 1000;
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const delay = mean + z * stdDev;
    
    return Math.max(1000, Math.min(10000, delay));
  }

  /**
   * Check if response indicates bot detection
   */
  isBotDetected(response: Response): boolean {
    const botIndicators = [
      'captcha',
      'robot',
      'automated',
      'blocked',
      'unusual traffic',
      'please verify',
      'security check',
    ];

    const contentType = response.headers.get('content-type') || '';
    
    // Check status codes
    if (response.status === 403 || response.status === 429) {
      return true;
    }

    // Check headers
    if (response.headers.get('x-protected-by') || 
        response.headers.get('cf-ray')) {
      return true;
    }

    return false;
  }

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  private getRandomAcceptHeader(): string {
    return ACCEPT_HEADERS[Math.floor(Math.random() * ACCEPT_HEADERS.length)];
  }

  private getRandomAcceptLanguage(): string {
    return ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
  }
}
