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
//---------------TEST TRANSAKSICabangQRIS----------------

//belum pengecekan stok
// exports.createTransaksiCabang = async (req, res) => {
//     const t = await db.transaction();
  
//     try {
//       const { pembayaran, items } = req.body;
//       const user = req.user;
  
//       if (!user) {
//         return res.status(401).json({
//           status: false,
//           message: "Silahkan login terlebih dahulu",
//         });
//       }
//       if (user.role !== 'kasir') {
//         return res.status(403).json({
//           status: false,
//           message: "Anda tidak memiliki akses untuk melakukan transaksi",
//         });
//       }
  
//       if (!pembayaran || !items || !Array.isArray(items) || items.length === 0) {
//         return res.status(400).json({
//           status: false,
//           message: "Data tidak lengkap atau format tidak sesuai",
//         });
//       }
//       const barangUuids = items.map(item => item.baranguuid);
//       const availableProducts = await Barang.findAll({
//         include: [{
//           model: BarangCabang,
//           where: { cabanguuid: user.cabanguuid },
//           attributes: []
//         }],
//         where: { uuid: barangUuids },
//         attributes: ['uuid', 'namabarang', 'harga']
//       });
  
//       if (availableProducts.length !== barangUuids.length) {
//         return res.status(400).json({
//           status: false,
//           message: "Beberapa barang tidak tersedia di cabang ini"
//         });
//       }
  
//       const barangMap = new Map(
//         availableProducts.map(barang => [barang.uuid, barang])
//       );
  
//       let totaljual = 0;
  
  
//       const validatedItems = items.map(item => {
//         const barang = barangMap.get(item.baranguuid);
//         if (!barang) {
//           throw new Error(`Barang dengan UUID ${item.baranguuid} tidak ditemukan`);
//         }
        
//         const total = parseFloat(barang.harga) * item.jumlahbarang;
//         totaljual += total;
  
//         return {
//           ...item,
//           harga: barang.harga,
//           total,
//         };
//       });
  
  
//       const orderId = `ORDER-${new Date().getTime()}`;
//       const transaksi = await Transaksi.create({
//         order_id: orderId,
//         useruuid: user.uuid,
//         cabanguuid: user.cabanguuid,
//         totaljual,
//         pembayaran,
//         status_pembayaran: pembayaran === 'cash' ? 'settlement' : 'pending',
//         tanggal: new Date(),
//       }, { transaction: t });
  
//       await Promise.all(validatedItems.map(async (item) => {
    
//         await TransaksiDetail.create({
//           transaksiuuid: transaksi.uuid,
//           baranguuid: item.baranguuid,
//           jumlahbarang: item.jumlahbarang,
//           harga: item.harga,
//           total: item.total,
//         }, { transaction: t });
//       }));
  
//       let response = {
//         status: true,
//         message: "Transaksi berhasil dibuat",
//         data: {
//           transaksi: {
//             ...transaksi.toJSON(),
//             details: validatedItems
//           },
//         },
//       };
  
//       if (pembayaran === 'qris') {
//         const parameter = {
//           payment_type: "qris",
//           transaction_details: {
//             order_id: orderId,
//             gross_amount: parseInt(totaljual)
//           },
//           item_details: validatedItems.map(item => ({
//             id: item.baranguuid,
//             price: parseInt(item.harga),
//             quantity: parseInt(item.jumlahbarang),
//             name: barangMap.get(item.baranguuid).namabarang
//           })),
//           customer_details: {
//             first_name: user.username,
//             email: user.email
//           }
//         };
  
//         const midtransResponse = await coreApi.charge(parameter);
//         const qrisUrl = midtransResponse.actions?.find(
//           action => action.name === 'generate-qr-code'
//         )?.url;
  
//         if (!qrisUrl) {
//           throw new Error("Gagal mendapatkan URL QRIS dari Midtrans");
//         }
  
//         response.data.qris_data = {
//           qr_string: midtransResponse.qr_string,
//           payment_code: midtransResponse.payment_code,
//           generated_image_url: qrisUrl
//         };
//       }
  
//       await t.commit();
//       return res.status(201).json(response);
  
