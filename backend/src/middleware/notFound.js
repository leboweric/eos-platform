export const notFound = (req, res, next) => {
  const url = req.originalUrl;
  
  // List of known bot/scanner patterns to silently reject
  const botPatterns = [
    /\.php$/i,           // PHP files
    /\.asp$/i,           // ASP files
    /\.aspx$/i,          // ASPX files
    /\/wp-/i,            // WordPress paths
    /\/admin/i,          // Common admin paths (unless you use this)
    /\/phpmyadmin/i,     // phpMyAdmin
    /\/cgi-bin/i,        // CGI scripts
    /\.env$/i,           // Environment files
    /\.git/i,            // Git files
    /\.xml$/i,           // XML files (if you don't use them)
    /\/xmlrpc/i          // XML-RPC endpoints
  ];
  
  // Check if this is bot traffic
  const isBotTraffic = botPatterns.some(pattern => pattern.test(url));
  
  if (isBotTraffic) {
    // Silently return 404 without logging
    return res.status(404).send();
  }
  
  // For legitimate 404s, create an error for logging
  const error = new Error(`Not Found - ${url}`);
  res.status(404);
  next(error);
};

