const Transaksi = require('../models/transaksiModel')
const TransaksiDetail = require('../models/transaksiDetailModel')
const User = require('../models/userModel')
const Cabang = require('../models/cabangModel')
const Barang = require('../models/barangModel')
const BarangCabang = require('../models/BarangCabang')
const moment = require('moment-timezone')
const Op = require('sequelize')
const db = require('../config/database')
const {snap, coreApi} = require('../config/midtransConfig');
//const jurnalAkuntansi = require('../models/jurnalAkutansiModel')
const JurnalAkuntansi = require('../models/jurnalAkutansiModel')
const Sequelize = require('sequelize')
const Table = require('../models/tableModel')

//----------------PAGINATION TRANSAKSI--------------
// exports.getTransaksi = async (req,res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10; 
//     const offset = (page - 1) * limit;
//     const { count, rows: transaksi } = await Transaksi.findAndCountAll({
//       attributes: ['uuid', 'totaljual', 'useruuid', 'tanggal', 'pembayaran', 'status_pembayaran', 'order_id'],
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
//           attributes: ['uuid', 'transaksiuuid', 'baranguuid', 'jumlahbarang', 'harga', 'total']
//         }
//       ],
//       limit: parseInt(limit), 
//       offset: parseInt(offset), 
//       distinct: true
//     });
//     const totalPages = Math.ceil(count / limit);
//     res.status(200).json({
//       status: 200,
//       message: 'success',
//       data: transaksi,
//       totalData: count,
//       currentPage: parseInt(page),
//       totalPages
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// }

//-----------------TANPA PAGINATION
exports.getTransaksi = async (req, res) => {
  try {
      const userRole = req.user.role; 
      const userCabangUuid = req.user.cabanguuid; 

      const whereClause = userRole === 'admin' 
      ? { '$User.Cabang.uuid$': userCabangUuid } 
      : {};

      const transaksi = await Transaksi.findAll({
          attributes: ['uuid', 'totaljual', 'useruuid', 'tanggal', 'pembayaran', 'status_pembayaran', 'order_id','tableId','createdAt'],
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
              },
              {
                  model: TransaksiDetail,
                  attributes: ['uuid', 'transaksiuuid', 'baranguuid', 'jumlahbarang', 'harga', 'total','createdAt'],
                  include:[{
                    model: Barang, 
                      attributes: ['namabarang']
                    }
                  ]
              },
              {
                model: Table,
                attributes: ['id', 'name'],
                include:[{
                  model: Cabang,
                  attributes: ['uuid', 'namacabang']
                }]
              }
          ]
      });

      
      const calculateTransaksi = (TransaksiData) => TransaksiData.length;

      const totalTransaksi = calculateTransaksi(transaksi);
      const transaksiSuccess = transaksi.filter(trans => trans.status_pembayaran === 'settlement');
      const transaksiPending = transaksi.filter(trans => trans.status_pembayaran === 'pending');
      const transaksiCashSuccess = transaksiSuccess.filter(trans => trans.pembayaran === 'cash');
      const transaksiQrisSuccess = transaksiSuccess.filter(trans => trans.pembayaran === 'qris');
      const transaksiCashPending = transaksiPending.filter(trans => trans.pembayaran === 'cash');
      const transaksiQrisPending = transaksiPending.filter(trans => trans.pembayaran === 'qris');

      const calculateTotal = (transactions) => {
          return transactions.reduce((acc, trans) => acc + parseFloat(trans.totaljual || 0), 0);
      };

      const totalPenjualanSuccess = calculateTotal(transaksiSuccess);
      const totalPenjualanPending = calculateTotal(transaksiPending);
      const totalPenjualanCashSuccess = calculateTotal(transaksiCashSuccess);
      const totalPenjualanQrisSuccess = calculateTotal(transaksiQrisSuccess);
      const totalPenjualanCashPending = calculateTotal(transaksiCashPending);
      const totalPenjualanQrisPending = calculateTotal(transaksiQrisPending);

      res.status(200).json({
          status: 200,
          message: 'Success',
          totalPenjualanSuccess: calculateTotal(transaksiSuccess),
            //totalPenjualanPending: calculateTotal(transaksiPending),
            totalPenjualanCashSuccess: calculateTotal(transaksiCashSuccess),
            totalPenjualanQrisSuccess: calculateTotal(transaksiQrisSuccess),
            // totalPenjualanCashPending: calculateTotal(transaksiCashPending),
            // totalPenjualanQrisPending: calculateTotal(transaksiQrisPending),
            transaksi ,
          
          totalTransaksi
      });

  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};


