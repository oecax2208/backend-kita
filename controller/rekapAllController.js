const { Sequelize, Op } = require("sequelize");
const TransaksiDetail = require("../models/transaksiDetailModel");
const Transaksi = require("../models/transaksiModel");
const Barang = require("../models/barangModel");
const BarangCabang = require("../models/BarangCabang");
const Cabang = require("../models/cabangModel");
const User = require("../models/userModel");
const Kategori = require("../models/kategoriModel");

exports.getRekapTransaksi = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.uuid, {
            include: { model: Cabang, attributes: ["uuid", "namacabang"] },
        });

        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }

        let whereCondition = {};

        if (user.role === "admin") {
            if (!user.cabanguuid) {
                return res.status(403).json({ message: "Admin tidak memiliki cabang terkait." });
            }
            whereCondition.useruuid = user.uuid;
        }
        const transaksi = await Transaksi.findAll({
            where: whereCondition,
            include: [
                { model: User, attributes: ["username"], include: { model: Cabang, attributes: ["uuid", "namacabang"] } },
                {
                    model: TransaksiDetail,
                    include: [{ model: Barang, attributes: ["namabarang", "harga"] }],
                },
            ],
        });

        res.status(200).json({ message: "Rekap transaksi berhasil diambil", data: transaksi });
    } catch (error) {
        console.error("Error getRekapTransaksi:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil rekap transaksi" });
    }
};

exports.getRekapKomprehensif = async (req, res) => {
    try {
        const { startDate = '2023-01-01', endDate = new Date().toISOString().split('T')[0] } = req.query;
    
        const user = await User.findByPk(req.user.uuid, {
            include: { model: Cabang, attributes: ["uuid", "namacabang"] },
        });

        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }
        let whereConditionCabang = {};
        let userIncludeCondition = {};
        
        if (user.role === "admin" && user.cabanguuid) {
            whereConditionCabang = { uuid: user.cabanguuid };
            userIncludeCondition = { cabanguuid: user.cabanguuid };
        } else if (user.role !== "superadmin") {
            return res.status(403).json({ message: "Tidak memiliki akses untuk melihat rekap komprehensif" });
        }
        const products = await Barang.findAll({
            include: [
                {
                    model: Kategori,
                    attributes: ['uuid', 'namakategori']
                },
                {
                    model: BarangCabang,
                    include: [
                        {
                            model: Cabang,
                            attributes: ['uuid', 'namacabang', 'alamat'],
                            where: whereConditionCabang
                        }
                    ]
                },
                {
                    model: TransaksiDetail,
                    required: false,
                    include: [
                        {
                            model: Transaksi,
                            where: {
                                tanggal: {
                                    [Op.between]: [startDate, endDate]
                                },
                                status_pembayaran: {
                                    [Op.in]: ['settlement', 'capture']
                                }
                            },
                            include: [
                                {
                                    model: User,
                                    attributes: ['username'],
                                    where: Object.keys(userIncludeCondition).length ? userIncludeCondition : {},
                                    required: Object.keys(userIncludeCondition).length > 0
                                }
                            ],
                            required: false
                        }
                    ]
                }
            ],
            order: [
                [{ model: Kategori }, 'namakategori', 'ASC'],
                ['namabarang', 'ASC'],
                [{ model: BarangCabang }, { model: Cabang }, 'namacabang', 'ASC']
            ]
        });
        const recap = products.map(product => {
            let totalSalesQty = 0;
            let totalSalesAmount = 0;
            
            product.TransaksiDetails.forEach(detail => {
                if (detail.Transaksi) {
                    totalSalesQty += detail.jumlahbarang;
                    totalSalesAmount += parseFloat(detail.total);
                }
            });
            
            const stockByBranch = product.BarangCabangs.map(stock => ({
                branchName: stock.Cabang.namacabang,
                branchAddress: stock.Cabang.alamat,
                branchUuid: stock.cabanguuid,
                stockAmount: stock.stok
            }));
            
            const totalStock = stockByBranch.reduce((sum, item) => sum + item.stockAmount, 0);
            
            return {
                productUuid: product.uuid,
                productName: product.namabarang,
                category: product.Kategori ? product.Kategori.namakategori : 'Uncategorized',
                categoryUuid: product.kategoriuuid,
                price: parseFloat(product.harga),
                totalStock,
                stockByBranch,
                sales: {
                    quantity: totalSalesQty,
                    amount: totalSalesAmount,
                    averagePrice: totalSalesQty > 0 ? (totalSalesAmount / totalSalesQty).toFixed(2) : 0
                }
            };
        });
        const summary = {
            totalProducts: recap.length,
            totalCategories: new Set(recap.map(item => item.categoryUuid).filter(Boolean)).size,
            totalStock: recap.reduce((sum, item) => sum + item.totalStock, 0),
            totalSalesQuantity: recap.reduce((sum, item) => sum + item.sales.quantity, 0),
            totalSalesAmount: recap.reduce((sum, item) => sum + item.sales.amount, 0),
            topSellingProducts: [...recap]
                .sort((a, b) => b.sales.quantity - a.sales.quantity)
                .slice(0, 5)
                .map(item => ({
                    name: item.productName,
                    category: item.category,
                    salesQuantity: item.sales.quantity,
                    salesAmount: item.sales.amount
                })),
            topSellingCategories: Object.values(
                recap.reduce((acc, item) => {
                    if (!item.categoryUuid) return acc;
                    
                    if (!acc[item.categoryUuid]) {
                        acc[item.categoryUuid] = {
                            categoryName: item.category,
                            salesQuantity: 0,
                            salesAmount: 0
                        };
                    }
                    acc[item.categoryUuid].salesQuantity += item.sales.quantity;
                    acc[item.categoryUuid].salesAmount += item.sales.amount;
                    return acc;
                }, {})
            )
                .sort((a, b) => b.salesAmount - a.salesAmount)
                .slice(0, 5)
        };

        if (user.role === "superadmin") {
            summary.branchPerformance = await getBranchPerformance(startDate, endDate);
        } else if (user.role === "admin" && user.cabanguuid) {
            summary.branchPerformance = await getBranchPerformance(startDate, endDate, user.cabanguuid);
        }

        res.status(200).json({
            message: "Rekap komprehensif berhasil diambil",
            period: {
                startDate,
                endDate
            },
            summary,
            detailedData: recap
        });
    } catch (error) {
        console.error("Error getRekapKomprehensif:", error);
        res.status(500).json({ 
            message: "Terjadi kesalahan saat mengambil rekap komprehensif",
            error: error.message 
        });
    }
};

