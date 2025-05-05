const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get database connection string
const connectionString = process.env.DB_CONNECTION_STRING;
let sequelize;

// Create Sequelize instance using connection string if available
if (connectionString) {
  console.log('Using database connection string');
  
  // Extract the dialect from the connection string or default to mysql
  const dialectMatch = connectionString.match(/^([a-zA-Z]+):\/\//);
  const dialect = dialectMatch ? dialectMatch[1] : 'mysql';
  
  sequelize = new Sequelize(connectionString, {
    dialect: dialect, // Explicitly setting the dialect
    logging: process.env.DEBUG === 'true' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  });
} else {
  // Fallback to individual connection parameters
  console.log('Using individual database connection parameters');
  const DB_HOST = process.env.DB_HOST;
  const DB_PORT = process.env.DB_PORT;
  const DB_NAME = process.env.DB_NAME;
  const DB_USER = process.env.DB_USER;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_DIALECT = process.env.DB_DIALECT || 'mysql';

  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: DB_DIALECT,
    logging: process.env.DEBUG === 'true' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