exports.getTransaksinotification = async (req,res) =>{
  try {
    const { order_id } = req.params; 
    if (!order_id) {
      return res.status(400).json({ status: 400, message: "Order ID is required" });
    }
    const transaksi = await Transaksi.findOne({
      where: { order_id },
      attributes: ['uuid', 'totaljual', 'useruuid', 'tanggal', 'pembayaran', 'status_pembayaran', 'order_id','tableId'],
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
        {
          model: TransaksiDetail,
          attributes: ['uuid', 'transaksiuuid', 'baranguuid', 'jumlahbarang', 'harga', 'total'],
        },
        {
          model: Table,
          attributes: ['id', 'name'],
          include:[{
            model: Cabang,
            attributes: ['uuid', 'namacabang']
          }]
        }
      ],
    });

    if (!transaksi) {
      return res.status(404).json({ status: 404, message: "Transaction not found" });
    }

    const transaksiData = [transaksi];
    const transaksiSuccess = transaksiData.filter(trans => trans.status_pembayaran === 'settlement');
    const transaksiPending = transaksiData.filter(trans => trans.status_pembayaran === 'pending');
    const transaksiCashSuccess = transaksiSuccess.filter(trans => trans.pembayaran === 'cash');
    const transaksiQrisSuccess = transaksiSuccess.filter(trans => trans.pembayaran === 'qris');
    const transaksiCashPending = transaksiPending.filter(trans => trans.pembayaran === 'cash');
    const transaksiQrisPending = transaksiPending.filter(trans => trans.pembayaran === 'qris');

    const calculateTotal = (transactions) => {
      return transactions.reduce((acc, trans) => acc + parseFloat(trans.totaljual || 0), 0);
    };

    const totalPenjualanSuccess = calculateTotal(transaksiSuccess);
    const totalPenjualanPending = calculateTotal(transaksiPending);
    const totalPenjualanCashSuccess = calculateTotal(transaksiCashSuccess);
    const totalPenjualanQrisSuccess = calculateTotal(transaksiQrisSuccess);
    const totalPenjualanCashPending = calculateTotal(transaksiCashPending);
    const totalPenjualanQrisPending = calculateTotal(transaksiQrisPending);

    res.status(200).json({
      status: 200,
      message: "Success",
      totalPenjualanSuccess,
      totalPenjualanPending,
      totalPenjualanCashSuccess,
      totalPenjualanQrisSuccess,
      totalPenjualanCashPending,
      totalPenjualanQrisPending,
      data: {
        transaksiSuccess,
        transaksi,
        totalTransaksi: transaksiData.length,
      },
    });
  } catch (error) {
    console.error("Error fetching transaction notification:", error);
    res.status(500).json({ status: 500, message: error.message });
  }
};

exports.getTransaksiByUuid = async (req,res) => {
    try {
        const {uuid} = req.params;
        const transaksi = await Transaksi.findOne({
            where:{
                uuid
            }
        })
        if(!transaksi){
            res.status(404).json('Transaksi tidak di temukan')
        }
        res.status(200).json({
            status:200,
            message: 'succes',
            data: transaksi
        })
    } catch (error) {
        
    }
}


