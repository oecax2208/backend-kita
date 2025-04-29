const Barang = require('./barangModel')
const Cabang = require('./cabangModel')
const BarangCabang = require('./BarangCabang')
const Kategori = require('./kategoriModel')

const setupAssociations = () => {
    // Barang - Kategori
    Barang.belongsTo(Kategori, { foreignKey: 'kategoriuuid' });
    Kategori.hasMany(Barang, { foreignKey: 'kategoriuuid' });
  
    // BarangCabang - Barang
    BarangCabang.belongsTo(Barang, { 
      foreignKey: 'baranguuid',
      targetKey: 'uuid'
    });
    Barang.hasMany(BarangCabang, { 
      foreignKey: 'baranguuid',
      sourceKey: 'uuid'
    });
  
    // BarangCabang - Cabang
    BarangCabang.belongsTo(Cabang, { 
      foreignKey: 'cabanguuid',
      targetKey: 'uuid'
    });
    Cabang.hasMany(BarangCabang, { 
      foreignKey: 'cabanguuid',
      sourceKey: 'uuid'
    });
  };
  
  module.exports = { setupAssociations };