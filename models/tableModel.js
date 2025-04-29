const Sequelize = require ('sequelize')
const db = require('../config/database')

const {DataTypes} = Sequelize

const Cabang = require('./cabangModel')

const Table = db.define('Table', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cabangUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
          model: Cabang,
          key: 'uuid',
      },
      onDelete: 'CASCADE', 
  },
  });
Cabang.hasMany(Table, { foreignKey: 'cabangUuid' });
Table.belongsTo(Cabang, { foreignKey: 'cabangUuid' });

module.exports = Table
