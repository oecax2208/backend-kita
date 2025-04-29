const { DataTypes } = require('sequelize');
const db = require('../config/database');
const Barang = require('./barangModel');
const Cabang = require('./cabangModel');

const mutasiStok = db.define('mutasiStok', {
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
  cabanguuid: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Cabang,
      key: 'uuid',
    },
  },
  jenis_mutasi: {
    type: DataTypes.ENUM('masuk', 'keluar', 'transfer', 'penyesuaian'),
    allowNull: false,
  },
  jumlah: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  keterangan: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  //tableName: 'mutasi_stoks',
});

// Menetapkan relasi
mutasiStok.belongsTo(Barang, { foreignKey: 'baranguuid' });
mutasiStok.belongsTo(Cabang, { foreignKey: 'cabanguuid' });
Barang.hasMany(mutasiStok, { foreignKey: 'baranguuid' });
Cabang.hasMany(mutasiStok, { foreignKey: 'cabanguuid' });

module.exports = mutasiStok;
