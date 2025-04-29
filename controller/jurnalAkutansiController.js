const jurnalAkuntansi = require('../models/jurnalAkutansiModel');
const Wearhouse = require('../models/wearhouseModel');
const mutasiStok = require('../models/mutasiStokModel');
const { Op, literal, fn, col } = require("sequelize");
const Transaksi = require('../models/transaksiModel');
const TransaksiDetail = require('../models/transaksiDetailModel');
const MutasiStok = require('../models/mutasiStokModel');
const DistribusiStok = require('../models/distribusiStokModel');
const Barang = require('../models/barangModel');
const BarangCabang = require('../models/BarangCabang');
const Cabang = require('../models/cabangModel');
const User = require('../models/userModel');
const Table = require('../models/tableModel');
const db = require('../config/database');

// Original getSaldoDanDebit function
exports.getSaldoDanDebit = async (req, res) => {
    try {
      const { bulan, tahun, startDate, endDate } = req.query;
      
      let tanggalMulai, tanggalAkhir;
      if (startDate && endDate) {
        tanggalMulai = new Date(startDate);
        tanggalAkhir = new Date(endDate);
        tanggalAkhir.setHours(23, 59, 59, 999);
      } 
      else if (bulan && tahun) {
        tanggalMulai = new Date(tahun, bulan - 1, 1);
        tanggalAkhir = new Date(tahun, bulan, 0, 23, 59, 59, 999);
      } else {
        return res.status(400).json({ 
          message: "Harap sertakan (bulan dan tahun) ATAU (startDate dan endDate)." 
        });
      }
    const bulanSebelumnya = tanggalMulai.getMonth();
    const tahunSebelumnya = bulanSebelumnya === 0 ? tanggalMulai.getFullYear() - 1 : tanggalMulai.getFullYear();
    const bulanSebelumnyaFix = bulanSebelumnya === 0 ? 12 : bulanSebelumnya;
    const startPrevMonth = new Date(tahunSebelumnya, bulanSebelumnyaFix - 1, 1);
    const endPrevMonth = new Date(tahunSebelumnya, bulanSebelumnyaFix, 0, 23, 59, 59, 999);
    const lastMonthTransaction = await jurnalAkuntansi.findOne({ 
      where: { 
        createdAt: { 
          [Op.between]: [startPrevMonth, endPrevMonth] 
        } 
      }, 
      order: [['createdAt', 'DESC']], 
      attributes: ['saldo'], 
      raw: true 
    });
    
    const saldoBulanSebelumnya = lastMonthTransaction ? parseFloat(lastMonthTransaction.saldo) : 0;
    const detailTransaksi = await jurnalAkuntansi.findAll({
      where: {
        createdAt: {
          [Op.between]: [tanggalMulai, tanggalAkhir]
        }
      },
      order: [['createdAt', 'ASC']],
      raw: true
    });
    const summary = await jurnalAkuntansi.findAll({ 
      where: { 
        createdAt: { 
          [Op.between]: [tanggalMulai, tanggalAkhir] 
        } 
      }, 
      attributes: [ 
        [fn('SUM', col('debit')), 'total_debit'], 
        [fn('SUM', col('kredit')), 'total_kredit'], 
        [literal('SUM(kredit) - SUM(debit)'), 'saldo_berjalan'] 
      ], 
      raw: true 
    });
    
    const totalDebit = parseFloat(summary[0].total_debit || 0);
    const totalKredit = parseFloat(summary[0].total_kredit || 0);
    const saldoBerjalan = totalKredit - totalDebit;
    const saldoAkhir = saldoBulanSebelumnya + saldoBerjalan;
    const tanggalMulaiStr = tanggalMulai.toISOString().split('T')[0];
    const tanggalAkhirStr = tanggalAkhir.toISOString().split('T')[0];
    
    return res.json({
      periode: {
        tanggal_mulai: tanggalMulaiStr,
        tanggal_akhir: tanggalAkhirStr,
        bulan: tanggalMulai.getMonth() + 1,
        tahun: tanggalMulai.getFullYear()
      },
      ringkasan: {
        total_pengeluaran: totalDebit.toFixed(2),
        //total_pemasukan: totalKredit.toFixed(2),
        saldo_berjalan: saldoBerjalan.toFixed(2),
        saldo_awal: saldoBulanSebelumnya.toFixed(2),
        saldo_akhir: saldoAkhir.toFixed(2)
      },
      detail_transaksi: detailTransaksi.map(trx => ({
        ...trx,
        tanggal: new Date(trx.createdAt).toISOString().split('T')[0],
        waktu: new Date(trx.createdAt).toISOString().split('T')[1].substring(0, 8),
        debit: parseFloat(trx.debit || 0).toFixed(2),
        kredit: parseFloat(trx.kredit || 0).toFixed(2),
        saldo: parseFloat(trx.saldo || 0).toFixed(2)
      }))
    });
    
  } catch (error) {
    console.error("Error in getSaldoDanDebit:", error);
    return res.status(500).json({ 
      message: "Terjadi kesalahan pada server.", 
      error: error.message 
    });
  }
};

