const express = require('express')
const {
    getUser,
    getUserByUuid,
    getUserCabang,
    createUser,
    updateUser,
    deleteUser,
    updateByUser
} = require('../controller/userController')
const { verifyUser, adminOnly,superAdminOnly } = require('../middleware/userMiddleware')


const router = express.Router()

router.get('/getuser',verifyUser,superAdminOnly,getUser)
router.get('/getusercabang',verifyUser,adminOnly,getUserCabang)
router.get('/getuser/:uuid',verifyUser,getUserByUuid)
router.post('/createuser',verifyUser,createUser)
router.put('/updateuser/:uuid',verifyUser,updateUser)
router.delete('/deleteuser/:uuid',verifyUser,superAdminOnly,deleteUser)
router.put('/updateuser/me/:uuid', verifyUser, updateByUser);


module.exports = router