async function getBranchPerformance(startDate, endDate, specificBranchUuid = null) {
    const whereCondition = specificBranchUuid ? { uuid: specificBranchUuid } : {};
    
    const branchData = await Cabang.findAll({
        where: whereCondition,
        attributes: [
            'uuid',
            'namacabang',
            [Sequelize.fn('SUM', Sequelize.col('Users.Transaksis.totaljual')), 'totalSales'],
            [Sequelize.fn('COUNT', Sequelize.col('Users.Transaksis.uuid')), 'transactionCount']
        ],
        include: [
            {
                model: User,
                attributes: [],
                include: [
                    {
                        model: Transaksi,
                        attributes: [],
                        where: {
                            tanggal: {
                                [Op.between]: [startDate, endDate]
                            },
                            status_pembayaran: {
                                [Op.in]: ['settlement', 'capture']
                            }
                        },
                        required: true
                    }
                ],
                required: true
            }
        ],
        group: ['Cabang.uuid', 'Cabang.namacabang'],
        order: [[Sequelize.literal('totalSales'), 'DESC']]
    });

    return branchData.map(branch => ({
        branchName: branch.namacabang,
        branchUuid: branch.uuid,
        totalSales: parseFloat(branch.getDataValue('totalSales') || 0),
        transactionCount: parseInt(branch.getDataValue('transactionCount') || 0)
    }));
}

