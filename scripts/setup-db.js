const { sequelize, connectDB } = require('../db/connection');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initial admin user data
const adminUser = {
  username: 'admin',
  password: 'admin123', // This will be hashed by the beforeCreate hook
  name: 'Administrator',
  email: 'admin@example.com',
  role: 'admin'
};

// Function to set up the database
const setupDatabase = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    // Sync all models with the database
    console.log('Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully.');
    
    // Check if any users exist
    const userCount = await User.count();
    
    if (userCount > 0) {
      console.log(`Found ${userCount} existing users.`);
      
      // Check specifically for admin user
      const existingAdmin = await User.findOne({ where: { username: adminUser.username } });
      if (existingAdmin) {
        console.log('Admin user already exists.');
      } else {
        console.log('Creating admin user...');
        await User.create(adminUser);
        console.log('Admin user created successfully.');
      }
    } else {
      console.log('No users found. Creating admin user...');
      await User.create(adminUser);
      console.log('Admin user created successfully.');
      
      // Create additional test users if in development mode
      if (process.env.ENVIRONMENT === 'DEV') {
        console.log('Creating test user in development mode...');
        await User.create({
          username: 'testuser',
          password: 'password123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user'
        });
        console.log('Test user created successfully.');
      }
    }
    
    console.log('Database setup completed successfully.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
};

// Run the setup
setupDatabase();
