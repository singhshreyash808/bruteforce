const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Dispatch = sequelize.define('Dispatch', {
  dispatchId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // e.g. DSP-2026-000101
  },
  incidentId: {
    type: DataTypes.STRING,
    allowNull: false // e.g. CC-2026-0001
  },
  predictionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hotspotLocation: {
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
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  riskLevel: {
    type: DataTypes.STRING,
    defaultValue: 'HIGH'
  },
  threatScore: {
    type: DataTypes.INTEGER,
    defaultValue: 85
  },
  crimeCategory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  patrolUnitId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehicleNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  officerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  officerPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dispatchedBy: {
    type: DataTypes.STRING,
    defaultValue: 'OFFICER-001'
  },
  dispatchStatus: {
    type: DataTypes.STRING, // PENDING, DISPATCHED, ACCEPTED, EN_ROUTE, ON_SCENE, COMPLETED, CANCELLED
    defaultValue: 'DISPATCHED'
  },
  distanceKm: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  estimatedEtaMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  patrolStartLat: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  patrolStartLng: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  dispatchedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  arrivedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Dispatch;
