const express = require('express');
const {
    getOrderStatus,
    getUserOrders,
    getOrderDetails,
    createOrderStatusNotification
} = require('../controller/transaksiTrackingController');
const { verifyUser } = require('../middleware/userMiddleware');

const router = express.Router();

router.get('/status/:orderId', getOrderStatus);
router.get('/user', getUserOrders);
router.get('/details/:uuid', getOrderDetails);
router.post('/notification', verifyUser, createOrderStatusNotification);

module.exports = router;