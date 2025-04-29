const express = require('express');
const router = express.Router();
const {laporan, chartLaporan, laporandetail,exportLaporan} = require('../controller/laporanController')
const {verifyUser, adminOnly} = require('../middleware/userMiddleware')

router.get('/laporan',verifyUser, laporan);
router.get('/export-laporan',verifyUser, exportLaporan);
router.get('/chartLaporan',verifyUser, chartLaporan);
router.get('/laporandetail',verifyUser, laporandetail);

module.exports = router;
