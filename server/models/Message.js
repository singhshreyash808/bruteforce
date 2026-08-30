const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Message = sequelize.define('Message', {
  senderId: {
    type: DataTypes.STRING, // Who sent it
    allowNull: false
  },
  receiverId: {
    type: DataTypes.STRING, // Who it is for (could be a user ID or role like 'Admin')
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  caseId: {
    type: DataTypes.STRING, // Optional context if message is related to a case
    allowNull: true
  }
});

module.exports = Message;
