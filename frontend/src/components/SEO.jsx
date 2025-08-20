import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  image,
  article = false,
  canonicalUrl,
  noindex = false 
}) => {
  const location = useLocation();
  const siteUrl = 'https://axplatform.app';
  const defaultImage = `${siteUrl}/axp-og-image.png`;
  
  // Default meta data
  const defaults = {
    title: 'AXP - Adaptive Execution Platform | Business Operating System',
    description: 'The most affordable alternative to Ninety.io, Bloom Growth, and EOS One. One platform that adapts to any business framework - EOS, OKRs, Scaling Up, or custom. 30-day free trial.',
    keywords: 'Ninety.io alternative, Bloom Growth alternative, EOS One alternative, business operating system, business management platform, team alignment software, strategic planning software, affordable business software, adaptive business platform',
    image: defaultImage
  };

  const seo = {
    title: title ? `${title} | AXP` : defaults.title,
    description: description || defaults.description,
    keywords: keywords || defaults.keywords,
    image: image || defaults.image,
    url: canonicalUrl || `${siteUrl}${location.pathname}`
  };

  useEffect(() => {
    // Update document title
    document.title = seo.title;

    // Update meta tags
    updateMetaTag('description', seo.description);
    updateMetaTag('keywords', seo.keywords);
    
    // Open Graph tags
    updateMetaTag('og:title', seo.title, 'property');
    updateMetaTag('og:description', seo.description, 'property');
    updateMetaTag('og:image', seo.image, 'property');
    updateMetaTag('og:url', seo.url, 'property');
    updateMetaTag('og:type', article ? 'article' : 'website', 'property');
    updateMetaTag('og:site_name', 'AXP - Adaptive Execution Platform', 'property');
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', seo.title);
    updateMetaTag('twitter:description', seo.description);
    updateMetaTag('twitter:image', seo.image);
    
    // Canonical URL
    updateLinkTag('canonical', seo.url);
    
    // Robots
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }

    // Structured Data (Schema.org)
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'AXP - Adaptive Execution Platform',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: seo.description,
      url: siteUrl,
      offers: {
        '@type': 'Offer',
        price: '149.00',
        priceCurrency: 'USD',
        priceSpecification: [
          {
            '@type': 'UnitPriceSpecification',
            price: '149.00',
            priceCurrency: 'USD',
            billingIncrement: 1,
            billingDuration: 'P1M',
            name: 'Starter Plan'
          },
          {
            '@type': 'UnitPriceSpecification',
            price: '349.00',
            priceCurrency: 'USD',
            billingIncrement: 1,
            billingDuration: 'P1M',
            name: 'Growth Plan'
          }
        ]
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '127'
      },
      creator: {
        '@type': 'Organization',
        name: 'Profitbuilder Network',
        url: siteUrl
      }
    };

    // Add or update structured data script
    let scriptTag = document.querySelector('script[type="application/ld+json"]');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

  }, [seo.title, seo.description, seo.keywords, seo.image, seo.url, article, noindex]);

  return null;
};

// Helper function to update meta tags
function updateMetaTag(name, content, attributeName = 'name') {
  let element = document.querySelector(`meta[${attributeName}="${name}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, name);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

// Helper function to update link tags
function updateLinkTag(rel, href) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', href);
}

export default SEO;