exports.rekapHarianUser = async (req, res) => {
  try {
    const tanggal = req.query.tanggal || undefined;
    
    if (tanggal && !moment(tanggal, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Format tanggal tidak valid, gunakan YYYY-MM-DD' });
    }
    const startOfDay = moment.tz(tanggal, 'Asia/Jakarta').startOf('day');
    const endOfDay = moment.tz(tanggal, 'Asia/Jakarta').endOf('day');

    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Anda tidak login' });
    }

    const transaksi = await Transaksi.findAll({
      where: {
        useruuid: user.uuid,
        tanggal: tanggal
      },
      include: [
        {
          model: TransaksiDetail,
          required: false,
          include: [
            {
              model: Barang,
              attributes: ['namabarang', 'harga'],
            },
          ],
        },
        {
          model: User,
          attributes: ['uuid', 'username', 'role', 'cabanguuid'],
          include: [
            {
              model: Cabang,
              attributes: ['namacabang', 'alamat'],
            },
          ],
        },
      ],
    });

    console.log('Query Parameters:', {
      useruuid: user.uuid,
      startOfDay: startOfDay.format('YYYY-MM-DD HH:mm:ss'),
      endOfDay: endOfDay.format('YYYY-MM-DD HH:mm:ss'),
      requestedDate: tanggal
    });

    if (!transaksi || transaksi.length === 0) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }
    const transaksiSuccess = transaksi.filter(trans => trans.status_pembayaran === 'settlement');
    const transaksiPending = transaksi.filter(trans => trans.status_pembayaran === 'pending');
    const transaksiCashSuccess = transaksiSuccess.filter(trans => trans.pembayaran === 'cash');
    const transaksiQrisSuccess = transaksiSuccess.filter(trans => trans.pembayaran === 'qris');
    const transaksiCashPending = transaksiPending.filter(trans => trans.pembayaran === 'cash');
    const transaksiQrisPending = transaksiPending.filter(trans => trans.pembayaran === 'qris');

    const calculateTotal = (transactions) => {
      return transactions.reduce((acc, trans) => acc + parseFloat(trans.totaljual || 0), 0);
    };

    const totalPenjualanSuccess = calculateTotal(transaksiSuccess);
    const totalPenjualanPending = calculateTotal(transaksiPending);
    const totalPenjualanCashSuccess = calculateTotal(transaksiCashSuccess);
    const totalPenjualanQrisSuccess = calculateTotal(transaksiQrisSuccess);
    const totalPenjualanCashPending = calculateTotal(transaksiCashPending);
    const totalPenjualanQrisPending = calculateTotal(transaksiQrisPending);

    res.status(200).json({
      status: 200,
      message: 'Data rekap harian berhasil diambil',
      totalPenjualanSuccess,
      totalPenjualanPending,
      totalPenjualanCashSuccess,
      totalPenjualanQrisSuccess,
      totalPenjualanCashPending,
      totalPenjualanQrisPending,
      data: {
        transaksiSuccess,
        transaksiPending,
      },
    });
  } catch (error) {
    console.error('Error in rekapHarianUser:', error.message);
    res.status(500).json({ message: error.message });
  }
};


