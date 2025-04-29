const express = require('express')
const rekapController = require('../controller/rekapAllController');
const {verifyUser, adminOnly,superAdminOnly} = require('../middleware/userMiddleware')
const router = express.Router()

router.get('/rekap', verifyUser, rekapController.getRekapTransaksi);
router.get('/komprehensif', verifyUser, rekapController.getRekapKomprehensif);
router.get('/stok-per-cabang', verifyUser, rekapController.getStokPerCabang);
router.get('/penjualan-per-kategori', verifyUser, rekapController.getPenjualanPerKategori);


module.exports = router