// // New function that integrates transaction data with journal
// exports.getSaldoDanTransaksi = async (req, res) => {
//   const transaction = await db.transaction();
  
//   try {
//     const { bulan, tahun, startDate, endDate } = req.query;
//     const userRole = req.user?.role;
//     const userCabangUuid = req.user?.cabanguuid;
    
//     // Define date range
//     let tanggalMulai, tanggalAkhir;
//     if (startDate && endDate) {
//       tanggalMulai = new Date(startDate);
//       tanggalAkhir = new Date(endDate);
//       tanggalAkhir.setHours(23, 59, 59, 999);
//     } 
//     else if (bulan && tahun) {
//       tanggalMulai = new Date(tahun, bulan - 1, 1);
//       tanggalAkhir = new Date(tahun, bulan, 0, 23, 59, 59, 999);
//     } else {
//       return res.status(400).json({ 
//         message: "Harap sertakan (bulan dan tahun) ATAU (startDate dan endDate)." 
//       });
//     }
    
//     // Get previous month's balance
//     const bulanSebelumnya = tanggalMulai.getMonth();
//     const tahunSebelumnya = bulanSebelumnya === 0 ? tanggalMulai.getFullYear() - 1 : tanggalMulai.getFullYear();
//     const bulanSebelumnyaFix = bulanSebelumnya === 0 ? 12 : bulanSebelumnya;
//     const startPrevMonth = new Date(tahunSebelumnya, bulanSebelumnyaFix - 1, 1);
//     const endPrevMonth = new Date(tahunSebelumnya, bulanSebelumnyaFix, 0, 23, 59, 59, 999);
    
//     const lastMonthTransaction = await jurnalAkuntansi.findOne({ 
//       where: { 
//         createdAt: { 
//           [Op.between]: [startPrevMonth, endPrevMonth] 
//         } 
//       }, 
//       order: [['createdAt', 'DESC']], 
//       attributes: ['saldo'], 
//       raw: true,
//       transaction
//     });
    
//     const saldoBulanSebelumnya = lastMonthTransaction ? parseFloat(lastMonthTransaction.saldo) : 0;
    
//     // Get journal transactions for the current period
//     const detailJurnal = await jurnalAkuntansi.findAll({
//       where: {
//         createdAt: {
//           [Op.between]: [tanggalMulai, tanggalAkhir]
//         }
//       },
//       order: [['createdAt', 'ASC']],
//       raw: true,
//       transaction
//     });
    
//     // Get journal summary
//     const summaryJurnal = await jurnalAkuntansi.findAll({ 
//       where: { 
//         createdAt: { 
//           [Op.between]: [tanggalMulai, tanggalAkhir] 
//         } 
//       }, 
//       attributes: [ 
//         [fn('SUM', col('debit')), 'total_debit'], 
//         [fn('SUM', col('kredit')), 'total_kredit'], 
//         [literal('SUM(kredit) - SUM(debit)'), 'saldo_berjalan'] 
//       ], 
//       raw: true,
//       transaction
//     });
    
