const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AuditLog = sequelize.define('AuditLog', {
  userId: {
    type: DataTypes.STRING, // User who performed the action
    allowNull: false
  },
  action: {
    type: DataTypes.STRING, // e.g., "User Login", "Update Case Status", "Delete Document"
    allowNull: false
  },
  entityId: {
    type: DataTypes.STRING, // ID of the affected record, if any
    allowNull: true
  },
  entityType: {
    type: DataTypes.STRING, // e.g., "Complaint", "Task", "Document"
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT, // Optional additional details (can be JSON string)
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING, // Optional IP address of the user
    allowNull: true
  }
});

module.exports = AuditLog;
