const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Barang = require('./barangModel.js');
const Transaksi = require('./transaksiModel.js');
const Table = require('./tableModel.js')

const TransaksiDetail = sequelize.define('TransaksiDetail', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  transaksiuuid: { 
    type: DataTypes.UUID,
    allowNull: false,
    field: 'transaksiuuid',
  },
  baranguuid: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'baranguuid',
  },
  tableId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tableId',
  },
  jumlahbarang: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'jumlahbarang',
  },
  harga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  timestamps: true
});

// Relasi dengan Transaksi
TransaksiDetail.belongsTo(Transaksi, { foreignKey: 'transaksiuuid' });
Transaksi.hasMany(TransaksiDetail, { foreignKey: 'transaksiuuid' });

// Relasi dengan Barang
TransaksiDetail.belongsTo(Barang, { foreignKey: 'baranguuid' });
Barang.hasMany(TransaksiDetail, { foreignKey: 'baranguuid' });

// Relasi dengan Meja
TransaksiDetail.belongsTo(Table, { foreignKey: 'tableId' });
Table.hasMany(Transaksi, { foreignKey: 'tableId' });

module.exports = TransaksiDetail;
