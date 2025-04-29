const express = require('express')
const {getMutasiStock,mutasiTrackingCabang} = require('../controller/mutasiStockController')
const {verifyUser, adminOnly,superAdminOnly} = require('../middleware/userMiddleware')
const router = express.Router()

router.get('/getmutasi',verifyUser,superAdminOnly,getMutasiStock)
router.get('/getmutasitracking',verifyUser,adminOnly,mutasiTrackingCabang)

module.exports = router