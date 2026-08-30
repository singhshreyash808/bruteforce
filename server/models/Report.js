const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reportId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: '📊',
  },
  reportType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'daily-risk',
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'HIGH PRIORITY',
  },
  priorityClass: {
    type: DataTypes.STRING,
    defaultValue: 'danger',
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  generatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  generatedBy: {
    type: DataTypes.STRING,
    defaultValue: 'Cyber Cell Intelligence Unit',
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  district: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  crimeCategory: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateFrom: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateTo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metrics: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  tableData: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  actionPlan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  statistics: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'READY',
  }
});

module.exports = Report;
