const Transaksi = require('../models/transaksiModel')
const TransaksiDetail = require('../models/transaksiDetailModel')
const User = require('../models/userModel')
const Cabang = require('../models/cabangModel')
const Barang = require('../models/barangModel')
const BarangCabang = require('../models/BarangCabang')
const mutasiStok = require('../models/mutasiStokModel')
const moment = require('moment-timezone')
const Sequelize = require('sequelize')
const db = require('../config/database')
const {snap, coreApi} = require('../config/midtransConfig');
const jurnalAkutansi = require('../models/jurnalAkutansiModel')
const Table = require('../models/tableModel')
const Notification = require('../models/notificationsModel')

exports.sendNotificationToCashier = async ({ cabangUuid, message, orderId, transaksiUuid }) => {
    try {
        console.log(`Sending notification to cashiers at branch ${cabangUuid} for order ${orderId}`);
        
        if (!cabangUuid || !message || !orderId || !transaksiUuid) {
            throw new Error('Missing required notification parameters');
        }
        
        // Store notification in database instead of HTTP call
        await Notification.create({
            cabangUuid,
            message,
            orderId,
            transaksiUuid,
            type: 'new_order',
            read: false,
            timestamp: new Date()
        });
        
        // If you have a real-time feature (like Socket.IO), you can emit here
        if (global.io) {
            global.io.to(`branch:${cabangUuid}`).emit('new_order', {
                message,
                orderId,
                transaksiUuid,
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`Notification saved successfully for branch ${cabangUuid}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to save cashier notification:', error.message);
        // Don't let notification failure break the main transaction
        return { success: false, error: error.message };
    }
};