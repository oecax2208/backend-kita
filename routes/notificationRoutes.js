const express = require('express')
const {
    acceptTableOrder,
    
} = require('../controller/transaksiMejaCabangController')
const {sendNotificationToCashier} = require('../controller/notificationController')
const router = express.Router()

//router.post('/sendkasir',sendNotificationToCashier)
// router.get('/getnotifikasi',handleTableTransactionNotification)

module.exports = router;