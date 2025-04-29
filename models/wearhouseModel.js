const { DataTypes } = require('sequelize');
const db = require('../config/database');
const Barang = require('./barangModel');

const Wearhouse = db.define('Wearhouse', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  baranguuid: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Barang,
      key: 'uuid',
    },
  },
  stok_gudang: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
}, {
  timestamps: true,
});

Wearhouse.belongsTo(Barang, { foreignKey: 'baranguuid' });
Barang.hasOne(Wearhouse, { foreignKey: 'baranguuid' });

module.exports = Wearhouse;
