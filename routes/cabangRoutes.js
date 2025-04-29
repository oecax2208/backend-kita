const express = require('express')
const {
    getCabang,
    getCabangByUuid,
    createCabang,
    updateCabang,
    deleteCabang

} = require('../controller/cabangController')
const {verifyUser, adminOnly,superAdminOnly} = require('../middleware/userMiddleware')

const router = express.Router()

router.get('/cabang',verifyUser, getCabang)
router.get('/cabang/:uuid', verifyUser,getCabangByUuid)
router.post('/createcabang',verifyUser,superAdminOnly, createCabang)
router.put('/updatecabang/:uuid',verifyUser,superAdminOnly, updateCabang)
router.delete('/deletecabang/:uuid'
    //,verifyUser
    //saya non aktifkan untuk hal jahil saat demo
    ,superAdminOnly, deleteCabang)

module.exports = router