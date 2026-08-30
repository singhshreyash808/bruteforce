const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Document = sequelize.define('Document', {
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mimetype: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  uploadedBy: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Inspector Ramesh"
  },
  linkedCaseId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Document;
