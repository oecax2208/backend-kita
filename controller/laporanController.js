const { Op } = require('sequelize');
const Transaksi = require('../models/transaksiModel');
const TransaksiDetail = require('../models/transaksiDetailModel');
const User = require('../models/userModel');
const Barang = require('../models/barangModel');
const Cabang = require('../models/cabangModel');
const Kategori = require('../models/kategoriModel')
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');


const getSuccessWhereConditions = (additionalConditions = {}) => {
  return {
    status_pembayaran: { [Op.in]: ['success', 'settlement'] },
    ...additionalConditions
  };
};

exports.chartLaporan = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userCabangUuid = req.user.cabanguuid;
    const whereClause = {
      ...getSuccessWhereConditions(),
      ...(userRole === 'admin' ? { '$User.cabanguuid$': userCabangUuid } : {})
    };

    const transaksi = await Transaksi.findAll({
      attributes: [
        'uuid', 
        'totaljual', 
        'useruuid', 
        'tanggal', 
        'pembayaran', 
        'status_pembayaran',
        'tableId',
        'order_id',
        'createdAt'
      ],
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['uuid', 'username', 'cabanguuid'],
          include: [
            {
              model: Cabang,
              attributes: ['uuid', 'namacabang']
            }
          ]
        }
      ]
    });
    const calculateTotal = (transactions) => {
      return transactions.reduce((acc, trans) => {
        const amount = parseFloat(trans.totaljual);
        return acc + (isNaN(amount) ? 0 : amount);
      }, 0);
    };
    const transaksiCash = transaksi.filter(trans => trans.pembayaran === 'cash');
    const transaksiQris = transaksi.filter(trans => trans.pembayaran === 'qris');

    const response = {
      status: 200,
      message: 'Success',
      totalPenjualanSuccess: calculateTotal(transaksi),
      totalPenjualanCashSuccess: calculateTotal(transaksiCash),
      totalPenjualanQrisSuccess: calculateTotal(transaksiQris),
      transaksi,
      totalTransaksi: transaksi.length
    };

    console.log('Chart Response:', {
      total: response.totalPenjualanSuccess,
      cash: response.totalPenjualanCashSuccess,
      qris: response.totalPenjualanQrisSuccess
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in chartLaporan:', error);
    res.status(500).json({ 
      status: 500,
      message: error.message 
    });
  }
};


