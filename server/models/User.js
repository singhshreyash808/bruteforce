const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('officer', 'citizen', 'bank', 'admin'),
    allowNull: false,
    defaultValue: 'officer'
  },
  badgeNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  policeStation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  branchCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  aadhaar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'Users',
  timestamps: true
});

module.exports = User;