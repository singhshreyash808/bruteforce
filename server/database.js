const { Sequelize } = require('sequelize');
const path = require('path');

// Set up SQLite database with absolute path
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false // Disable logging to keep console clean
});

module.exports = sequelize;
