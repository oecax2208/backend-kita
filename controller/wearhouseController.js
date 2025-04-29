const Wearhouse = require('../models/wearhouseModel');
const Barang = require('../models/barangModel');
const mutasiStok = require('../models/mutasiStokModel')
const Kategori = require('../models/kategoriModel')
const db = require('../config/database');

exports.getWearhouseData = async (req, res) => {
    try {
        const userLogin = req.user
    if(!userLogin){
      return res.status(401).json({message: 'Anda harus login terlebih dahulu'})
    }
        const wearhouses = await Wearhouse.findAll({
            include: { model: Barang,
                attributes:['uuid','namabarang','harga','kategoriuuid'],
                include: { model: Kategori, attributes: ['uuid', 'namakategori'] }
            }
        });
        return res.status(200).json({
            status: true,
            message: "Data Wearhouse berhasil diambil",
            data: wearhouses,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

exports.getWearhouseDataByUuid = async (req, res) => {
    try {
        const userLogin = req.user
    if(!userLogin){
      return res.status(401).json({message: 'Anda harus login terlebih dahulu'})
    }
        const { uuid } = req.params;
        const wearhouse = await Wearhouse.findOne({
            where: { uuid },
            include: { model: Barang }
        });

        if (!wearhouse) {
            return res.status(404).json({
                status: false,
                message: "Data tidak ditemukan",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Data Wearhouse berhasil diambil",
            data: wearhouse,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};

exports.createDataWearhouse = async (req, res) => {
    try {
        const userLogin = req.user
    if(!userLogin){
      return res.status(401).json({message: 'Anda harus login terlebih dahulu'})
    }
        const { baranguuid, stok_gudang } = req.body;

        if (!baranguuid || stok_gudang === undefined) {
            return res.status(400).json({ status: false, message: "Data tidak lengkap" });
        }

        const barang = await Barang.findByPk(baranguuid);
        if (!barang) {
            return res.status(404).json({ status: false, message: "Barang tidak ditemukan" });
        }

        let wearhouse = await Wearhouse.findOne({ where: { baranguuid } });
        const jumlahStok = parseInt(stok_gudang, 10);

        if (wearhouse) {
            wearhouse.stok_gudang = wearhouse.stok_gudang + jumlahStok;
            await wearhouse.save();
        }else {
            wearhouse = await Wearhouse.create({ baranguuid, stok_gudang: jumlahStok });
            keterangan = "Barang stok baru";
        }
        const keterangan = "Barang masuk baru"
        await mutasiStok.create({
            baranguuid,
            jenis_mutasi: 'masuk',
            jumlah: jumlahStok,
            keterangan: keterangan
        });
       // console.log(keterangan)

        return res.status(201).json({ status: true, message: "Data Wearhouse berhasil diperbarui", data: wearhouse });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Terjadi kesalahan pada server" });
    }
};
exports.updateDataWearhouse = async (req, res) => {
    try {
        const userLogin = req.user;
        if (!userLogin) {
            return res.status(401).json({ message: 'Anda harus login terlebih dahulu' });
        }

        const { uuid } = req.params;
        const { stok_gudang } = req.body;

        const wearhouse = await Wearhouse.findOne({ where: { uuid } });
        if (!wearhouse) {
            return res.status(404).json({ status: false, message: "Data tidak ditemukan" });
        }

        const jumlahStokBaru = parseInt(stok_gudang, 10);
        const perubahanStok = jumlahStokBaru - wearhouse.stok_gudang;
        let keterangan;
        let jenis_mutasi;

        if (perubahanStok > 0) {
            jenis_mutasi = 'masuk';
            keterangan = `Penambahan stok sebanyak ${perubahanStok}`;
        } else if (perubahanStok < 0) {
            jenis_mutasi = 'keluar';
            keterangan = `Pengurangan stok sebanyak ${Math.abs(perubahanStok)}`;
        } else {
            return res.status(200).json({ status: true, message: "Tidak ada perubahan stok", data: wearhouse });
        }

        wearhouse.stok_gudang = jumlahStokBaru;
        await wearhouse.save();

        await mutasiStok.create({
            baranguuid: wearhouse.baranguuid,
            jenis_mutasi,
            jumlah: Math.abs(perubahanStok),
            keterangan,
        });

        return res.status(200).json({ status: true, message: "Data Wearhouse berhasil diperbarui", data: wearhouse });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Terjadi kesalahan pada server" });
    }
};

exports.deleteDataWearhouse = async (req, res) => {
    try {
        const userLogin = req.user
    if(!userLogin){
      return res.status(401).json({message: 'Anda harus login terlebih dahulu'})
    }
        const { uuid } = req.params;

        const wearhouse = await Wearhouse.findOne({ where: { uuid } });

        if (!wearhouse) {
            return res.status(404).json({
                status: false,
                message: "Data tidak ditemukan",
            });
        }

        await wearhouse.destroy();

        return res.status(200).json({
            status: true,
            message: "Data Wearhouse berhasil dihapus",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: false,
            message: "Terjadi kesalahan pada server",
        });
    }
};
