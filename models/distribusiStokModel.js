const { DataTypes } = require('sequelize');
const db = require('../config/database');
const Barang = require('./barangModel');
const Cabang = require('./cabangModel');

const distribusiStok = db.define('distribusiStok', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  baranguuid: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'barangs',
      key: 'uuid',
    }
  },
  cabanguuid: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cabangs',
      key: 'uuid',
    }
  },
  jumlah: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'dikirim', 'diterima'),
    defaultValue: 'pending',
  },
}, {
  timestamps: true,
 // tableName: 'distribusi_stoks',
});

distribusiStok.belongsTo(Barang, { foreignKey: 'baranguuid' });
distribusiStok.belongsTo(Cabang, { foreignKey: 'cabanguuid' });

module.exports = distribusiStok;
