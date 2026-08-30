const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const PasswordReset = sequelize.define('PasswordReset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  method: {
    type: DataTypes.ENUM('email', 'phone'),
    allowNull: false
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  otpHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetAuthToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'PasswordResets',
  timestamps: true
});

module.exports = PasswordReset;