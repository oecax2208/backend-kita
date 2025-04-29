const express = require('express')
const {getDistribusiStok, getDistribusiStokById,createDistribusi,updateDistribusi,deleteDistribusi} = require('../controller/distribusiStokController')
const {verifyUser, superAdminOnly, adminOnly} = require('../middleware/userMiddleware')
const router = express.Router()


router.get('/getdistribusistok',verifyUser,getDistribusiStok)
router.get('/getdistribusistok/:id',verifyUser,getDistribusiStokById)
router.post('/createdistribusistok',verifyUser,superAdminOnly,createDistribusi)
router.put('/updatedistribusistok/:id',verifyUser,adminOnly,updateDistribusi)
router.delete('/deletedistribusistok/:id',verifyUser,superAdminOnly,deleteDistribusi)

module.exports = router