exports.getTransaksiByUser = async (req, res) => {
  // const { useruuid } = req.params;
  try {
    const user = req.user
      const transaksi = await Transaksi.findAll({
          where: { useruuid:user.uuid },
          include: [
              {
                  model: TransaksiDetail,
                  include: [
                      {
                          model: Barang,
                          attributes: ['namabarang', 'harga'],
                      },
                  ],
              },
              {
                  model: User,
                  attributes:['uuid','username','role','cabanguuid'],
                  include: [
                      {
                          model: Cabang,
                          attributes: ['namacabang', 'alamat'],
                      },
                  ],
                  attributes: ['username', 'role'], 
              },
          ],
      });

      if (!transaksi || transaksi.length === 0) {
          return res.status(404).json({ message: "No transactions found for this user" });
      }

      res.status(200).json({
          status: 200,
          message: 'success',
          data: transaksi,
      });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};


exports.getTransaksiCabang = async (req,res) => {
  try {
    const user = req.user;
    if (user.role !== "admin" || "superadmin") {
      return res.status(403).json({
        status: 403,
        message: "Access forbidden. Only admins can access this data.",
      });
    }
    if (!user.cabanguuid) {
      return res.status(400).json({
        status: 400,
        message: "Cabang UUID is missing for this admin.",
      });
    }

  const transaksi = await Transaksi.findAll({
      where: { "$User.cabanguuid$": user.cabanguuid },
      attributes: ["uuid", "totaljual", "useruuid", "tanggal", "pembayaran", "status_pembayaran","createdAt","tableId"],
      include: [
        {
          model: User,
          attributes: ["uuid", "username", "cabanguuid"],
          include: [
            {
              model: Cabang,
              attributes: ["uuid", "namacabang"],
              required: true,
                    }
                ]
            },
            {
              model: Table,
              attributes: ['id', 'name'],
              include:[{
                model: Cabang,
                attributes: ['uuid', 'namacabang']
              }]
            }
        ]
    });
    const groupedTransaksi = transaksi.reduce((acc, item) => {
        const cabangName = item.User.Cabang?.namacabang || 'Tanpa Cabang';
        if (!acc[cabangName]) {
            acc[cabangName] = { namacabang: cabangName, transaksi: [] };
        }
        acc[cabangName].transaksi.push(item);
        return acc;
    }, {});

    res.status(200).json({
        status: 200,
        message: 'Success',
        data: groupedTransaksi
    });
} catch (error) {
    res.status(500).json({ message: error.message });
}
};


//--------------TRANSAKSI STATUS NOTIFIKASI--------//

//------------TRANSAKSI QRIS-------------//
exports.createTransaksi = async (req, res) => {
  const t = await db.transaction();

  try {
    const { pembayaran, items } = req.body;
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Silahkan login terlebih dahulu",
      });
    }
    if (user.role !== 'kasir') {
      return res.status(403).json({
        status: false,
        message: "Anda tidak memiliki akses untuk melakukan transaksi",
      });
    }
    if (!pembayaran || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Data tidak lengkap atau format tidak sesuai",
      });
    }
    const barangUuids = items.map((item) => item.baranguuid);
    const barangList = await Barang.findAll({
      where: { uuid: barangUuids },
      attributes: ['uuid', 'namabarang', 'harga'],
    });

    const barangMap = new Map(barangList.map((barang) => [barang.uuid, barang]));
    let totaljual = 0;

    const validatedItems = items.map((item) => {
      const barang = barangMap.get(item.baranguuid);
      if (!barang) {
        throw new Error(`Barang dengan UUID ${item.baranguuid} tidak ditemukan`);
      }
      const total = parseFloat(barang.harga) * item.jumlahbarang;
      totaljual += total;
      return {
        ...item,
        harga: barang.harga,
        total,
      };
    });

    const orderId = `ORDER-${new Date().getTime()}`;
    const transaksi = await Transaksi.create(
      {
        order_id: orderId,
        useruuid: user.uuid,
        totaljual,
        pembayaran,
        status_pembayaran: pembayaran === 'cash' ? 'settlement' : 'pending',
        tanggal: new Date(),
      },
      { transaction: t }
      
    );

    const transaksiDetails = await Promise.all(
      validatedItems.map((item) =>
        TransaksiDetail.create(
          {
            transaksiuuid: transaksi.uuid,
            baranguuid: item.baranguuid,
            jumlahbarang: item.jumlahbarang,
            harga: item.harga,
            total: item.total,
          },
          { transaction: t }
        )
      )
    );

    let response = {
      status: true,
      message: "Transaksi berhasil dibuat",
      data: {
        transaksi: {
          ...transaksi.toJSON(),
          details: transaksiDetails,
        },
      },
    };

    //---------------integrasi qris ----------------
    if (pembayaran === 'qris') {
      const parameter = {
        payment_type: "qris",
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
          first_name: user.username,
          email: user.email
        }
      };

      const midtransResponse = await coreApi.charge(parameter);

      const qrisUrl = midtransResponse.actions?.find(
        action => action.name === 'generate-qr-code'
      )?.url;
    
      if (!qrisUrl) {
        throw new Error("Gagal mendapatkan URL QRIS dari Midtrans");
      }
      
      response.data.qris_data = {
        qr_string: midtransResponse.qr_string,
        payment_code: midtransResponse.payment_code,
       // generated_image_url: midtransResponse.qr_code_url
        generated_image_url: qrisUrl
      };
    }
    await t.commit();
    return res.status(201).json(response);
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

//---------------TRANSAKSI BANYAK OPSI-----------------
// exports.createTransaksi = async (req, res) => {
//   const t = await db.transaction();

