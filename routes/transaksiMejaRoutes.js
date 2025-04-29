const express = require('express');
const {
    createTableTransaction,
    // handleTableTransactionNotification,
    acceptTableOrder,
    getPendingTableOrders,
    getCashierNotifications,
    markNotificationsAsRead,
    pollForNewOrders,
    getDetails,
    getDetailsById,
  //  kurangiStokTransaksi
} = require('../controller/transaksiMejaCabangController');
const {verifyUser} = require('../middleware/userMiddleware');
const router = express.Router();

//router.post('/kurangi-stok-transaksi/:transaksiUuid',kurangiStokTransaksi);
router.post('/createtransaksimejacabang', createTableTransaction);
// router.post('/notification', handleTableTransactionNotification);
router.post('/acceptorder', verifyUser, acceptTableOrder);
router.get('/getpendingorder', verifyUser, getPendingTableOrders);
router.get('/notifications', verifyUser, getCashierNotifications);
router.post('/notifications/read', verifyUser, markNotificationsAsRead);
router.get('/poll', verifyUser, pollForNewOrders);  
router.get('/getdetails', verifyUser, getDetails);  
router.get('/getdetails/:id', verifyUser, getDetailsById); 

module.exports = router;