//     // Get transaction data for the same period
//     const whereClause = userRole === 'admin' && userCabangUuid
//       ? { 
//           createdAt: { [Op.between]: [tanggalMulai, tanggalAkhir] },
//           '$User.Cabang.uuid$': userCabangUuid 
//         }
//       : { createdAt: { [Op.between]: [tanggalMulai, tanggalAkhir] } };
      
//     const transaksi = await Transaksi.findAll({
//       attributes: ['uuid', 'totaljual', 'useruuid', 'tanggal', 'pembayaran', 'status_pembayaran', 'order_id', 'tableId', 'createdAt'],
//       where: whereClause,
//       include: [
//         {
//           model: User,
//           attributes: ['uuid', 'username', 'cabanguuid'],
//           include: [
//             {
//               model: Cabang,
//               attributes: ['uuid', 'namacabang']
//             }
//           ]
//         },
//         {
//           model: TransaksiDetail,
//           attributes: ['uuid', 'transaksiuuid', 'baranguuid', 'jumlahbarang', 'harga', 'total', 'createdAt'],
//           include:[{
//             model: Barang,
//             attributes: ['namabarang']
//           }]
//         },
//         {
//           model: Table,
//           attributes: ['id', 'name'],
//           include:[{
//             model: Cabang,
//             attributes: ['uuid', 'namacabang']
//           }]
//         }
//       ],
//       transaction
//     });
    
//     // Calculate transaction statistics
//     const transaksiSuccess = transaksi.filter(trans => trans.status_pembayaran === 'settlement');
//     const transaksiPending = transaksi.filter(trans => trans.status_pembayaran === 'pending');
//     const transaksiCashSuccess = transaksiSuccess.filter(trans => trans.pembayaran === 'cash');
//     const transaksiQrisSuccess = transaksiSuccess.filter(trans => trans.pembayaran === 'qris');
    
//     const calculateTotal = (transactions) => {
//       return transactions.reduce((acc, trans) => acc + parseFloat(trans.totaljual || 0), 0);
//     };
    
//     const totalPenjualanSuccess = calculateTotal(transaksiSuccess);
//     const totalPenjualanCashSuccess = calculateTotal(transaksiCashSuccess);
//     const totalPenjualanQrisSuccess = calculateTotal(transaksiQrisSuccess);
    
//     // Process journal data with transaction data
//     const totalDebit = parseFloat(summaryJurnal[0].total_debit || 0);
//     const totalKredit = parseFloat(summaryJurnal[0].total_kredit || 0) + totalPenjualanSuccess; // Include sales in credit
//     const saldoBerjalan = totalKredit - totalDebit;
//     const saldoAkhir = saldoBulanSebelumnya + saldoBerjalan;
    
//     // Format for response
//     const tanggalMulaiStr = tanggalMulai.toISOString().split('T')[0];
//     const tanggalAkhirStr = tanggalAkhir.toISOString().split('T')[0];
    
//     await transaction.commit();
    
