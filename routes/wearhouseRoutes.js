const express = require('express')
const {getWearhouseData,getWearhouseDataByUuid,createDataWearhouse
    ,updateDataWearhouse
    ,deleteDataWearhouse} = require('../controller/wearhouseController')

const {verifyUser, adminOnly, superAdminOnly} = require('../middleware/userMiddleware')

const router = express.Router()

router.get('/getdatawearhouse',verifyUser,superAdminOnly,getWearhouseData)
router.get('/getdatawearhousebyuuid/:uuid',verifyUser,superAdminOnly,getWearhouseDataByUuid)
router.post('/createwearhouse',verifyUser,superAdminOnly,createDataWearhouse)
router.put('/updatewearhouse/:uuid',verifyUser,superAdminOnly,updateDataWearhouse)
router.delete('/deletewearhouse/:uuid',verifyUser,superAdminOnly,deleteDataWearhouse)

module.exports = router
