const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const PatrolUnit = sequelize.define('PatrolUnit', {
  unitCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // e.g. PATROL-001, PATROL-MH-012
  },
  vehicleNumber: {
    type: DataTypes.STRING,
    allowNull: false // e.g. MH-02-CP-1012
  },
  vehicleType: {
    type: DataTypes.STRING,
    defaultValue: 'Sector Quick-Response Van'
  },
  officerName: {
    type: DataTypes.STRING,
    allowNull: false // e.g. Insp. Rajesh Shinde
  },
  officerId: {
    type: DataTypes.STRING,
    allowNull: true // e.g. OFFICER-001
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false // e.g. +91 98201 12345
  },
  status: {
    type: DataTypes.STRING, // AVAILABLE, DISPATCHED, EN_ROUTE, ON_SCENE, COMPLETED, OFFLINE
    defaultValue: 'AVAILABLE'
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  district: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sector: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  assignedIncidentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  assignedDispatchId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = PatrolUnit;
