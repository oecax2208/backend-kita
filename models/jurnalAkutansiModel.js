const { DataTypes } = require('sequelize');
const db = require('../config/database');
const Cabang = require('./cabangModel');
const Wearhouse = require('./wearhouseModel');
const Barang = require('./barangModel');
const Transaksi = require('./transaksiModel')

const JurnalAkuntansi = db.define('JurnalAkuntansi', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  cabanguuid: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Cabang,
      key: 'uuid',
    }
  },
  jenis_transaksi: {
    type: DataTypes.ENUM('pembelian', 'penjualan'),
    allowNull: false,
  },
  // referensi_uuid: { // Bisa transaksi atau pembelian
  //   type: DataTypes.UUID,
  //   allowNull: true,
  // },
  baranguuid: { 
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Barang,
      key: 'uuid',
    }
  },
  jumlah: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  harga_satuan: { // Harga per unit barang
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  total_harga: { // Total harga (jumlah * harga_satuan)
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  deskripsi: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  debit: { // Pengeluaran (pembelian)
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
  },
  kredit: { // Pemasukan (penjualan)
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
  },
  saldo: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  timestamps: true,
});

// Relasi ke Cabang
JurnalAkuntansi.belongsTo(Cabang, { foreignKey: 'cabanguuid' });
Cabang.hasMany(JurnalAkuntansi, { foreignKey: 'cabanguuid' });

//relasi transaksi
// JurnalAkuntansi.belongsTo(Transaksi, { foreignKey: 'transaksiuuid' });
// Transaksi.hasMany(JurnalAkuntansi, { foreignKey: 'transaksiuuid' });

// Relasi ke Barang
JurnalAkuntansi.belongsTo(Barang, { foreignKey: 'baranguuid' });
Barang.hasMany(JurnalAkuntansi, { foreignKey: 'baranguuid' });

JurnalAkuntansi.afterCreate(async (jurnal, options) => {
  if (jurnal.jenis_transaksi === 'pembelian' && jurnal.baranguuid && jurnal.jumlah) {
    const barang = await Barang.findByPk(jurnal.baranguuid);
    if (barang) {

      const wearhouse = await Wearhouse.findOne({ where: { baranguuid: barang.uuid } });
      if (wearhouse) {
        wearhouse.stok += jurnal.jumlah;
        await wearhouse.save();
      } else {
        await Wearhouse.create({ baranguuid: barang.uuid, stok: jurnal.jumlah });
      }
    }
  }
});

module.exports = JurnalAkuntansi;
