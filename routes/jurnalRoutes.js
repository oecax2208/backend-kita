const express = require('express')
const {getSaldoDanDebit,getSaldoDanTransaksi,createJurnalFromTransaksi,crateJurnal,getJurnal,getSaldoTerkini}= require('../controller/jurnalAkutansiController')
const {verifyUser,superAdminOnly} = require('../middleware/userMiddleware')
const router = express.Router()

router.get('/getsaldodandebit',verifyUser,superAdminOnly,getSaldoDanDebit)
router.get('/getsaldotransaksi',verifyUser,superAdminOnly,getSaldoDanTransaksi)
router.post('/createcekjurnal',verifyUser,superAdminOnly,createJurnalFromTransaksi)
router.get('/saldoterkini',verifyUser,superAdminOnly,getSaldoTerkini)
router.get('/getjurnal',verifyUser,superAdminOnly,getJurnal)
router.post('/createjurnal',verifyUser,superAdminOnly,crateJurnal)

module.exports = router

