const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Task = sequelize.define('Task', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assignedTo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  assignedBy: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "System Admin"
  },
  status: {
    type: DataTypes.ENUM("Pending", "In Progress", "Completed"),
    defaultValue: "Pending"
  },
  priority: {
    type: DataTypes.ENUM("Low", "Medium", "High", "Critical"),
    defaultValue: "Medium"
  },
  complaintId: {
    type: DataTypes.STRING,
    allowNull: true // Optional link to a specific cybercrime complaint
  }
});

module.exports = Task;
