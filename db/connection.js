const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables if not already loaded
dotenv.config();

// Configure Sequelize with database settings from environment variables
const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT || 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  logging: process.env.DEBUG === 'true' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  // Add retry logic for failed connections
  retry: {
    max: 3,
    timeout: 30000
  }
});

// Function to connect to the database with retry logic
async function connectDB() {
  let retries = 0;
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds
  
  while (retries < maxRetries) {
    try {
      console.log(`Attempting to connect to database (attempt ${retries + 1}/${maxRetries})...`);
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');
      return true;
    } catch (error) {
      retries++;
      console.error(`Database connection attempt failed (${retries}/${maxRetries}):`, error);
      
      if (retries >= maxRetries) {
        console.error('Max retries reached. Unable to connect to database.');
        return false;
      }
      
      console.log(`Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  return false;
}

// Export both the Sequelize instance and the connection function
module.exports = {
  sequelize,
  connectDB
};
