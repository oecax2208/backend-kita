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
const Kategori = require('../models/kategoriModel')
const {Op}= require('sequelize')

exports.getDetails = async (req, res) => {
    try {
        const cabangUuid = req.user?.cabanguuid;
        if (!cabangUuid) {
            return res.status(403).json({ success: false, message: "Cabang tidak ditemukan untuk user ini" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const totalCount = await Notification.count({
            include: [
                {
                    model: Transaksi,
                    where: { status_pembayaran: 'settlement' },
                    include: [
                        {
                            model: User,
                            where: { cabanguuid: cabangUuid }
                        }
                    ]
                }
            ]
        });

        const transaksiDataTable = await Notification.findAll({
            include: [
                {
                    model: Transaksi,
                    attributes: ['uuid', 'barangUuid', 'order_id', 'totaljual', 'useruuid', 'status_pembayaran', 'tableId'],
                    where: { status_pembayaran: 'settlement' },
                    include: [
                        {
                            model: User,
                            attributes: ['uuid', 'username', 'cabanguuid', 'role'],
                            where: { cabanguuid: cabangUuid }, 
                            include: [
                                {
                                    model: Cabang,
                                    attributes: ['uuid', 'namacabang']
                                }
                            ]
                        },
                    ]
                }
            ],
            limit: limit,
            offset: offset,
            order: [['timestamp', 'DESC']]
        });

        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({
            success: true,
            data: transaksiDataTable,
            pagination: {
                totalItems: totalCount,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching transaction notifications:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error });
    }
};

exports.getDetailsById = async (req, res) => {
    try {
        const { id } = req.params;
        const cabangUuid = req.user?.cabanguuid;

        if (!cabangUuid) {
            return res.status(403).json({ success: false, message: "Cabang tidak ditemukan untuk user ini" });
        }
      

        const transaksiDataTable = await Notification.findOne({
            where: { id },
            include: [
                {
                    model: Transaksi,
                    attributes: [
                        'uuid', 'barangUuid', 'order_id', 'totaljual', 'useruuid', 
                        'status_pembayaran', 'pembayaran', 'tableId'
                    ],
                    where: { status_pembayaran: 'settlement' },
                    include: [
                        {
                            model: User,
                            attributes: ['uuid', 'username', 'cabanguuid', 'role'],
                            where: { cabanguuid: cabangUuid },
                            include: [
                                {
                                    model: Cabang,
                                    attributes: ['uuid', 'namacabang']
                                }
                            ]
                        },
                        {
                            model: TransaksiDetail,
                            attributes: ['uuid', 'baranguuid', 'jumlahbarang', 'harga', 'total','transaksiuuid'],
                            include: [
                                {
                                    model: Barang,
                                    attributes: ['uuid', 'namabarang', 'kategoriuuid'],
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        if (!transaksiDataTable) {
            return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan atau tidak memiliki akses" });
        }

        res.status(200).json({ success: true, data: transaksiDataTable });
    } catch (error) {
        console.error('Error fetching transaction notifications:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error });
    }
};



const sendNotificationToCashier = async ({ cabangUuid, message, orderId, transaksiUuid }) => {
    try {
        console.log(`Sending notification to cashiers at branch ${cabangUuid} for order ${orderId}`);
        
        if (!cabangUuid || !message || !orderId || !transaksiUuid) {
            throw new Error('Missing required notification parameters');
        }
        
        // Create notification in database
        const notification = await Notification.create({
            cabangUuid,
            message,
            orderId,
            transaksiUuid,
            type: 'new_order',
            read: false,
            timestamp: new Date()
        });
        
        console.log(`Notification saved successfully for branch ${cabangUuid}, ID: ${notification.id}`);
        return { success: true, notification };
    } catch (error) {
        console.error('Failed to save cashier notification:', error.message);
        return { success: false, error: error.message };
    }
};
exports.getCashierNotifications = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user || user.role !== 'kasir') {
            return res.status(403).json({
                status: false,
                message: "Anda tidak memiliki akses untuk melihat notifikasi"
            });
        }
        const notifications = await Notification.findAll({
            where: { 
                cabangUuid: user.cabanguuid,
                read: false,
                type: 'new_order'
            },include:[
                {
                    model: Transaksi,
                    attributes:['uuid','baranguuid','order_id','totaljual','tanggal','status_pembayaran','pembayaran','cashier_accepted','waiting_confirmation','tableId'],

                    where: {
                        // status_pembayaran: { [Op.ne]: 'pending' } 
                        status_pembayaran: 'settlement'
                    },
                    include:[
                        {
                            model: Table,
                            attributes: ['id','name']
                        }
                    ],
                    include:[
                        {
                            model: TransaksiDetail,
                            attributes:['uuid','transaksiUuid','barangUuid','jumlahbarang','harga'],
                            include:[
                                {
                                    model: Barang,
                                    attributes:['uuid','namabarang','harga','kategoriuuid','foto'],
                                    include:[{
                                        model: Kategori,
                                        attributes: ['uuid', 'namakategori']
                                    }]
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [['timestamp', 'DESC']]
        });
        
        return res.status(200).json({
            status: true,
            data: notifications
        });
        
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};
exports.markNotificationsAsRead = async (req, res) => {
    try {
        const { notificationIds } = req.body;
        const user = req.user;
        
        if (!user || user.role !== 'kasir') {
            return res.status(403).json({
                status: false,
                message: "Anda tidak memiliki akses untuk memperbarui notifikasi"
            });
        }
        
        if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({
                status: false,
                message: "Mohon sertakan UUID notifikasi yang valid"
            });
        }
        
        // Mark notifications as read using UUIDs
        const result = await Notification.update(
            { read: true },
            { 
                where: { 
                    id: notificationIds,  // Changed from id to uuid
                    cabangUuid: user.cabanguuid
                }
            }
        );
        
        return res.status(200).json({
            status: true,
            message: "Notifikasi berhasil diperbarui",
            updatedCount: result[0]
        });
        
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};
exports.pollForNewOrders = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user || user.role !== 'kasir') {
            return res.status(403).json({
                status: false,
                message: "Anda tidak memiliki akses untuk polling notifikasi"
            });
        }
        
        const lastPollTime = req.query.lastPollTime || 
            new Date(Date.now() - 5 * 60000).toISOString();
    
        const newNotifications = await Notification.findAll({
            where: { 
                cabangUuid: user.cabanguuid,
                read: false,
                timestamp: {
                    [Sequelize.Op.gt]: new Date(lastPollTime)
                }
            },
            order: [['timestamp', 'DESC']]
        });
        
        // Get pending orders that need attention
        const pendingOrders = await Transaksi.findAll({
            where: { 
                status_pembayaran: 'settlement',
                cashier_accepted: 'false',
                waiting_confirmation: true
            },
            include: [
                { model: Table },
                { 
                    model: TransaksiDetail, 
                    include: [{ model: Barang }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        
        return res.status(200).json({
            status: true,
            currentTime: new Date().toISOString(),
            data: {
                notifications: newNotifications,
                pendingOrders: pendingOrders
            }
        });
        
    } catch (error) {
        console.error('Error polling for new orders:', error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};
exports.createTableTransaction = async (req, res) => {
    // Add debugging for request body
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Content-Type:", req.headers['content-type']);
    
    // Check if the body is empty or undefined
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
            status: false,
            message: "Request body kosong atau tidak valid",
        });
    }
    
    const t = await db.transaction();

    try {
        const { pembayaran, items, tableId, cabangUuid, userName, email } = req.body;
        console.log("Parsed values:", {
            pembayaran, 
            tableId, 
            cabangUuid, 
            userName, 
            email,
            itemsExists: !!items,
            itemsIsArray: Array.isArray(items),
            itemsLength: items ? items.length : 0
        });
        
        if (!userName || !email || !tableId || !cabangUuid || !pembayaran || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                status: false,
                message: "Data tidak lengkap atau format tidak sesuai",
                missingFields: {
                    userName: !userName,
                    email: !email,
                    tableId: !tableId,
                    cabangUuid: !cabangUuid, 
                    pembayaran: !pembayaran,
                    items: !items,
                    itemsNotArray: !Array.isArray(items),
                    itemsEmpty: Array.isArray(items) && items.length === 0
                }
            });
        }
        const table = await Table.findOne({
            where: { id: tableId, cabangUuid },
            transaction: t
        });

        if (!table) {
            await t.rollback();
            return res.status(404).json({
                status: false,
                message: "Meja tidak ditemukan di cabang ini",
            });
        }
        const barangUuids = items.map(item => item.baranguuid);
        const availableProducts = await BarangCabang.findAll({
            where: { cabanguuid: cabangUuid, baranguuid: barangUuids },
            include: [{ model: Barang, attributes: ['uuid', 'namabarang', 'harga','kategoriuuid'],
                include: [{
                    model: Kategori,
                    attributes: ['uuid', 'namakategori']
                }]
             }],
            transaction: t
        });

        console.log(`Found ${availableProducts.length} products of ${barangUuids.length} requested`);
        
        if (availableProducts.length !== barangUuids.length) {
            await t.rollback();
            return res.status(400).json({
                status: false,
                message: "Beberapa barang tidak tersedia di cabang ini",
                available: availableProducts.map(p => p.baranguuid),
                requested: barangUuids
            });
        }

        let totaljual = 0;
        const barangMap = new Map();

        availableProducts.forEach(barangCabang => {
            barangMap.set(barangCabang.baranguuid, {
                ...barangCabang.Barang.get(),
                stok: barangCabang.stok
            });
        });

        try {
            const validatedItems = items.map(item => {
                const barang = barangMap.get(item.baranguuid);
                if (!barang) {
                    throw new Error(`Barang dengan UUID ${item.baranguuid} tidak ditemukan`);
                }

                if (item.jumlahbarang > barang.stok) {
                    throw new Error(`Stok tidak mencukupi untuk barang: ${barang.namabarang}`);
                }

                const total = parseFloat(barang.harga) * item.jumlahbarang;
                totaljual += total;

                return { ...item, harga: barang.harga, total };
            });
            const kasir = await User.findOne({
                where: { cabanguuid: cabangUuid, role: 'kasir' },
                transaction: t
            });

            if (!kasir) {
                await t.rollback();
                return res.status(404).json({
                    status: false,
                    message: "Tidak ada akun kasir di cabang ini",
                });
            }

            const orderId = `TABLE-${table.name}-${new Date().getTime()}-Cuostumer: ${userName}`;
            let status_pembayaran = 'pending';
            
            const transaksi = await Transaksi.create({
                order_id: orderId,
                useruuid: kasir.uuid,
                cabanguuid: cabangUuid,
                tableId,
                totaljual,
                pembayaran,
                status_pembayaran: status_pembayaran,
                oredermeja: true,
                tanggal: new Date(),
                cashier_accepted: 'false',
                waiting_confirmation: true
            }, { transaction: t });
            
            await Promise.all(validatedItems.map(async (item) => {
                await TransaksiDetail.create({
                    transaksiuuid: transaksi.uuid,
                    baranguuid: item.baranguuid,
                    jumlahbarang: item.jumlahbarang,
                    harga: item.harga,
                    total: item.total,
                }, { transaction: t });
            }));
            
            const parameter = {
                transaction_details: {
                    order_id: orderId,
                    gross_amount: parseInt(totaljual)
                },
                item_details: validatedItems.map(item => ({
                    id: item.baranguuid,
                    price: parseInt(item.harga),
                    quantity: parseInt(item.jumlahbarang),
                    name: barangMap.get(item.baranguuid).namabarang
                })),
                customer_details: {
                    first_name: `Guest ${userName}, at Table ${table.name}`,
                    email: email
                }
            };

            console.log("Sending to Midtrans:", JSON.stringify(parameter, null, 2));
            
            const midtransResponse = await snap.createTransaction(parameter);
            if (midtransResponse.transaction_status) {
                status_pembayaran = midtransResponse.transaction_status;
                
                await Transaksi.update(
                    { status_pembayaran: status_pembayaran },
                    { where: { uuid: transaksi.uuid }, transaction: t }
                );
            }
            try {
                await t.commit();
                console.log("Transaksi berhasil disimpan dengan UUID:", transaksi.uuid);
            
                await sendNotificationToCashier({
                    cabangUuid,
                    message: `Pesanan baru dari ${table.name} atas nama ${userName} menunggu konfirmasi`,
                    orderId,
                    transaksiUuid: transaksi.uuid,
                    status: 'pending'
                });
                await Notification.create({
                    cabanguuid: cabangUuid,
                    message: `Pesanan baru dari ${table.name} menunggu konfirmasi`,
                    orderId,
                    transaksiUuid: transaksi.uuid,
                    status: 'unread',
                    type: 'new_order'
                });
                
                console.log("Notifikasi berhasil disimpan");
                schedulePaymentStatusCheck(transaksi.uuid, orderId, cabangUuid, table.name);
                
                return res.status(201).json({
                    status: true,
                    message: "Pesanan berhasil dibuat",
                    data: {
                        transaksi: {
                            ...transaksi.toJSON(),
                            details: validatedItems,
                            table: table.name
                        },
                        payment: {
                            redirect_url: midtransResponse.redirect_url,
                            token: midtransResponse.token
                        }
                    },
                });
            } catch (notifError) {
                console.error("Error saat mengirim notifikasi:", notifError);
                return res.status(201).json({
                    status: true,
                    message: "Pesanan berhasil dibuat, tetapi gagal mengirim notifikasi",
                    error: notifError.message,
                    data: {
                        transaksi: {
                            ...transaksi.toJSON(),
                            details: validatedItems,
                            table: table.name
                        },
                        payment: {
                            redirect_url: midtransResponse.redirect_url,
                            token: midtransResponse.token
                        }
                    },
                });
            }
        } catch (validationError) {
            await t.rollback();
            return res.status(400).json({
                status: false,
                message: validationError.message,
            });
        }
    } catch (error) {
        await t.rollback();
        console.error("Transaction Error:", error);
        return res.status(500).json({
            status: false,
            message: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
};


const schedulePaymentStatusCheck = async (transaksiUuid, orderId, cabangUuid, tableName) => {
    try {
        const checkTransaksi = await Transaksi.findOne({
            where: { uuid: transaksiUuid }
        });
        
        if (!checkTransaksi) {
            console.error(`Transaksi dengan UUID ${transaksiUuid} tidak ditemukan`);
            return;
        }
        
        const checkPaymentStatus = async () => {
            try {
                const statusResponse = await snap.transaction.status(orderId);
                
                const transaksi = await Transaksi.findOne({
                    where: { uuid: transaksiUuid }
                });
                
                if (!transaksi) {
                    console.error(`Transaksi dengan UUID ${transaksiUuid} tidak ditemukan`);
                    return;
                }
                if (statusResponse && statusResponse.transaction_status) {
                    const newStatus = statusResponse.transaction_status;
                    if (transaksi.status_pembayaran === newStatus) {
                        console.log(`Status pembayaran untuk order ${orderId} masih ${newStatus}`);
                        return;
                    }
                    await Transaksi.update(
                        { status_pembayaran: newStatus },
                        { where: { uuid: transaksiUuid } }
                    );
                    
                    console.log(`Status pembayaran untuk order ${orderId} diupdate menjadi ${newStatus}`);
                    
                    if (newStatus === 'settlement') {
                        try {
                            await sendNotificationToCashier({
                                cabangUuid,
                                message: `Pesanan dari Meja ${tableName} telah dibayar`,
                                orderId,
                                transaksiUuid,
                                status: 'paid'
                            });
                            await Notification.create({
                                cabanguuid: cabangUuid,
                                message: `Pesanan dari Meja ${tableName} telah dibayar`,
                                orderId,
                                transaksiuuid: transaksiUuid,
                                status: 'unread',
                                type: 'payment_success'
                            });
                            
                            console.log(`Notifikasi pembayaran sukses dikirim untuk order ${orderId}`);
                        } catch (notifError) {
                            console.error(`Error saat mengirim notifikasi: ${notifError.message}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error saat cek status pembayaran: ${error.message}`);
            }
        };
        const checkInterval = setInterval(async () => {
            const currentTransaction = await Transaksi.findOne({
                where: { uuid: transaksiUuid }
            });
            if (currentTransaction && currentTransaction.status_pembayaran === 'pending') {
                await checkPaymentStatus();
            } else {
                clearInterval(checkInterval);
                console.log(`Pengecekan status pembayaran untuk order ${orderId} dihentikan`);
            }
        }, 5 * 60 * 1000); // Cek setiap 5 menit
        setTimeout(() => {
            clearInterval(checkInterval);
            console.log(`Pengecekan status pembayaran untuk order ${orderId} dihentikan setelah 1 jam`);
        }, 60 * 60 * 1000);
        setTimeout(checkPaymentStatus, 30 * 1000);
        
    } catch (error) {
        console.error(`Error saat menjadwalkan pengecekan status pembayaran: ${error.message}`);
    }
};


// Cashier accepts the table order
exports.acceptTableOrder = async(req,res) =>{
    const t = await db.transaction()
    try {
        const { transaksiUuid } = req.body;
        const user = req.user;
        
        if (!user || user.role !== 'kasir') {
            return res.status(403).json({
                status: false,
                message: "Anda tidak memiliki akses untuk menerima pesanan"
            });
        }
        const transaction = await Transaksi.findOne({
            where: { 
                uuid: transaksiUuid
            },
            include: [
                { 
                    model: Table,
                    required: true  
                },
                { 
                    model: TransaksiDetail, 
                    include: [{ model: Barang }] 
                },
                { 
                    model: User, 
                    include: [{ model: Cabang }] 
                }
            ],
            transaction: t
        });
        if (!transaction) {
            await t.rollback();
            return res.status(404).json({
                status: false,
                message: "Transaksi tidak ditemukan"
            });
        }
        console.log(`transaksi data: ${transaction}`); const cabangUuid = transaction.Table.cabangUuid || 
        transaction.User?.Cabang?.uuid || 
        transaction.cabangUuid;

            if (!cabangUuid) {
            await t.rollback();
            return res.status(400).json({
            status: false,
            message: "Cabang tidak ditemukan untuk transaksi ini"
            });
            }
            transaction.cashier_accepted = 'true';
            transaction.waiting_confirmation = 'false';
            transaction.useruuid = user.uuid;
            await transaction.save({ transaction: t });
            // await Promise.all(transaction.TransaksiDetails.map(async (detail) => {
            //     const [affectedRows] = await BarangCabang.update(
            //         { stok: Sequelize.literal(`stok - ${detail.jumlahbarang}`) },
            //         { 
            //             where: { 
            //                 baranguuid: detail.baranguuid, 
            //                 cabanguuid: cabangUuid
            //             }, 
            //             transaction: t 
            //         }
            //     );
    
            //     if (affectedRows === 0) {
            //         throw new Error(`Gagal mengurangi stok untuk Barang UUID: ${detail.baranguuid}`);
            //     } await mutasiStok.create({
            //         baranguuid: detail.baranguuid,
            //         cabanguuid: cabangUuid,
            //         jenis_mutasi: 'keluar',
            //         jumlah: detail.jumlahbarang,
            //         keterangan: `Transaksi Meja ${transaction.Table.name} (${transaction.order_id})`,
            //     }, { transaction: t }); await jurnalAkutansi.create({
            //         cabanguuid: cabangUuid,
            //         baranguuid: detail.baranguuid,
            //         jumlah: detail.jumlahbarang,
            //         harga_satuan: detail.harga,
            //         total_harga: detail.total,
            //         deskripsi: `Penjualan ${detail.Barang.namabarang} (${detail.jumlahbarang} pcs) dari Meja ${transaction.Table.name}`,
            //         debit: 0,
            //         jenis_transaksi: 'penjualan',
            //         kredit: detail.total,
            //         saldo: detail.total,
            //     }, { transaction: t });
            // }));
              const existingNotification = await Notification.findOne({
                where: {
                    transaksiUuid: transaction.uuid,
                    type: 'new_order'
                },
                transaction: t
            }); if (existingNotification) {
                // Update the existing notification
                existingNotification.type = 'order_accepted';
                existingNotification.message = `Pesanan dari ${transaction.Table.name} telah diterima oleh kasir ${user.username}`;
                existingNotification.read = false; 
                await existingNotification.save({ transaction: t });
            } else {
                await Notification.create({
                    cabangUuid: cabangUuid,
                    message: `Pesanan dari Meja ${transaction.Table.name} telah diterima oleh kasir ${user.username}`,
                    orderId: transaction.order_id,
                    transaksiUuid: transaction.uuid,
                    type: 'order_accepted',
                    read: false,
                    timestamp: new Date()
                }, { transaction: t });
            }
    
            await t.commit();

   
            return res.status(200).json({
                status: true,
                message: "Pesanan berhasil diterima dan diproses",
                data: {
                    transaksi: transaction,
                    meja: transaction.Table.name,
                    items: transaction.TransaksiDetails.map(detail => ({
                        nama: detail.Barang.namabarang,
                        jumlah: detail.jumlahbarang,
                        harga: detail.harga,
                        total: detail.total
                    }))
                }
            });
    
        } catch (error) {
            await t.rollback();
            console.error('Error accepting order:', error);
            return res.status(500).json({
                status: false,
                message: error.message
            });
        }
    };
// Get pending table orders for cashier
exports.getPendingTableOrders = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user || user.role !== 'kasir') {
            return res.status(403).json({
                status: false,
                message: "Anda tidak memiliki akses untuk melihat pesanan"
            });
        }
        
        // Find tables that belong to the cashier's branch
        const branchTables = await Table.findAll({
            where: { cabangUuid: user.cabanguuid },
            attributes: ['id']
        });
        
        const tableIds = branchTables.map(table => table.id);
        
        if (tableIds.length === 0) {
            return res.status(200).json({
                status: true,
                message: "Tidak ada meja yang terdaftar di cabang ini",
                data: []
            });
        }
        
        const pendingOrders = await Transaksi.findAll({
            where: { 
                tableId: tableIds, 
                status_pembayaran: 'settlement',
                cashier_accepted: false,
                waiting_confirmation: true
            },
            include: [
                { model: Table },
                { 
                    model: TransaksiDetail, 
                    include: [{ model: Barang }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        return res.status(200).json({
            status: true,
            data: pendingOrders.map(order => ({
                ...order.toJSON(),
                cabangName: order.Table?.Cabang?.nama || 'Unknown'
            }))
        });
        
    } catch (error) {
        console.error('Error fetching pending orders:', error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};