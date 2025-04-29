const express = require('express')
const { uploadBarang } = require('../controller/uoloadExcelController')
const {verifyUser, superAdminOnly} = require('../middleware/userMiddleware')
const router = express.Router()

router.post('/upload',verifyUser, superAdminOnly,uploadBarang)

module.exports = router