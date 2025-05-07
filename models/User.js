const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../db/connection');

// Make sure we're using the exact case of the table name that exists in the database
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    },
    set(value) {
      this.setDataValue('username', value.toLowerCase());
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      // Hash password before saving
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      // Hash password if changed during update
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  },
  // Important: Set the tableName to match what's in your database (case sensitive)
  tableName: 'users', // Using lowercase 'users' to match database
  freezeTableName: true,
  timestamps: true
});

// Instance method to compare password
User.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Add a diagnostic function to the model
User.findAllUsers = async function() {
  try {
    // Determine the actual table name based on database inspection
    const [tablesResult] = await sequelize.query(
      "SHOW TABLES LIKE 'users'"
    );
    
    const tableExists = tablesResult.length > 0;
    
    if (!tableExists) {
      console.log('Users table does not exist in database');
      return [];
    }
    
    // Use the correct table name for the query - include name and email fields
    const [results] = await sequelize.query('SELECT id, username, name, email, role, isActive FROM users');
    console.log('Direct SQL query found', results.length, 'users');
    return results;
  } catch (error) {
    console.error('Error with direct SQL query:', error);
    return [];
  }
};

module.exports = User;
