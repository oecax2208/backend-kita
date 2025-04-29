const express = require('express')
const {getMeja,
    getMejaById,
    createMeja,
    updateMeja,
    deleteMeja,
    generateTableQR,
    getTableProducts
} = require('../controller/mejaController')
const{verifyUser,adminOnly} = require('../middleware/userMiddleware')
const router = express.Router()

router.get('/table/qr/:id',verifyUser,adminOnly,generateTableQR)
router.get('/tableproduk/:cabangUuid/:tableId',getTableProducts)
router.get('/getmeja',verifyUser,adminOnly,getMeja)
router.get('/getmeja/:id',verifyUser,adminOnly,getMejaById)
router.post('/createmeja',verifyUser,adminOnly,createMeja)
router.put('/updatemeja/:id',verifyUser,adminOnly,updateMeja)
router.delete('/deletemeja/:id',verifyUser,adminOnly,deleteMeja)

module.exports = router;