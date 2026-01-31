/**
 * Wikipedia Discovery Module
 *
 * Discovers companies from Fortune 500 Computer Software & Information Services list on Wikipedia
 * Provides a reliable, free source of high-quality companies for scraping
 */

import * as cheerio from 'cheerio';

interface WikipediaCompanyData {
  name: string;
  source: 'wikipedia';
}

export class WikipediaDiscovery {
  /**
   * Discover Fortune 500 companies from Wikipedia
   */
  async discoverFromFortune500(): Promise<WikipediaCompanyData[]> {
    try {
      const url = 'https://en.wikipedia.org/wiki/List_of_Fortune_500_computer_software_and_information_companies';

      console.log('[Wikipedia] Fetching Fortune 500 Computer Software companies...');

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'RecrutasJobAggregator/1.0'
        }
      });

      if (!response.ok) {
        console.error(`[Wikipedia] Failed to fetch page: ${response.statusText}`);
        return [];
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const companies: WikipediaCompanyData[] = [];

      // Parse the main table - Fortune 500 companies are in a wikitable
      // The table structure has company names in a column (usually 2nd after rank)
      $('table.wikitable tbody tr').each((i, row) => {
        // Skip header rows
        if (i === 0) return;

        // Get all cells in the row
        const cells = $(row).find('td');

        if (cells.length > 0) {
          // Company name is typically in the first or second cell
          // Skip first cell if it's a rank number
          let companyName = '';

          // Try first cell
          const firstCell = cells.eq(0).text().trim();
          const secondCell = cells.eq(1).text().trim();

          // If first cell is just a number (rank), use second cell
          if (firstCell && /^\d+$/.test(firstCell) && secondCell) {
            companyName = secondCell;
          } else if (firstCell) {
            companyName = firstCell;
          }

          // Clean up company name - remove citations and extra whitespace
          companyName = companyName
            .split('\n')[0] // Take first line only
            .replace(/\[\d+\]/g, '') // Remove citation markers [1], [2], etc.
            .replace(/^[\d.\s]+/g, '') // Remove leading numbers and dots (in case of numbering)
            .trim();

          if (companyName && companyName.length > 1) {
            companies.push({
              name: companyName,
              source: 'wikipedia'
            });
          }
        }
      });

      console.log(`[Wikipedia] Discovered ${companies.length} companies from Fortune 500 list`);

      return companies;

    } catch (error) {
      console.error('[Wikipedia] Error during discovery:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Discover from S&P 500 companies (extended source)
   * Post-MVP: Can add more Wikipedia sources later
   */
  async discoverFromSP500(): Promise<WikipediaCompanyData[]> {
    // Placeholder for future implementation
    return [];
  }

  /**
   * Discover from Y Combinator companies
   * Post-MVP: Can add more Wikipedia sources later
   */
  async discoverFromYCombinator(): Promise<WikipediaCompanyData[]> {
    // Placeholder for future implementation
    return [];
  }
}

export const wikipediaDiscovery = new WikipediaDiscovery();
