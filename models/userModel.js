const Sequelize = require('sequelize');
const db = require('../config/database.js')
const Cabang = require('./cabangModel.js')

const {DataTypes} = Sequelize

const User = db.define('User', {
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('superadmin', 'admin', 'kasir'),
    allowNull: false,
  },
  cabanguuid: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'users',
});

User.belongsTo(Cabang, { foreignKey: 'cabanguuid' });
Cabang.hasMany(User, { foreignKey: 'cabanguuid' });

module.exports = User;
