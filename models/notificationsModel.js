const { DataTypes } = require('sequelize');
const db = require('../config/database')
const Cabang = require('./cabangModel.js');
const Transaksi = require('./transaksiModel');

const Notification = db.define('Notification',{
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    orderId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    transaksiUuid: {
        type: DataTypes.UUID,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'new_order'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
})

Notification.belongsTo(Transaksi, { foreignKey: 'transaksiUuid' });
Transaksi.hasOne(Notification, { foreignKey: 'transaksiUuid' });

Notification.belongsTo(Cabang, { foreignKey: 'cabangUuid' });
Cabang.hasMany(Notification, { foreignKey: 'cabangUuid' });

module.exports = Notification;