exports.getStokPerCabang = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.uuid, {
            include: { model: Cabang, attributes: ["uuid", "namacabang"] },
        });

        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }

        let whereCondition = {};
        
        if (user.role === "admin" && user.cabanguuid) {
            whereCondition = { cabanguuid: user.cabanguuid };
        } else if (user.role !== "superadmin") {
            return res.status(403).json({ message: "Tidak memiliki akses untuk melihat data stok" });
        }

        const stokData = await BarangCabang.findAll({
            where: whereCondition,
            include: [
                {
                    model: Barang,
                    include: [{ model: Kategori, attributes: ['namakategori'] }]
                },
                { model: Cabang, attributes: ['namacabang', 'alamat'] }
            ]
        });

        const formattedData = stokData.map(item => ({
            barangId: item.baranguuid,
            namaBarang: item.Barang.namabarang,
            kategori: item.Barang.Kategori ? item.Barang.Kategori.namakategori : 'Uncategorized',
            harga: parseFloat(item.Barang.harga),
            cabang: item.Cabang.namacabang,
            alamatCabang: item.Cabang.alamat,
            stok: item.stok
        }));

        res.status(200).json({
            message: "Data stok per cabang berhasil diambil",
            data: formattedData
        });
    } catch (error) {
        console.error("Error getStokPerCabang:", error);
        res.status(500).json({ 
            message: "Terjadi kesalahan saat mengambil data stok per cabang",
            error: error.message 
        });
    }
};

exports.getPenjualanPerKategori = async (req, res) => {
    try {
        const { startDate = '2023-01-01', endDate = new Date().toISOString().split('T')[0] } = req.query;
        
        const user = await User.findByPk(req.user.uuid, {
            include: { model: Cabang, attributes: ["uuid", "namacabang"] },
        });

        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan" });
        }

        let userCondition = {};
        
        if (user.role === "admin" && user.cabanguuid) {
            userCondition = { cabanguuid: user.cabanguuid };
        } else if (user.role !== "superadmin") {
            return res.status(403).json({ message: "Tidak memiliki akses untuk melihat data penjualan" });
        }

        const kategoriData = await Kategori.findAll({
            attributes: [
                'uuid',
                'namakategori',
                [Sequelize.fn('SUM', Sequelize.col('Barangs.TransaksiDetails.jumlahbarang')), 'totalQuantity'],
                [Sequelize.fn('SUM', Sequelize.col('Barangs.TransaksiDetails.total')), 'totalSales']
            ],
            include: [
                {
                    model: Barang,
                    attributes: [],
                    include: [
                        {
                            model: TransaksiDetail,
                            attributes: [],
                            include: [
                                {
                                    model: Transaksi,
                                    attributes: [],
                                    where: {
                                        tanggal: {
                                            [Op.between]: [startDate, endDate]
                                        },
                                        status_pembayaran: {
                                            [Op.in]: ['settlement', 'capture'] 
                                        }
                                    },
                                    include: [
                                        {
                                            model: User,
                                            attributes: [],
                                            where: Object.keys(userCondition).length ? userCondition : {},
                                            required: Object.keys(userCondition).length > 0
                                        }
                                    ],
                                    required: true
                                }
                            ],
                            required: true
                        }
                    ],
                    required: true
                }
            ],
            group: ['Kategori.uuid', 'Kategori.namakategori'],
            order: [[Sequelize.literal('totalSales'), 'DESC']]
        });

        const formattedData = kategoriData.map(kategori => ({
            kategoriId: kategori.uuid,
            namaKategori: kategori.namakategori,
            totalQuantity: parseInt(kategori.getDataValue('totalQuantity') || 0),
            totalPenjualan: parseFloat(kategori.getDataValue('totalSales') || 0)
        }));

        res.status(200).json({
            message: "Data penjualan per kategori berhasil diambil",
            period: { startDate, endDate },
            data: formattedData
        });
    } catch (error) {
        console.error("Error getPenjualanPerKategori:", error);
        res.status(500).json({
            message: "Terjadi kesalahan saat mengambil data penjualan per kategori",
            error: error.message
        });
    }
};