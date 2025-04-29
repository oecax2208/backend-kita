const Sequelize = require('sequelize');
const db = require('../config/database');

const {DataTypes} = Sequelize
const Kategori = db.define('Kategori', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  namakategori: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'kategoris',
});

module.exports = Kategori;