//     return res.json({
//       periode: {
//         tanggal_mulai: tanggalMulaiStr,
//         tanggal_akhir: tanggalAkhirStr,
//         bulan: tanggalMulai.getMonth() + 1,
//         tahun: tanggalMulai.getFullYear()
//       },
//       ringkasan: {
//         total_pengeluaran: totalDebit.toFixed(2),
//        // total_pemasukan: totalKredit.toFixed(2),
//         total_penjualan: totalPenjualanSuccess.toFixed(2),
//         total_penjualan_cash: totalPenjualanCashSuccess.toFixed(2),
//         total_penjualan_qris: totalPenjualanQrisSuccess.toFixed(2),
//         saldo_berjalan: saldoBerjalan.toFixed(2),
//         saldo_awal: saldoBulanSebelumnya.toFixed(2),
//         saldo_akhir: saldoAkhir.toFixed(2)
//       },
//       detail_jurnal: detailJurnal.map(trx => ({
//         ...trx,
//         tanggal: new Date(trx.createdAt).toISOString().split('T')[0],
//         waktu: new Date(trx.createdAt).toISOString().split('T')[1].substring(0, 8),
//         debit: parseFloat(trx.debit || 0).toFixed(2),
//         kredit: parseFloat(trx.kredit || 0).toFixed(2),
//         saldo: parseFloat(trx.saldo || 0).toFixed(2)
//       })),
//       total_transaksi: transaksi.length,
//       transaksi_berhasil: transaksiSuccess.length,
//       transaksi_pending: transaksiPending.length,
//       detail_transaksi: transaksi.map(trans => ({
//         uuid: trans.uuid,
//         total_jual: parseFloat(trans.totaljual || 0).toFixed(2),
//         cabang: trans.User?.Cabang?.namacabang || '-',
//         kasir: trans.User?.username || '-',
//         tanggal: new Date(trans.createdAt).toISOString().split('T')[0],
//         waktu: new Date(trans.createdAt).toISOString().split('T')[1].substring(0, 8),
//         metode_pembayaran: trans.pembayaran,
//         status_pembayaran: trans.status_pembayaran,
//         order_id: trans.order_id,
//         table: trans.Table?.name || '-',
//         items: trans.TransaksiDetails?.map(item => ({
//           barang: item.Barang?.namabarang || '-',
//           jumlah: item.jumlahbarang,
//           harga: parseFloat(item.harga || 0).toFixed(2),
//           total: parseFloat(item.total || 0).toFixed(2)
//         }))
//       }))
//     });
    
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Error in getSaldoDanTransaksi:", error);
//     return res.status(500).json({ 
//       message: "Terjadi kesalahan pada server.", 
//       error: error.message 
//     });
//   }
// };
exports.getSaldoDanTransaksi = async (req, res) => {
  const transaction = await db.transaction();
  try {
    const { bulan, tahun, startDate, endDate, page = 1, limit = 10 } = req.query;
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    let tanggalMulai, tanggalAkhir;
    if (startDate && endDate) {
      tanggalMulai = new Date(startDate);
      tanggalAkhir = new Date(endDate);
      tanggalAkhir.setHours(23, 59, 59, 999);
    } else if (bulan && tahun) {
      tanggalMulai = new Date(tahun, bulan - 1, 1);
      tanggalAkhir = new Date(tahun, bulan, 0, 23, 59, 59, 999);
    } else {
      return res.status(400).json({ message: "Harap sertakan (bulan dan tahun) ATAU (startDate dan endDate)." });
    }

    // Get total pemasukan (penjualan sukses)
    const totalPemasukan = await Transaksi.sum('totaljual', {
      where: { 
        status_pembayaran: 'settlement', 
        createdAt: { [Op.between]: [tanggalMulai, tanggalAkhir] } 
      }
    });

    // Get total pengeluaran dari jurnal akuntansi
    const totalPengeluaran = await jurnalAkuntansi.sum('debit', {
      where: { 
        createdAt: { [Op.between]: [tanggalMulai, tanggalAkhir] } 
      }
    });

    // Get paginated transactions
    const transaksi = await Transaksi.findAndCountAll({
      where: { 
        status_pembayaran: 'settlement',
        createdAt: { [Op.between]: [tanggalMulai, tanggalAkhir] }
      },
      limit: parsedLimit,
      offset: offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        attributes: ['username'],
        include: [{ model: Cabang, attributes: ['namacabang'] }]
      }]
    });

    // Get paginated journal entries (pengeluaran)
    const jurnalEntries = await jurnalAkuntansi.findAndCountAll({
      where: {
        createdAt: { [Op.between]: [tanggalMulai, tanggalAkhir] }
      },
      limit: parsedLimit,
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    const saldoBerjalan = (totalPemasukan || 0) - (totalPengeluaran || 0);

    await transaction.commit();
    return res.json({
      periode: {
        tanggal_mulai: tanggalMulai.toISOString().split('T')[0],
        tanggal_akhir: tanggalAkhir.toISOString().split('T')[0],
        bulan: tanggalMulai.getMonth() + 1,
        tahun: tanggalMulai.getFullYear()
      },
      ringkasan: {
        total_pengeluaran: totalPengeluaran || 0,
        total_pemasukan: totalPemasukan || 0,
        saldo_berjalan: saldoBerjalan
      },
      transaksi: {
        total: transaksi.count,
        data: transaksi.rows
      },
      jurnal: {
        total: jurnalEntries.count,
        data: jurnalEntries.rows
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error in getSaldoDanTransaksi:", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server.", error: error.message });
  }
};


// New function to create journal entries from transactions
// Fungsi yang diperbaiki untuk membuat jurnal dari transaksi
exports.createJurnalFromTransaksi = async (req, res) => {
  const transaction = await db.transaction();
  
  try {
    const { tanggal, keterangan } = req.body;
    const userRole = req.user?.role;
    const userCabangUuid = req.user?.cabanguuid;
    
    // Define date range for transactions to process
    const tanggalProses = tanggal ? new Date(tanggal) : new Date();
    const startOfDay = new Date(tanggalProses.setHours(0, 0, 0, 0));
    const endOfDay = new Date(tanggalProses.setHours(23, 59, 59, 999));
    
    // Get transactions for the period
    const whereClause = userRole === 'admin' && userCabangUuid
      ? { 
          createdAt: { [Op.between]: [startOfDay, endOfDay] },
          status_pembayaran: 'settlement',
          '$User.Cabang.uuid$': userCabangUuid 
        }
      : { 
          createdAt: { [Op.between]: [startOfDay, endOfDay] },
          status_pembayaran: 'settlement'
        };
      
    const transaksi = await Transaksi.findAll({
      attributes: ['uuid', 'totaljual', 'useruuid', 'tanggal', 'pembayaran', 'status_pembayaran', 'order_id', 'createdAt'],
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
      ],
      transaction
    });
    
    if (transaksi.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Tidak ada transaksi berhasil yang ditemukan untuk periode ini."
      });
    }
    
    // Calculate transaction totals
    const transaksiCash = transaksi.filter(trans => trans.pembayaran === 'cash');
    const transaksiQris = transaksi.filter(trans => trans.pembayaran === 'qris');
    
    const calculateTotal = (transactions) => {
      return transactions.reduce((acc, trans) => acc + parseFloat(trans.totaljual || 0), 0);
    };
    
    const totalPenjualan = calculateTotal(transaksi);
    const totalPenjualanCash = calculateTotal(transaksiCash);
    const totalPenjualanQris = calculateTotal(transaksiQris);
    
    // Get last saldo
    const lastJurnal = await jurnalAkuntansi.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['saldo'],
      transaction
    });
    
    const lastSaldo = lastJurnal ? parseFloat(lastJurnal.saldo) : 0;
    const newSaldo = lastSaldo + totalPenjualan;
    
    // Buat deskripsi transaksi yang lebih detail
    const deskripsiTransaksi = keterangan || `Penjualan ${startOfDay.toISOString().split('T')[0]}`;
    
    // Detail informasi untuk disimpan
    const detailInfo = {
      jumlah_transaksi: transaksi.length,
      transaksi_cash: transaksiCash.length,
      transaksi_qris: transaksiQris.length,
      total_cash: totalPenjualanCash,
      total_qris: totalPenjualanQris,
      transaksi_ids: transaksi.map(t => t.uuid)
    };
    
    // Create new journal entry with all required fields
    const jurnalEntry = await jurnalAkuntansi.create({
      tanggal: startOfDay,
      keterangan: deskripsiTransaksi,
      deskripsi: `Jurnal otomatis dari ${transaksi.length} transaksi penjualan (Cash: ${transaksiCash.length}, QRIS: ${transaksiQris.length})`,
      debit: 0,
      kredit: totalPenjualan,
      saldo: newSaldo,
      jenis: 'Penjualan',          // Field yang ada di model Anda
      jenis_transaksi: 'Pemasukan', // Field yang diperlukan (notNull)
      sumber: 'Transaksi',
      detail_sumber: JSON.stringify(detailInfo),
      cabang_uuid: userCabangUuid || null,
      user_uuid: req.user?.uuid || null
    }, { transaction });
    
    await transaction.commit();
    
    return res.status(201).json({
      message: "Jurnal berhasil dibuat dari transaksi penjualan.",
      data: {
        jurnal: {
          ...jurnalEntry.toJSON(),
          debit: parseFloat(jurnalEntry.debit || 0).toFixed(2),
          kredit: parseFloat(jurnalEntry.kredit || 0).toFixed(2),
          saldo: parseFloat(jurnalEntry.saldo || 0).toFixed(2)
        },
        ringkasan_transaksi: {
          total_transaksi: transaksi.length,
          total_penjualan: totalPenjualan.toFixed(2),
          total_penjualan_cash: totalPenjualanCash.toFixed(2),
          total_penjualan_qris: totalPenjualanQris.toFixed(2)
        }
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error("Error in createJurnalFromTransaksi:", error);
    return res.status(500).json({ 
      message: "Terjadi kesalahan pada server.", 
      error: error.message 
    });
  }
};

exports.getSaldoTerkini = async (req, res) => {
  try {
    const lastTransaction = await jurnalAkuntansi.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['saldo', 'createdAt'],
      raw: true
    });
    
    const saldoTerkini = lastTransaction ? parseFloat(lastTransaction.saldo) : 0;
    const lastUpdate = lastTransaction ? lastTransaction.createdAt : null;
    
    return res.json({
      saldo_terkini: saldoTerkini.toFixed(2),
      terakhir_diperbarui: lastUpdate
    });
  } catch (error) {
    console.error("Error in getSaldoTerkini:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
      error: error.message
    });
  }
};

