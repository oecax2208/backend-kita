const Sequelize = require('sequelize');
const db = require('../config/database.js');
const Barang = require('./barangModel.js'); 
const Cabang = require('./cabangModel.js'); 
const { DataTypes } = Sequelize;

const BarangCabang = db.define('BarangCabang', {
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
  stok: {
    type: DataTypes.INTEGER,
    defaultValue: 0,  
  }
}, {
  timestamps: true,
  //tableName: 'barang_cabangs',
});


Barang.belongsToMany(Cabang, { through: BarangCabang, foreignKey: 'baranguuid' });
Cabang.belongsToMany(Barang, { through: BarangCabang, foreignKey: 'cabanguuid' });

module.exports = BarangCabang;
