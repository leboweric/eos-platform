import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../config/database.js';

class CompetitorReviewScraper {
  constructor() {
    this.competitors = [
      {
        name: 'ninety.io',
        g2Url: 'https://www.g2.com/products/ninety/reviews',
        capterraUrl: 'https://www.capterra.com/p/232313/Ninety/reviews/'
      },
      {
        name: 'bloom_growth',
        g2Url: 'https://www.g2.com/products/bloom-growth/reviews',
        capterraUrl: 'https://www.capterra.com/p/135003/Bloom-Growth/reviews/'
      },
      {
        name: 'traction_tools',
        g2Url: 'https://www.g2.com/products/traction-tools/reviews',
        capterraUrl: 'https://www.capterra.com/p/156570/Traction-Tools/reviews/'
      }
    ];
    
    this.painPointKeywords = [
      'expensive', 'costly', 'pricing', 'price',
      'difficult', 'complicated', 'complex', 'confusing',
      'slow', 'performance', 'loading', 'speed',
      'support', 'customer service', 'help',
      'integration', 'integrate', 'connect',
      'missing', 'lack', 'need', 'want',
      'alternative', 'looking for', 'switching',
      'frustrated', 'disappointing', 'unhappy'
    ];
  }

  // Scrape G2 reviews
  async scrapeG2Reviews(competitor) {
    try {
      const response = await axios.get(competitor.g2Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const reviews = [];
      
      $('.review-item').each((index, element) => {
        const rating = $(element).find('.stars-rating').attr('data-rating');
        const reviewerName = $(element).find('.reviewer-name').text().trim();
        const reviewerCompany = $(element).find('.reviewer-company').text().trim();
        const reviewTitle = $(element).find('.review-title').text().trim();
        const reviewText = $(element).find('.review-content').text().trim();
        const reviewDate = $(element).find('.review-date').text().trim();
        
        // Extract pain points from review text
        const painPoints = this.extractPainPoints(reviewText);
        
        reviews.push({
          competitor_name: competitor.name,
          review_platform: 'g2',
          rating: parseInt(rating) || 0,
          reviewer_name: reviewerName,
          reviewer_company: reviewerCompany,
          review_title: reviewTitle,
          review_text: reviewText,
          review_date: this.parseDate(reviewDate),
          pain_points: painPoints
        });
      });
      
      return reviews;
    } catch (error) {
      console.error(`Error scraping G2 for ${competitor.name}:`, error.message);
      return [];
    }
  }

  // Scrape Capterra reviews
  async scrapeCapterraReviews(competitor) {
    try {
      const response = await axios.get(competitor.capterraUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const reviews = [];
      
      $('.review-card').each((index, element) => {
        const rating = $(element).find('.rating-value').text().trim();
        const reviewerName = $(element).find('.reviewer-name').text().trim();
        const reviewerCompany = $(element).find('.reviewer-company').text().trim();
        const reviewTitle = $(element).find('.review-title').text().trim();
        const reviewText = $(element).find('.review-text').text().trim();
        const reviewDate = $(element).find('.review-date').text().trim();
        
        const painPoints = this.extractPainPoints(reviewText);
        
        reviews.push({
          competitor_name: competitor.name,
          review_platform: 'capterra',
          rating: parseFloat(rating) || 0,
          reviewer_name: reviewerName,
          reviewer_company: reviewerCompany,
          review_title: reviewTitle,
          review_text: reviewText,
          review_date: this.parseDate(reviewDate),
          pain_points: painPoints
        });
      });
      
      return reviews;
    } catch (error) {
      console.error(`Error scraping Capterra for ${competitor.name}:`, error.message);
      return [];
    }
  }

  // Extract pain points from review text
  extractPainPoints(text) {
    const lowercaseText = text.toLowerCase();
    const foundPainPoints = [];
    
    this.painPointKeywords.forEach(keyword => {
      if (lowercaseText.includes(keyword)) {
        // Extract sentence containing the keyword
        const sentences = text.split(/[.!?]/);
        sentences.forEach(sentence => {
          if (sentence.toLowerCase().includes(keyword)) {
            foundPainPoints.push(sentence.trim());
          }
        });
      }
    });
    
    return [...new Set(foundPainPoints)]; // Remove duplicates
  }

  // Parse various date formats
  parseDate(dateString) {
    try {
      return new Date(dateString);
    } catch {
      return new Date();
    }
  }

  // Save reviews to database and create prospects
  async saveReviewsToDatabase(reviews) {
    const client = await pool.connect();
    let newProspects = 0;
    let newReviews = 0;
    
    try {
      await client.query('BEGIN');
      
      for (const review of reviews) {
        // Skip if review already exists
        const existingReview = await client.query(
          `SELECT id FROM competitor_reviews 
           WHERE competitor_name = $1 
           AND review_platform = $2 
           AND reviewer_company = $3 
           AND review_date = $4`,
          [
            review.competitor_name,
            review.review_platform,
            review.reviewer_company,
            review.review_date
          ]
        );
        
        if (existingReview.rows.length > 0) {
          continue;
        }
        
        // Check if prospect exists for this company
        let prospectId = null;
        if (review.reviewer_company) {
          const existingProspect = await client.query(
            'SELECT id FROM prospects WHERE company_name = $1',
            [review.reviewer_company]
          );
          
          if (existingProspect.rows.length === 0) {
            // Create new prospect if review is negative
            if (review.rating <= 3) {
              const newProspect = await client.query(
                `INSERT INTO prospects (
                  company_name,
                  using_competitor,
                  competitor_review_rating,
                  competitor_pain_points,
                  source,
                  source_date
                ) VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING id`,
                [
                  review.reviewer_company,
                  review.competitor_name,
                  review.rating,
                  review.pain_points.join('\n'),
                  'review_scraper'
                ]
              );
              prospectId = newProspect.rows[0].id;
              newProspects++;
              
              // Add signal for negative review
              await client.query(
                `INSERT INTO prospect_signals (
                  prospect_id,
                  signal_type,
                  signal_strength,
                  signal_data,
                  source
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                  prospectId,
                  'negative_review',
                  review.rating <= 2 ? 10 : 7,
                  JSON.stringify({
                    platform: review.review_platform,
                    rating: review.rating,
                    pain_points: review.pain_points
                  }),
                  'review_scraper'
                ]
              );
            }
          } else {
            prospectId = existingProspect.rows[0].id;
            
            // Update prospect with review info if more recent/worse
            await client.query(
              `UPDATE prospects 
               SET competitor_review_rating = LEAST(competitor_review_rating, $1),
                   competitor_pain_points = $2,
                   last_updated = NOW()
               WHERE id = $3`,
              [review.rating, review.pain_points.join('\n'), prospectId]
            );
          }
        }
        
        // Save the review
        await client.query(
          `INSERT INTO competitor_reviews (
            prospect_id,
            competitor_name,
            review_platform,
            rating,
            review_title,
            review_text,
            reviewer_name,
            reviewer_company,
            review_date,
            pain_points
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            prospectId,
            review.competitor_name,
            review.review_platform,
            review.rating,
            review.review_title,
            review.review_text,
            review.reviewer_name,
            review.reviewer_company,
            review.review_date,
            review.pain_points
          ]
        );
        newReviews++;
      }
      
      await client.query('COMMIT');
      
      return {
        newProspects,
        newReviews,
        totalProcessed: reviews.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Main scraping function
  async scrapeAllCompetitors() {
    console.log('Starting competitor review scraping...');
    const allReviews = [];
    
    for (const competitor of this.competitors) {
      console.log(`Scraping reviews for ${competitor.name}...`);
      
      // Scrape both platforms
      const g2Reviews = await this.scrapeG2Reviews(competitor);
      const capterraReviews = await this.scrapeCapterraReviews(competitor);
      
      allReviews.push(...g2Reviews, ...capterraReviews);
      
      // Add delay to be respectful to servers
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`Found ${allReviews.length} total reviews`);
    
    // Save to database
    const result = await this.saveReviewsToDatabase(allReviews);
    
    console.log(`Scraping complete:
      - New prospects created: ${result.newProspects}
      - New reviews saved: ${result.newReviews}
      - Total reviews processed: ${result.totalProcessed}`);
    
    return result;
  }

  // Get hot prospects from negative reviews
  async getHotProspectsFromReviews(daysBack = 7) {
    const result = await pool.query(
      `SELECT DISTINCT
        p.*,
        cr.rating as review_rating,
        cr.review_text,
        cr.pain_points,
        cr.review_date
      FROM prospects p
      JOIN competitor_reviews cr ON p.id = cr.prospect_id
      WHERE cr.rating <= 3
        AND cr.review_date >= NOW() - INTERVAL '${daysBack} days'
      ORDER BY cr.rating ASC, cr.review_date DESC`,
      []
    );
    
    return result.rows;
  }
}

// Create scheduled job function
export async function runCompetitorScraping() {
  const scraper = new CompetitorReviewScraper();
  return await scraper.scrapeAllCompetitors();
}

// Export for use in API routes
export default CompetitorReviewScraper;