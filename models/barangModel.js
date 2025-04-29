const Sequelize = require('sequelize');
const db = require('../config/database.js')
const Kategori = require('./kategoriModel.js')

const {DataTypes} = Sequelize

const Barang = db.define('Barang', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  namabarang: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  harga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  kategoriuuid: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  foto: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'barangs',
});

Barang.belongsTo(Kategori, { foreignKey: 'kategoriuuid' });
Kategori.hasMany(Barang, { foreignKey: 'kategoriuuid' });

module.exports = Barang;