//   try {
//     const { pembayaran, items } = req.body;
//     const user = req.user;
//     if (!user) {
//       return res.status(401).json({
//         status: false,
//         message: "Silahkan login terlebih dahulu",
//       });
//     }
//         if (user.role !== 'kasir') {
//           return res.status(403).json({
//             status: false,
//             message: "Anda tidak memiliki akses untuk melakukan transaksi",
//           });
//         }
//     // Validasi input
//     if (!pembayaran || !items || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         status: false,
//         message: "Data tidak lengkap atau format tidak sesuai",
//       });
//     }

//     // Validasi barang
//     const barangUuids = items.map((item) => item.baranguuid);
//     const barangList = await Barang.findAll({
//       where: { uuid: barangUuids },
//     });

//     const barangMap = new Map(barangList.map((barang) => [barang.uuid, barang]));
//     let totaljual = 0;

//     const validatedItems = items.map((item) => {
//       const barang = barangMap.get(item.baranguuid);
//       if (!barang) {
//         throw new Error(`Barang dengan UUID ${item.baranguuid} tidak ditemukan`);
//       }
//       const total = parseFloat(barang.harga) * item.jumlahbarang;
//       totaljual += total;
//       return {
//         ...item,
//         harga: barang.harga,
//         total,
//       };
//     });

//     // table transaksi
//     const orderId = `ORDER-${new Date().getTime()}`;
//     const transaksi = await Transaksi.create(
//       {
//         order_id: orderId,
//         useruuid: user.uuid,
//         totaljual,
//         pembayaran,
//         status_pembayaran: pembayaran === 'cash' ? 'settlement' : 'pending',
//         tanggal: new Date(),
//       },
//       { transaction: t }
      
//     );

//     // table detail transaksi
//     const transaksiDetails = await Promise.all(
//       validatedItems.map((item) =>
//         TransaksiDetail.create(
//           {
//             transaksiuuid: transaksi.uuid,
//             baranguuid: item.baranguuid,
//             jumlahbarang: item.jumlahbarang,
//             harga: item.harga,
//             total: item.total,
//           },
//           { transaction: t }
//         )
//       )
//     );

//     let response = {
//       status: true,
//       message: "Transaksi berhasil dibuat",
//       data: {
//         transaksi: {
//           ...transaksi.toJSON(),
//           details: transaksiDetails,
//         },
//       },
//     };

//     // Integrasi dengan Midtrans
//     if (pembayaran === 'qris') {
//       const parameter = {
//         transaction_details: {
//           order_id: transaksi.order_id,
//           gross_amount: totaljual,
//         },
//         customer_details: {
//           first_name: user.username,
//           email: user.email,
//         },
//         payment_type: 'qris',
//       };
//       const midtransResponse = await snap.createTransaction(parameter);
//       response.data.qris_url = midtransResponse.redirect_url;
//     } else if (pembayaran === 'credit_card') {
//       const parameter = {
//         transaction_details: {
//           order_id: transaksi.order_id,
//           gross_amount: totaljual,
//         },
//         customer_details: {
//           first_name: user.username,
//           email: user.email,
//         },
//         payment_type: 'credit_card',
//       };
//       const midtransResponse = await snap.createTransaction(parameter);
//       response.data.payment_url = midtransResponse.redirect_url;
//     } else if (pembayaran === 'bank_transfer') {
//       const parameter = {
//         transaction_details: {
//           order_id: transaksi.order_id,
//           gross_amount: totaljual,
//         },
//         customer_details: {
//           first_name: user.username,
//           email: user.email,
//         },
//         payment_type: 'bank_transfer',
//       };
//       const midtransResponse = await snap.createTransaction(parameter);
//       response.data.payment_url = midtransResponse.redirect_url;
//     }

//     await t.commit();
//     return res.status(201).json(response);
//   } catch (error) {
//     await t.rollback();
//     return res.status(500).json({
//       status: false,
//       message: error.message,
//     });
//   }
// };