exports.getJurnal = async (req, res) => {
    try {
        const { start_date, end_date, jenis_transaksi } = req.query;
        
        let whereClause = {};
        if (start_date && end_date) {
            whereClause.createdAt = {
                [Op.between]: [new Date(start_date), new Date(end_date)]
            };
        }
        
        // Filter
        if (jenis_transaksi) {
            whereClause.jenis_transaksi = jenis_transaksi;
        }

        const jurnal = await jurnalAkuntansi.findAll({
            where: whereClause,
            include: [
                {
                    model: Barang,
                    attributes: ['namabarang', 'harga']
                },
                {
                    model: Cabang,
                    attributes: ['namacabang']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        if (!jurnal.length) {
            return res.status(404).json({ 
                message: "Data jurnal tidak ditemukan.",
                data: [] 
            });
        }

        return res.status(200).json({
            message: "Data jurnal berhasil ditemukan",
            data: jurnal
        });
        
    } catch (error) {
        console.error('Error in getJurnal:', error);
        return res.status(500).json({ 
            message: "Terjadi kesalahan pada server.",
            error: error.message 
        });
    }
};

exports.crateJurnal = async (req, res) => {
    const transaction = await db.transaction();
    try {
        const { cabanguuid, jenis_transaksi, baranguuid, jumlah, harga_satuan, deskripsi } = req.body;

        const total_harga = jumlah * harga_satuan;
        const debit = jenis_transaksi === 'pembelian' ? total_harga : 0;
        const kredit = jenis_transaksi === 'penjualan' ? total_harga : 0;
        const jurnalEntry = await jurnalAkuntansi.create({
            cabanguuid,
            jenis_transaksi,
            baranguuid,
            deskripsi,
            debit,
            kredit,
            saldo: 0,
            jumlah,
            harga_satuan,
            total_harga
        }, { transaction });

        if (jenis_transaksi === 'pembelian') {
            let wearhouseEntry = await Wearhouse.findOne({ where: { baranguuid }, transaction });

            if (wearhouseEntry) {
                wearhouseEntry.stok_gudang = Number(wearhouseEntry.stok_gudang) + Number(jumlah);
                await wearhouseEntry.save({ transaction });
            } else {
                wearhouseEntry = await Wearhouse.create({
                    baranguuid,
                    stok_gudang: Number(jumlah)
                }, { transaction });
            }

            await mutasiStok.create({
                baranguuid,
                cabanguuid: null, 
                jenis_mutasi: 'masuk',
                jumlah,
                keterangan: `Pembelian barang masuk ke gudang (${deskripsi})`
            }, { transaction });
        }

        await transaction.commit();
        return res.status(201).json({ message: 'Jurnal berhasil dibuat', data: jurnalEntry });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};
