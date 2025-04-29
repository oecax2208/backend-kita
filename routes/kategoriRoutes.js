const express = require('express')
const {
    getKategori,
    getKategoriByUuid,
    createKategori,
    updateKategori,
    deleteKategori
} = require('../controller/kategoriController')
const {verifyUser, adminOnly,superAdminOnly} = require('../middleware/userMiddleware')

const router = express.Router();
router.get('/kategori', getKategori);
router.get('/kategori/:uuid',verifyUser, getKategoriByUuid);
router.post('/createkategori',verifyUser,adminOnly, createKategori);
router.put('/updatekategori/:uuid',verifyUser,adminOnly, updateKategori);
router.delete('/deletekategori/:uuid',verifyUser,adminOnly, deleteKategori);
module.exports = router;
