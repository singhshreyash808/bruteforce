const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Notification = sequelize.define('Notification', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM("Alert", "Info", "Warning", "Success"),
    defaultValue: "Info"
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  userId: {
    type: DataTypes.STRING, // e.g. "Inspector Ramesh", to whom the notification belongs
    allowNull: true
  },
  link: {
    type: DataTypes.STRING, // Optional URL to redirect to
    allowNull: true
  }
});

module.exports = Notification;
