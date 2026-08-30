const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Complaint = sequelize.define('Complaint', {
  complaintId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
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
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  time: {
    type: DataTypes.STRING,
    allowNull: false
  },
  victimBank: {
    type: DataTypes.STRING,
    allowNull: false
  },
  suspectMule: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Prediction Data stored as JSON
  predictionData: {
    type: DataTypes.JSON,
    allowNull: true
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  isDemoData: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'DEMO_SEED'
  }
});

module.exports = Complaint;