exports.exportLaporan = async (req, res) => {
  try {
    const { startDate, endDate, month, pembayaran, cabanguuid } = req.query;
    const user = req.user;

    if (!['superadmin', 'admin'].includes(user.role)) {
      return res.status(403).json({
        status: false,
        message: "Unauthorized: Access restricted"
      });
    }

    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;

    if (month) {
      const [year, monthNumber] = month.split('-');
      start = new Date(year, monthNumber - 1, 1);
      end = new Date(year, monthNumber, 0);
    }

    let whereConditions = getSuccessWhereConditions();
    if (start && end) {
      whereConditions.tanggal = {
        [Op.between]: [start, end]
      };
    }

    if (pembayaran) {
      whereConditions.pembayaran = pembayaran;
    }

    let cabangFilter = {};
    if (user.role === 'admin') {
      cabangFilter.uuid = user.cabanguuid;
    } else if (cabanguuid) {
      cabangFilter.uuid = cabanguuid;
    }

    const salesData = await Transaksi.findAll({
      attributes: ['uuid', 'totaljual', 'useruuid', 'tanggal', 'pembayaran','tableId'],
      where: whereConditions,
      include: [
        {
          model: User,
          attributes: ['username'],
          where: cabangFilter.uuid ? { cabanguuid: cabangFilter.uuid } : {},
          include: [{
            model: Cabang,
            attributes: ['namacabang'],
            where: cabangFilter
          }]
        },
        {
          model: TransaksiDetail,
          include: [{
            model: Barang,
            attributes: ['namabarang', 'kategoriuuid', 'harga'],
            include: {
              model: Kategori,
              attributes: ['namakategori']
            }
          }]
        }
      ]
    });

    const rows = [];
    salesData.forEach(transaksi => {
      const cabangName = transaksi.User?.Cabang?.namacabang || 'Tidak Ada Cabang';
      transaksi.TransaksiDetails.forEach(detail => {
        rows.push({
          Cabang: cabangName,
          Barang: detail.Barang.namabarang,
          Kategori: detail.Barang.Kategori?.namakategori || 'Tidak Ada Kategori',
          "Harga Satuan": detail.Barang.harga,
          "Total Terjual": detail.jumlahbarang,
          "Total Penjualan": detail.total
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penjualan");

    const filePath = path.join(__dirname, '../temp', `Laporan_Penjualan_${Date.now()}.xlsx`);
    XLSX.writeFile(workbook, filePath);

    res.download(filePath, (err) => {
      if (err) {
        console.error(err);
      }
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Error in exportLaporan:', error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};


exports.laporan = async (req, res) => {
  try {
    const { startDate, endDate, month, pembayaran, cabanguuid } = req.query;
    const user = req.user;

    if (!['superadmin', 'admin'].includes(user.role)) {
      return res.status(403).json({
        status: false,
        message: "Unauthorized: Access restricted"
      });
    }
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;

    if (month) {
      const [year, monthNumber] = month.split('-');
      start = new Date(year, monthNumber - 1, 1); 
      end = new Date(year, monthNumber, 0); 
    }
    let whereConditions = getSuccessWhereConditions();
    if (start && end) {
      whereConditions.tanggal = {
        [Op.between]: [start, end]
      };
    }

    if (pembayaran) {
      whereConditions.pembayaran = pembayaran;
    }

    let cabangFilter = {};
    if (user.role === 'admin') {
      cabangFilter.uuid = user.cabanguuid;
    } else if (cabanguuid) {
      cabangFilter.uuid = cabanguuid;
    }

    const salesData = await Transaksi.findAll({
      attributes: ['uuid', 'totaljual', 'useruuid', 'tanggal', 'pembayaran', 'status_pembayaran', 'order_id','tableId', 'createdAt'],
      where: whereConditions,
      include: [
        {
          model: User,
          attributes: ['username'],
          where: cabangFilter.uuid ? { cabanguuid: cabangFilter.uuid } : {},
          include: [{
            model: Cabang,
            attributes: ['namacabang'],
            where: cabangFilter
          }]
        },
        {
          model: TransaksiDetail,
          include: [{
            model: Barang,
            attributes: ['namabarang','kategoriuuid','harga'],
            include:{
              model: Kategori,
              attributes: ['namakategori']
            }
          }],
          
        }
      ],
      order: [['tanggal', 'DESC']]
    });

    const salesSummary = {};
    let totalPenjualan = 0;
    let totalQRIS = 0;
    let totalCash = 0;

    salesData.forEach(transaksi => {
      const cabangName = transaksi.User.Cabang.namacabang;
      const kasirName = transaksi.User.username;
      const amount = parseFloat(transaksi.totaljual);
      
      if (!isNaN(amount)) {
        if (!salesSummary[cabangName]) {
          salesSummary[cabangName] = {
            totalPenjualanCabang: 0,
            metodePembayaran: { 
              qris: { count: 0, total: 0 }, 
              cash: { count: 0, total: 0 } 
            },
            kasir: {},
            barang: {}
          };
        }

        salesSummary[cabangName].totalPenjualanCabang += amount;
        totalPenjualan += amount;

        salesSummary[cabangName].metodePembayaran[transaksi.pembayaran].count++;
        salesSummary[cabangName].metodePembayaran[transaksi.pembayaran].total += amount;
        
        if (transaksi.pembayaran === 'qris') {
          totalQRIS += amount;
        } else if (transaksi.pembayaran === 'cash') {
          totalCash += amount;
        }
        if (!salesSummary[cabangName].kasir[kasirName]) {
          salesSummary[cabangName].kasir[kasirName] = {
            totalTransaksi: 0,
            totalPenjualan: 0
          };
        }
        
        salesSummary[cabangName].kasir[kasirName].totalTransaksi++;
        salesSummary[cabangName].kasir[kasirName].totalPenjualan += amount;

        transaksi.TransaksiDetails.forEach(detail => {
          const barangName = detail.Barang.namabarang;
          const hargaSatuan = detail.Barang.harga;
          const kategori = detail.Barang.Kategori?.namakategori || 'Tidak Ada Kategori';
          const detailAmount = parseFloat(detail.total);
          
          if (!isNaN(detailAmount)) {
            if (!salesSummary[cabangName].barang[barangName]) {
              salesSummary[cabangName].barang[barangName] = {
                totalTerjual: 0,
                totalPenjualan: 0,
                hargaSatuan: hargaSatuan,
                kategori: kategori
              };
            }
            salesSummary[cabangName].barang[barangName].totalTerjual += detail.jumlahbarang;
            salesSummary[cabangName].barang[barangName].totalPenjualan += detailAmount;
          }
        });
      }
    });

    return res.status(200).json({
      status: true,
      data: {
        totalPenjualanKeseluruhan: totalPenjualan,
        totalPembayaranQRIS: totalQRIS,
        totalPembayaranCash: totalCash,
        detailPenjualan: salesSummary
      }
    });

  } catch (error) {
    console.error('Error in laporan:', error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// exports.laporan = async (req, res) => {
//   try {
//     const { startDate, endDate, pembayaran, cabanguuid } = req.query;
//     const user = req.user;

//     if (!['superadmin', 'admin'].includes(user.role)) {
//       return res.status(403).json({
//         status: false,
//         message: "Unauthorized: Access restricted"
//       });
//     }

//     // Menggunakan fungsi filter yang sama
//     let whereConditions = getSuccessWhereConditions();
//     let cabangFilter = {};

//     if (startDate && endDate) {
//       whereConditions.tanggal = {
//         [Op.between]: [new Date(startDate), new Date(endDate)]
//       };
//     }

//     if (pembayaran) {
//       whereConditions.pembayaran = pembayaran;
//     }

//     if (user.role === 'admin') {
//       cabangFilter.uuid = user.cabanguuid;
//     } else if (cabanguuid) {
//       cabangFilter.uuid = cabanguuid;
//     }

//     const salesData = await Transaksi.findAll({
//       attributes: ['uuid', 'totaljual', 'useruuid', 'tanggal', 'pembayaran', 'status_pembayaran', 'order_id', 'createdAt'],
//       where: whereConditions,
//       include: [
//         {
//           model: User,
//           attributes: ['username'],
//           where: cabangFilter.uuid ? { cabanguuid: cabangFilter.uuid } : {},
//           include: [{
//             model: Cabang,
//             attributes: ['namacabang'],
//             where: cabangFilter
//           }]
//         },
//         {
//           model: TransaksiDetail,
//           include: [{
//             model: Barang,
//             attributes: ['namabarang']
//           }]
//         }
//       ],
//       order: [['tanggal', 'DESC']]
//     });

//     const salesSummary = {};
//     let totalPenjualan = 0;

//     // Perhitungan yang konsisten
//     salesData.forEach(transaksi => {
//       const cabangName = transaksi.User.Cabang.namacabang;
//       const kasirName = transaksi.User.username;
//       const amount = parseFloat(transaksi.totaljual);
      
//       if (!isNaN(amount)) {
//         if (!salesSummary[cabangName]) {
//           salesSummary[cabangName] = {
//             totalPenjualanCabang: 0,
//             metodePembayaran: { qris: 0, cash: 0 },
//             kasir: {},
//             barang: {}
//           };
//         }

//         salesSummary[cabangName].totalPenjualanCabang += amount;
//         totalPenjualan += amount;

//         salesSummary[cabangName].metodePembayaran[transaksi.pembayaran]++;
        
//         if (!salesSummary[cabangName].kasir[kasirName]) {
//           salesSummary[cabangName].kasir[kasirName] = {
//             totalTransaksi: 0,
//             totalPenjualan: 0
//           };
//         }
        
//         salesSummary[cabangName].kasir[kasirName].totalTransaksi++;
//         salesSummary[cabangName].kasir[kasirName].totalPenjualan += amount;

//         transaksi.TransaksiDetails.forEach(detail => {
//           const barangName = detail.Barang.namabarang;
//           const detailAmount = parseFloat(detail.total);
          
//           if (!isNaN(detailAmount)) {
//             if (!salesSummary[cabangName].barang[barangName]) {
//               salesSummary[cabangName].barang[barangName] = {
//                 totalTerjual: 0,
//                 totalPenjualan: 0
//               };
//             }
//             salesSummary[cabangName].barang[barangName].totalTerjual += detail.jumlahbarang;
//             salesSummary[cabangName].barang[barangName].totalPenjualan += detailAmount;
//           }
//         });
//       }
//     });

//     console.log('Laporan Response:', {
//       total: totalPenjualan
//     });

//     return res.status(200).json({
//       status: true,
//       data: {
//         totalPenjualanKeseluruhan: totalPenjualan,
//         detailPenjualan: salesSummary
//       }
//     });

//   } catch (error) {
//     console.error('Error in getSalesReport:', error);
//     return res.status(500).json({
//       status: false,
//       message: "Internal server error",
//       error: error.message
//     });
//   }
// };

exports.laporandetail = async (req, res) => {
  try {
    const userRole = req.user.role; 
    const userCabangUuid = req.user.cabanguuid; 

    const whereClause = userRole === 'admin' 
      ? { '$User.Cabang.uuid$': userCabangUuid } 
      : {};

    const transaksi = await Transaksi.findAll({
      attributes: ['uuid', 'totaljual', 'useruuid', 'tanggal', 'pembayaran', 'status_pembayaran','tableId'],
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['uuid', 'username', 'cabanguuid'],
          include: [
            {
              model: Cabang,
              attributes: ['uuid', 'namacabang'],
            },
          ],
        },
      ],
    });
    const transaksiSuccess = transaksi.filter(trans => trans.status_pembayaran === 'settlement');
    const monthlyData = {};
    transaksiSuccess.forEach(transaksi => {
      const month = new Date(transaksi.tanggal).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { cash: 0, qris: 0 };
      }
      if (transaksi.pembayaran === 'cash') {
        monthlyData[month].cash += parseFloat(transaksi.totaljual || 0);
      } else if (transaksi.pembayaran === 'qris') {
        monthlyData[month].qris += parseFloat(transaksi.totaljual || 0);
      }
    });
    const totalPenjualanSuccess = transaksiSuccess.reduce((acc, trans) => acc + parseFloat(trans.totaljual || 0), 0);
    const totalPenjualanCashSuccess = transaksiSuccess
      .filter(trans => trans.pembayaran === 'cash')
      .reduce((acc, trans) => acc + parseFloat(trans.totaljual || 0), 0);
    const totalPenjualanQrisSuccess = transaksiSuccess
      .filter(trans => trans.pembayaran === 'qris')
      .reduce((acc, trans) => acc + parseFloat(trans.totaljual || 0), 0);

    res.status(200).json({
      status: 200,
      message: 'Success',
      totalPenjualanSuccess,
      totalPenjualanCashSuccess,
      totalPenjualanQrisSuccess,
      monthlyData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
