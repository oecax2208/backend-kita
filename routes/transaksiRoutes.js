const express = require('express')
const{getTransaksi,
    getTransaksiByUuid,
    getTransaksiCabang,
    getTransaksiByUser,
    rekapHarianUser,
    createTransaksi,
    updateTransaksi,
    deleteTransaksi,
    getTransaksinotification
     
} = require('../controller/transaksiController')
const { createTransaksiCabang } = require ('../controller/transaksiCabangController')
const { verifyUser, adminOnly,superAdminOnly } = require('../middleware/userMiddleware')
const { verifyMidtransSignature , midtransNotification} = require ('../config/midtransSignature')
//const { midtransNotification } = require('../config/midtransNotification')

const router = express.Router()

router.get('/gettransaksi',verifyUser,getTransaksi)
router.get('/gettransaksicabang',verifyUser,getTransaksiCabang)
router.get('/gettransaksiuser',verifyUser,getTransaksiByUser)
router.get('/transaksi/:uuid',getTransaksiByUuid)
router.get('/rekapharianuser/:tanggal?',verifyUser, rekapHarianUser)
router.post('/createtransaksicabang',verifyUser,createTransaksiCabang)
router.post('/createtransaksi',verifyUser,createTransaksi)
router.post('/midtrans-notification', verifyMidtransSignature, midtransNotification);
router.put('/updatetransaksi/:uuid',verifyUser,updateTransaksi)
router.delete('/deletetransaksi/:uuid',verifyUser,superAdminOnly,deleteTransaksi)
router.get('/gettransaksinotification/:order_id',getTransaksinotification)

module.exports = router;