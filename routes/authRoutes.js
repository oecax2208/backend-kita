const express = require('express')
const {login, me, logOut} = require('../controller/authController')

const router = express.Router()

router.post('/login', login)
router.get('/me', me)
router.delete('/logout', logOut)
module.exports = router;