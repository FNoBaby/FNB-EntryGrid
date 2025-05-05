/**
 * Service that provides configuration values from environment variables
 */
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

// URL mapping for services
const serviceUrls = {
  // Management Panels
  cockpit: process.env.URL_COCKPIT || 'https://cockpit.fnobaby.dev',
  pterodactyl: process.env.URL_PTERODACTYL || 'https://panel.fnobaby.dev',
  netdata: process.env.URL_NETDATA || 'https://netdata.fnobaby.dev',
  filebrowser: process.env.URL_FILEBROWSER || 'https://filebrowser.fnobaby.dev',
  portainer: process.env.URL_PORTAINER || 'https://portainer.fnobaby.dev',
  wireguard: process.env.URL_WIREGUARD || 'https://wireguard.fnobaby.dev',
  
  // Network Configuration
  gponRouter: process.env.URL_GPON_ROUTER || 'http://192.168.1.254',
  xiaomiRouter: process.env.URL_XIAOMI_ROUTER || 'http://192.168.31.1',
  cloudflare: process.env.URL_CLOUDFLARE || 'https://dash.cloudflare.com'
};

// Export configuration values
module.exports = {
  serviceUrls
};
