const Transaksi = require('../models/transaksiModel');
const TransaksiDetail = require('../models/transaksiDetailModel');
const Barang = require('../models/barangModel');
const User = require('../models/userModel');
const Cabang = require('../models/cabangModel');
const Table = require('../models/tableModel');
const Notification = require('../models/notificationsModel');
const Kategori = require('../models/kategoriModel');
const { Op } = require('sequelize');

// Get the status of an order by its ID
exports.getOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        if (!orderId) {
            return res.status(400).json({
                status: false,
                message: "Order ID diperlukan"
            });
        }

        const order = await Transaksi.findOne({
            where: { order_id: orderId },
            attributes: [
                'uuid', 'order_id', 'totaljual', 'pembayaran', 
                'status_pembayaran', 'tanggal', 'cashier_accepted', 
                'waiting_confirmation', 'oredermeja', 'tableId'
            ],
            include: [
                {
                    model: User,
                    attributes: ['username'],
                    include: [
                        {
                            model: Cabang,
                            attributes: ['namacabang']
                        }
                    ]
                },
                {
                    model: Table,
                    attributes: ['name']
                },
                {
                    model: TransaksiDetail,
                    attributes: ['jumlahbarang', 'harga', 'total'],
                    include: [
                        {
                            model: Barang,
                            attributes: ['namabarang', 'kategoriuuid'],
                            include: [
                                {
                                    model: Kategori,
                                    attributes: ['namakategori']
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Pesanan tidak ditemukan"
            });
        }

        const statusInfo = {
            paid: order.status_pembayaran === 'settlement' || order.status_pembayaran === 'capture',
            accepted: order.cashier_accepted === 'true',
            processing: order.cashier_accepted === 'true' && order.waiting_confirmation === 'false',
            waiting: order.waiting_confirmation === 'true'
        };

        return res.status(200).json({
            status: true,
            data: {
                orderDetails: order,
                statusInfo: statusInfo,
                statusMessage: getStatusMessage(statusInfo),
                estimatedTime: getEstimatedTime(statusInfo)
            }
        });

    } catch (error) {
        console.error('Error fetching order status:', error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

// Get all orders for a specific user
exports.getUserOrders = async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({
                status: false,
                message: "Email diperlukan untuk mencari pesanan"
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Find transactions by searching for the email in the order_id
        const orders = await Transaksi.findAndCountAll({
            where: {
                order_id: {
                    [Op.like]: `%${email}%`
                }
            },
            attributes: [
                'uuid', 'order_id', 'totaljual', 'pembayaran', 
                'status_pembayaran', 'tanggal', 'cashier_accepted', 
                'waiting_confirmation', 'tableId'
            ],
            include: [
                {
                    model: User,
                    attributes: ['username'],
                    include: [
                        {
                            model: Cabang,
                            attributes: ['namacabang']
                        }
                    ]
                },
                {
                    model: Table,
                    attributes: ['name']
                }
            ],
            limit: limit,
            offset: offset,
            order: [['tanggal', 'DESC']]
        });

        const totalPages = Math.ceil(orders.count / limit);

        return res.status(200).json({
            status: true,
            data: orders.rows,
            pagination: {
                totalItems: orders.count,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching user orders:', error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

// Get detailed information about a specific order
exports.getOrderDetails = async (req, res) => {
    try {
        const { uuid } = req.params;
        
        if (!uuid) {
            return res.status(400).json({
                status: false,
                message: "UUID pesanan diperlukan"
            });
        }

        const order = await Transaksi.findOne({
            where: { uuid: uuid },
            attributes: [
                'uuid', 'order_id', 'totaljual', 'pembayaran', 
                'status_pembayaran', 'tanggal', 'cashier_accepted', 
                'waiting_confirmation', 'tableId'
            ],
            include: [
                {
                    model: User,
                    attributes: ['username'],
                    include: [
                        {
                            model: Cabang,
                            attributes: ['uuid', 'namacabang']
                        }
                    ]
                },
                {
                    model: Table,
                    attributes: ['name']
                },
                {
                    model: TransaksiDetail,
                    attributes: ['uuid', 'jumlahbarang', 'harga', 'total'],
                    include: [
                        {
                            model: Barang,
                            attributes: ['uuid', 'namabarang', 'kategoriuuid'],
                            include: [
                                {
                                    model: Kategori,
                                    attributes: ['uuid', 'namakategori']
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Pesanan tidak ditemukan"
            });
        }

        // Get the status history for this order
        const statusHistory = await getOrderStatusHistory(uuid);

        const statusInfo = {
            paid: order.status_pembayaran === 'settlement' || order.status_pembayaran === 'capture',
            accepted: order.cashier_accepted === 'true',
            processing: order.cashier_accepted === 'true' && order.waiting_confirmation === 'false',
            waiting: order.waiting_confirmation === 'true'
        };

        return res.status(200).json({
            status: true,
            data: {
                orderDetails: order,
                statusInfo: statusInfo,
                statusMessage: getStatusMessage(statusInfo),
                estimatedTime: getEstimatedTime(statusInfo),
                statusHistory: statusHistory
            }
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

// Helper function to get status history from notifications
async function getOrderStatusHistory(transaksiUuid) {
    try {
        const notifications = await Notification.findAll({
            where: { transaksiUuid: transaksiUuid },
            attributes: ['message', 'type', 'timestamp'],
            order: [['timestamp', 'ASC']]
        });

        return notifications.map(notification => ({
            message: notification.message,
            type: notification.type,
            timestamp: notification.timestamp
        }));
    } catch (error) {
        console.error('Error getting status history:', error);
        return [];
    }
}

// Helper function to get a human-readable status message
function getStatusMessage(statusInfo) {
    if (!statusInfo.paid) {
        return "Menunggu pembayaran";
    } else if (statusInfo.waiting) {
        return "Pembayaran berhasil, menunggu konfirmasi kasir";
    } else if (statusInfo.accepted && statusInfo.processing) {
        return "Pesanan diterima dan sedang diproses";
    } else if (statusInfo.accepted) {
        return "Pesanan sudah diterima oleh kasir";
    } else {
        return "Status tidak diketahui";
    }
}

// Helper function to get estimated time based on status
function getEstimatedTime(statusInfo) {
    if (!statusInfo.paid) {
        return null;
    } else if (statusInfo.waiting) {
        return "5-10 menit";
    } else if (statusInfo.accepted && statusInfo.processing) {
        return "10-15 menit";
    } else if (statusInfo.accepted) {
        return "15-20 menit";
    } else {
        return null;
    }
}

// Create a new notification for order status changes
exports.createOrderStatusNotification = async (req, res) => {
    try {
        const { transaksiUuid, message, type } = req.body;
        
        if (!transaksiUuid || !message || !type) {
            return res.status(400).json({
                status: false,
                message: "Data tidak lengkap untuk membuat notifikasi"
            });
        }

        const transaction = await Transaksi.findOne({
            where: { uuid: transaksiUuid },
            include: [{ model: User, include: [{ model: Cabang }] }]
        });

        if (!transaction) {
            return res.status(404).json({
                status: false,
                message: "Transaksi tidak ditemukan"
            });
        }

        const notification = await Notification.create({
            cabangUuid: transaction.User.Cabang.uuid,
            message: message,
            orderId: transaction.order_id,
            transaksiUuid: transaksiUuid,
            type: type,
            read: false,
            timestamp: new Date()
        });

        return res.status(201).json({
            status: true,
            message: "Notifikasi status pesanan berhasil dibuat",
            data: notification
        });

    } catch (error) {
        console.error('Error creating order status notification:', error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};