exports.updateTransaksi = async (req, res) => {
  const { uuid } = req.params; 
  const { pembayaran, items } = req.body;
  const t = await db.transaction();

  try {
    const transaksi = await Transaksi.findByPk(uuid, { transaction: t });

    if (!transaksi) {
      await t.rollback();
      return res.status(404).json({ 
        status: false, 
        message: "Transaksi tidak ditemukan" 
      });
    }
    if (pembayaran) {
      transaksi.pembayaran = pembayaran;
      transaksi.status_pembayaran = pembayaran === 'cash' ? 'settlement' : 'pending';
    }

    if (items && Array.isArray(items) && items.length > 0) {
      const barangUuids = items.map((item) => item.baranguuid);
      const barangList = await Barang.findAll({
        where: { uuid: barangUuids },
        transaction: t
      });

      if (barangList.length !== items.length) {
        await t.rollback();
        return res.status(404).json({ 
          status: false, 
          message: "Beberapa barang tidak ditemukan" 
        });
      }
      const barangMap = new Map(
        barangList.map((barang) => [barang.uuid, barang])
      );

      let totaljual = 0;

      const updatedDetails = items.map((item) => {
        const barang = barangMap.get(item.baranguuid);

        if (!barang) {
          throw new Error(`Barang dengan UUID ${item.baranguuid} tidak ditemukan`);
        }

        const total = parseFloat(barang.harga) * item.jumlahbarang;
        totaljual += total;

        return {
          transaksiuuid: transaksi.uuid,
          baranguuid: item.baranguuid,
          jumlahbarang: item.jumlahbarang,
          pembayaran,
          status_pembayaran: pembayaran === 'cash' ? 'settlement' : 'pending',
          harga: barang.harga,
          total
        };
      });
      await TransaksiDetail.destroy({ 
        where: { transaksiuuid: transaksi.uuid },
        transaction: t 
      });
      await TransaksiDetail.bulkCreate(updatedDetails, { transaction: t });
      transaksi.totaljual = totaljual;
    }
    await transaksi.save({ transaction: t });

    await t.commit();

    return res.status(200).json({
      status: true,
      message: "Transaksi berhasil diperbarui",
      data: transaksi
    });

  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};
exports.deleteTransaksi = async (req, res) => {
  const { uuid } = req.params;
  const t = await db.transaction();

  try {

      const transaksi = await Transaksi.findByPk(uuid, { transaction: t });

      if (!transaksi) {
          await t.rollback();
          return res.status(404).json({ message: "Transaksi tidak ditemukan" });
      }

      const transaksiDetails = await TransaksiDetail.findAll({
          where: { transaksiuuid: uuid },
          transaction: t
      });
      if (transaksi.status_pembayaran === 'settlement') {
          await Promise.all(transaksiDetails.map(async (detail) => {
              if (transaksi.cabanguuid) {
                  // Update stok barang cabang
                  await BarangCabang.update(
                      { stok: Sequelize.literal(`stok + ${detail.jumlahbarang}`) },
                      { 
                          where: { 
                              baranguuid: detail.baranguuid, 
                              cabanguuid: transaksi.cabanguuid 
                          },
                          transaction: t
                      }
                  );
                  await mutasiStok.destroy({
                      where: {
                          baranguuid: detail.baranguuid,
                          cabanguuid: transaksi.cabanguuid,
                          keterangan: `Transaksi ${transaksi.order_id}`
                      },
                      transaction: t
                  });
              }
          }));
      }
      for (let detail of transaksiDetails) {
          await JurnalAkuntansi.destroy({
              where: {
                  deskripsi: { [Sequelize.Op.like]: `%${detail.baranguuid}%` },
                  jenis_transaksi: 'penjualan',
                  baranguuid: detail.baranguuid,
                  jumlah: detail.jumlahbarang,
                  harga_satuan: detail.harga,
                  total_harga: detail.total,
                  ...(transaksi.cabanguuid && { cabanguuid: transaksi.cabanguuid })
              },
              transaction: t
          });
      }
      await TransaksiDetail.destroy({ 
          where: { transaksiuuid: uuid }, 
          transaction: t 
      });
      await transaksi.destroy({ transaction: t });

      await t.commit();

      return res.status(200).json({
          status: 200,
          message: "Transaksi berhasil dihapus beserta data terkait",
      });

  } catch (error) {
      await t.rollback();
      return res.status(500).json({ message: error.message });
  }
};