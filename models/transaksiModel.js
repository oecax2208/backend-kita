const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./userModel.js');
const Barang = require('./barangModel.js');
//const JurnalAkuntansi = require('./jurnalAkutansiModel.js')
const Table = require('./tableModel.js')

const Transaksi = sequelize.define('Transaksi', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  barangUuid: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  order_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  totaljual: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  useruuid: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tanggal: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  status_pembayaran:{
    type: DataTypes.ENUM('pending', 'settlement', 'capture', 'deny', 'cancel', 'expire'),
    allowNull: true
  },
  pembayaran: {
    type: DataTypes.ENUM('qris', 'cash'),
    allowNull: false,
  },
  oredermeja: {
    type: DataTypes.ENUM('true', 'false'),
    allowNull: true,
  },
  cashier_accepted: {
    type: DataTypes.ENUM('false', 'true','auto'),
    allowNull: true,
  },
  waiting_confirmation:{
    type: DataTypes.ENUM('false', 'true'),
    allowNull: true,
  },
  tableId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tableId',
  },
}, {
  timestamps: true,
  tableName: 'transaksis',
});

// Relasi dengan User
Transaksi.belongsTo(User, { foreignKey: 'useruuid' });
User.hasMany(Transaksi, { foreignKey: 'useruuid' });

// Relasi dengan Barang
Transaksi.belongsTo(Barang, { foreignKey: 'barangUuid' });
Barang.hasMany(Transaksi, { foreignKey: 'barangUuid' });

Transaksi.belongsTo(Table, { foreignKey: 'tableId' });
Table.hasMany(Transaksi, { foreignKey: 'tableId' });

// Transaksi.afterUpdate(async (transaksi, options) => {
//   if (transaksi.status_pembayaran === 'settlement' && transaksi.changed('status_pembayaran')) {
//     const existingJurnal = await JurnalAkuntansi.findOne({
//       where: {
//         deskripsi: { [Op.like]: `%${transaksi.order_id}%` }
//       }
//     });
    
//     if (!existingJurnal) {
//       await JurnalAkuntansi.create({
//         cabanguuid: transaksi.User.cabanguuid,
//         jenis_transaksi: 'penjualan',
//         deskripsi: `Penjualan dengan order ID: ${transaksi.order_id}`,
//         kredit: transaksi.totaljual,
//         debit: 0,

//       });
//     }
//   }
// });

module.exports = Transaksi;
