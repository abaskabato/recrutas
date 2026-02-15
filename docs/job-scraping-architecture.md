# Job Scraping Architecture - Analysis & Recommendations

## Current State

### Two Separate Schedulers

| Scheduler | What Runs | Frequency |
|-----------|-----------|-----------|
| **GitHub Actions** | Company career pages (72 companies) | Twice daily (6AM, 6PM UTC) |
| **Vercel Cron** | External aggregators (JSearch, RemoteOK, TheMuse, Hiring.cafe) | Daily (6AM UTC) |
| **On-demand** | Hiring.cafe (when candidate visits feed) | Rate limited |

### What's Scraped

**GitHub Actions:**
- Tier 1: 29 Greenhouse companies
- Tier 2: 22 Lever + Workday companies  
- Tier 3: 21 custom career pages
- Cleanup: Jobs older than 15 days

**Vercel Cron:**
- JSearch API
- RemoteOK
- TheMuse
- Hiring.cafe (on-demand only - rate limited)

---

## Issues Identified

1. **Two schedulers to manage** - More complexity, harder to monitor
2. **Hiring.cafe rate limited** - On-demand scraping hits API limits
3. **GitHub Actions doesn't run external aggregators** - Only company careers
4. **Vercel has 55s timeout limit** - Can timeout on large scrapes

---

## Recommendation: Consolidate to GitHub Actions

### Why GitHub Actions is Better

| Factor | GitHub Actions | Vercel Cron |
|--------|----------------|-------------|
| Timeout | 60 minutes | 55 seconds |
| Concurrency | Better control | Limited |
| Monitoring | Built-in | Basic logs |
| Cost | 2000 min/month free | 60 min/day free |
| Unified | Single workflow | Multiple endpoints |

### Proposed Workflow

```yaml
name: Daily Job Scrape

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      # 1. Company career pages (existing)
      - name: Scrape Greenhouse companies
      - name: Scrape Lever/Workday companies
      
      # 2. External aggregators (NEW)
      - name: Scrape JSearch
      - name: Scrape RemoteOK  
      - name: Scrape TheMuse
      - name: Scrape Hiring.cafe
      
      # 3. Cleanup
      - name: Remove stale jobs
```

---

## Implementation Notes

1. **Move all scraping to GitHub Actions**
   - Add external aggregator calls to existing workflow
   - Remove Vercel Cron endpoint or keep as backup

2. **Hiring.cafe Strategy**
   - Current: On-demand (rate limited)
   - Better: Scrape daily in GH Actions, cache in DB
   - Hybrid: Daily scrape + on-demand refresh with caching

3. **Remove on-demand Hiring.cafe**
   - Currently hits API every page load
   - Replace with cached DB results
   - Only fetch fresh if cache > 1 hour old

---

## Action Items

- [ ] Add external aggregators to GitHub Actions workflow
- [ ] Implement Hiring.cafe caching (1 hour TTL)
- [ ] Remove or deprecate Vercel Cron scraping
- [ ] Monitor API rate limits and adjust frequency
- [ ] Add alerting for scrape failures

---

*Last updated: Feb 13, 2026*
