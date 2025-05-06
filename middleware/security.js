const helmet = require('helmet');

/**
 * Sets up security middleware for the Express app
 * @param {object} app - Express app
 * @param {boolean} isProd - Whether the app is in production mode
 */
function setupSecurityMiddleware(app, isProd) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        imgSrc: [
          "'self'", 
          "data:", 
          "https://cdn-icons-png.flaticon.com",
          "https://cdn.worldvectorlogo.com",
          "https://assets.ubuntu.com",
          "https://pterodactyl.io",
          "https://avatars.githubusercontent.com"
        ],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    }
  }));
}

module.exports = { setupSecurityMiddleware };