//     } catch (error) {
//       await t.rollback();
//       return res.status(500).json({
//         status: false,
//         message: error.message,
//       });
//     }
//   };
exports.createTransaksiCabang = async (req, res) => {
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
  
        const barangUuids = items.map(item => item.baranguuid);
        const availableProducts = await BarangCabang.findAll({
            where: {
                cabanguuid: user.cabanguuid,
                baranguuid: barangUuids,
            },
            include: [{
                model: Barang,
                attributes: ['uuid', 'namabarang', 'harga']
            }],
            transaction: t
        });
  
        if (availableProducts.length !== barangUuids.length) {
            return res.status(400).json({
                status: false,
                message: "Beberapa barang tidak tersedia di cabang ini"
            });
        }
  
        let totaljual = 0;
        const barangMap = new Map();
        const stokKurangi = [];
  
        availableProducts.forEach(barangCabang => {
            barangMap.set(barangCabang.baranguuid, {
                ...barangCabang.Barang.get(),
                stok: barangCabang.stok
            });
        });
  
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
  
            stokKurangi.push({
                baranguuid: item.baranguuid,
                cabanguuid: user.cabanguuid,
                jumlah: item.jumlahbarang
            });
  
            return {
                ...item,
                harga: barang.harga,
                total,
            };
        });
        
        const orderId = `ORDER-${new Date().getTime()}`;
        const transaksi = await Transaksi.create({
            order_id: orderId,
            useruuid: user.uuid,
            cabanguuid: user.cabanguuid,
            totaljual,
            pembayaran,
            status_pembayaran: pembayaran === 'cash' ? 'settlement' : 'pending',
            tanggal: new Date(),
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
        
        if (pembayaran === 'cash') {
          await Promise.all(stokKurangi.map(async (stok) => {
            console.log(`⏳ Mengurangi stok: Barang UUID: ${stok.baranguuid}, Cabang UUID: ${stok.cabanguuid}, Jumlah: ${stok.jumlah}`);
        
            const [affectedRows] = await BarangCabang.update(
                { stok: Sequelize.literal(`stok - ${stok.jumlah}`) },
                { where: { baranguuid: stok.baranguuid, cabanguuid: stok.cabanguuid }, transaction: t }
            );
        
            if (affectedRows === 0) {
                throw new Error(`❌ Gagal mengurangi stok untuk Barang UUID: ${stok.baranguuid}`);
            }
        
            const updatedBarangCabang = await BarangCabang.findOne({
                where: { baranguuid: stok.baranguuid, cabanguuid: stok.cabanguuid },
                transaction: t
            });
        
            console.log(`✅ Stok setelah pengurangan: Barang UUID: ${stok.baranguuid}, Stok Sekarang: ${updatedBarangCabang.stok}`);
        
            console.log(`⏳ Mencatat mutasi stok untuk Barang UUID: ${stok.baranguuid}`);
        
            const mutasi = await mutasiStok.create({
                baranguuid: stok.baranguuid,
                cabanguuid: stok.cabanguuid,
                jenis_mutasi: 'keluar',
                jumlah: stok.jumlah,
                keterangan: `Transaksi ${orderId}`,
            }, { transaction: t });
        
            console.log(`✅ Mutasi stok berhasil dicatat: ${mutasi.uuid}`);
          }));
          
          const total_transaksi = totaljual; 
          const deskripsiTransaksi = validatedItems.map(item => 
              `Penjualan ${item.baranguuid} (${item.jumlahbarang} pcs)`
          ).join(", ");
          
          await Promise.all(validatedItems.map(async (item) => {
              await jurnalAkutansi.create({
                  cabanguuid: req.user.cabanguuid,
                  baranguuid: item.baranguuid,
                  jumlah: item.jumlahbarang,
                  harga_satuan: item.harga,
                  total_harga: item.total,
                  deskripsi: `Penjualan ${item.baranguuid} (${item.jumlahbarang} pcs)`,
                  debit: 0,
                  jenis_transaksi: 'penjualan',
                  kredit: item.total,
                  saldo: item.total,
              }, { transaction: t });
          }));
        }
        
        let response = {
            status: true,
            message: "Transaksi berhasil dibuat",
            data: {
                transaksi: {
                    ...transaksi.toJSON(),
                    details: validatedItems
                },
            },
        };
  
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
  

//====================BUG SAAT TRANSAKSI DI CREATE QRIS 
// exports.createTransaksiCabang = async (req, res) => {
//   const t = await db.transaction();

//   try {
//       const { pembayaran, items } = req.body;
//       const user = req.user;

//       if (!user) {
//           return res.status(401).json({
//               status: false,
//               message: "Silahkan login terlebih dahulu",
//           });
//       }

//       if (user.role !== 'kasir') {
//           return res.status(403).json({
//               status: false,
//               message: "Anda tidak memiliki akses untuk melakukan transaksi",
//           });
//       }

//       if (!pembayaran || !items || !Array.isArray(items) || items.length === 0) {
//           return res.status(400).json({
//               status: false,
//               message: "Data tidak lengkap atau format tidak sesuai",
//           });
//       }

//       const barangUuids = items.map(item => item.baranguuid);
//       const availableProducts = await BarangCabang.findAll({
//           where: {
//               cabanguuid: user.cabanguuid,
//               baranguuid: barangUuids,
//           },
//           include: [{
//               model: Barang,
//               attributes: ['uuid', 'namabarang', 'harga']
//           }],
//           transaction: t
//       });

//       if (availableProducts.length !== barangUuids.length) {
//           return res.status(400).json({
//               status: false,
//               message: "Beberapa barang tidak tersedia di cabang ini"
//           });
//       }

//       let totaljual = 0;
//       const barangMap = new Map();
//       const stokKurangi = [];

//       availableProducts.forEach(barangCabang => {
//           barangMap.set(barangCabang.baranguuid, {
//               ...barangCabang.Barang.get(),
//               stok: barangCabang.stok
//           });
//       });

//       const validatedItems = items.map(item => {
//           const barang = barangMap.get(item.baranguuid);
//           if (!barang) {
//               throw new Error(`Barang dengan UUID ${item.baranguuid} tidak ditemukan`);
//           }

//           if (item.jumlahbarang > barang.stok) {
//               throw new Error(`Stok tidak mencukupi untuk barang: ${barang.namabarang}`);
//           }

//           const total = parseFloat(barang.harga) * item.jumlahbarang;
//           totaljual += total;

//           stokKurangi.push({
//               baranguuid: item.baranguuid,
//               cabanguuid: user.cabanguuid,
//               jumlah: item.jumlahbarang
//           });

//           return {
//               ...item,
//               harga: barang.harga,
//               total,
//           };
//       });
//       const orderId = `ORDER-${new Date().getTime()}`;
//       const transaksi = await Transaksi.create({
//           order_id: orderId,
//           useruuid: user.uuid,
//           cabanguuid: user.cabanguuid,
//           totaljual,
//           pembayaran,
//           status_pembayaran: pembayaran === 'cash' ? 'settlement' : 'pending',
//           tanggal: new Date(),
//       }, { transaction: t });
//       await Promise.all(validatedItems.map(async (item) => {
//         await TransaksiDetail.create({
//             transaksiuuid: transaksi.uuid,
//             baranguuid: item.baranguuid,
//             jumlahbarang: item.jumlahbarang,
//             harga: item.harga,
//             total: item.total,
//         }, { transaction: t });
//       }));
//       await Promise.all(stokKurangi.map(async (stok) => {
//         console.log(`⏳ Mengurangi stok: Barang UUID: ${stok.baranguuid}, Cabang UUID: ${stok.cabanguuid}, Jumlah: ${stok.jumlah}`);
    
//         const [affectedRows] = await BarangCabang.update(
//             { stok: Sequelize.literal(`stok - ${stok.jumlah}`) },
//             { where: { baranguuid: stok.baranguuid, cabanguuid: stok.cabanguuid }, transaction: t }
//         );
    
//         if (affectedRows === 0) {
//             throw new Error(`❌ Gagal mengurangi stok untuk Barang UUID: ${stok.baranguuid}`);
//         }
    
//         const updatedBarangCabang = await BarangCabang.findOne({
//             where: { baranguuid: stok.baranguuid, cabanguuid: stok.cabanguuid },
//             transaction: t
//         });
    
//         console.log(`✅ Stok setelah pengurangan: Barang UUID: ${stok.baranguuid}, Stok Sekarang: ${updatedBarangCabang.stok}`);
    
//         console.log(`⏳ Mencatat mutasi stok untuk Barang UUID: ${stok.baranguuid}`);
    
//         const mutasi = await mutasiStok.create({
//             baranguuid: stok.baranguuid,
//             cabanguuid: stok.cabanguuid,
//             jenis_mutasi: 'keluar',
//             jumlah: stok.jumlah,
//             keterangan: `Transaksi ${orderId}`,
//         }, { transaction: t });
    
//         console.log(`✅ Mutasi stok berhasil dicatat: ${mutasi.uuid}`);
//     }));
    
//     const total_transaksi = totaljual; 
//     const deskripsiTransaksi = validatedItems.map(item => 
//         `Penjualan ${item.baranguuid} (${item.jumlahbarang} pcs)`
//     ).join(", ");
    
//     await Promise.all(validatedItems.map(async (item) => {
//         await jurnalAkutansi.create({
//             cabanguuid: req.user.cabanguuid,
//             baranguuid: item.baranguuid,
//             jumlah: item.jumlahbarang,
//             harga_satuan: item.harga,
//             total_harga: item.total,
//             deskripsi: `Penjualan ${item.baranguuid} (${item.jumlahbarang} pcs)`,
//             debit: 0,
//             jenis_transaksi: 'penjualan',
//             kredit: item.total,
//             saldo: item.total,
//         }, { transaction: t });
//     }));
//       let response = {
//           status: true,
//           message: "Transaksi berhasil dibuat",
//           data: {
//               transaksi: {
//                   ...transaksi.toJSON(),
//                   details: validatedItems
//               },
//           },
//       };

//       if (pembayaran === 'qris') {
//           const parameter = {
//               payment_type: "qris",
//               transaction_details: {
//                   order_id: orderId,
//                   gross_amount: parseInt(totaljual)
//               },
//               item_details: validatedItems.map(item => ({
//                   id: item.baranguuid,
//                   price: parseInt(item.harga),
//                   quantity: parseInt(item.jumlahbarang),
//                   name: barangMap.get(item.baranguuid).namabarang
//               })),
//               customer_details: {
//                   first_name: user.username,
//                   email: user.email
//               }
//           };

//           const midtransResponse = await coreApi.charge(parameter);
//           const qrisUrl = midtransResponse.actions?.find(
//               action => action.name === 'generate-qr-code'
//           )?.url;

//           if (!qrisUrl) {
//               throw new Error("Gagal mendapatkan URL QRIS dari Midtrans");
//           }

//           response.data.qris_data = {
//               qr_string: midtransResponse.qr_string,
//               payment_code: midtransResponse.payment_code,
//               generated_image_url: qrisUrl
//           };
//       }
  


//       await t.commit();
 
//       return res.status(201).json(response);

//   } catch (error) {
//       await t.rollback();
//       return res.status(500).json({
//           status: false,
//           message: error.message,
//       });
//   }
// };

  
  //---------------TRANSAKSI CABANG BANYAK OPSI  SNAP-----------------
// exports.createTransaksiCabang = async (req, res) => {
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
//     if (user.role !== 'kasir') {
//       return res.status(403).json({
//         status: false,
//         message: "Anda tidak memiliki akses untuk melakukan transaksi",
//       });
//     }
//     if (!pembayaran || !items || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         status: false,
//         message: "Data tidak lengkap atau format tidak sesuai",
//       });
//     }
//     const barangUuids = items.map((item) => item.baranguuid);
//     const availableProducts = await Barang.findAll({
//       include: [
//         {
//           model: BarangCabang,
//           where: { cabanguuid: user.cabanguuid },
//           attributes: [],
//         },
//       ],
//       where: { uuid: barangUuids },
//       attributes: ['uuid', 'namabarang', 'harga'],
//     });

//     if (availableProducts.length !== barangUuids.length) {
//       return res.status(400).json({
//         status: false,
//         message: "Beberapa barang tidak tersedia di cabang ini",
//       });
//     }

//     const barangMap = new Map(
//       availableProducts.map((barang) => [barang.uuid, barang])
//     );
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

//     // Buat transaksi utama
//     const orderId = `ORDER-${new Date().getTime()}`;
//     const transaksi = await Transaksi.create(
//       {
//         order_id: orderId,
//         useruuid: user.uuid,
//         cabanguuid: user.cabanguuid,
//         totaljual,
//         pembayaran,
//         status_pembayaran: pembayaran === 'cash' ? 'settlement' : 'pending',
//         tanggal: new Date(),
//       },
//       { transaction: t }
//     );

//     // Tambahkan detail transaksi
//     await Promise.all(
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
//           details: validatedItems,
//         },
//       },
//     };

//     // Integrasi Midtrans 
//      if (pembayaran === 'qris') {
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