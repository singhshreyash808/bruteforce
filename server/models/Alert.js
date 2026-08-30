const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Alert = sequelize.define('Alert', {
  level: {
    type: DataTypes.ENUM('HIGH', 'CRITICAL', 'MEDIUM', 'LOW'),
    allowNull: false,
    defaultValue: 'MEDIUM'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  district: {
    type: DataTypes.STRING,
    allowNull: true
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50
  },
  timeWindow: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Acknowledged', 'Resolved'),
    allowNull: false,
    defaultValue: 'Active'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'UPI Fraud'
  },
  complaintId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'Alerts',
  timestamps: true
});

module.exports = Alert;
