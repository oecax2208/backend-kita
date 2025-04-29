const express = require('express')
const {createStokCabang, cekStokCabang} = require('../controller/stockController')
const {verifyUser,superAdminOnly } = require('../middleware/userMiddleware')

const router = express.Router()


router.post('/createstock',verifyUser,superAdminOnly , createStokCabang)
router.get('/cekstock', verifyUser,cekStokCabang)

module.exports = router;