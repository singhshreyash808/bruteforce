const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const ATM = sequelize.define('ATM', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  operator: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  district: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  riskScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  riskLevel: {
    type: DataTypes.STRING,
    defaultValue: 'LOW',
  },
  nearbyComplaintCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'OpenStreetMap',
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = ATM;
