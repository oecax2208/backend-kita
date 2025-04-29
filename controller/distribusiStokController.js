const distribusiStok = require('../models/distribusiStokModel');
const BarangCabang = require('../models/BarangCabang');
const Barang = require('../models/barangModel');
const Cabang = require('../models/cabangModel');
const Wearhouse = require('../models/wearhouseModel')
const db = require('../config/database')
const mutasiStok = require('../models/mutasiStokModel')


exports.getDistribusiStok = async (req, res) => {
  try {
    const { baranguuid, status } = req.query;
    let whereConditions = {};

    // Jika user adalah admin, hanya bisa melihat distribusi stok untuk cabangnya sendiri
    if (req.user.role === 'admin') {
      whereConditions.cabanguuid = req.user.cabanguuid;
    }

    if (baranguuid) {
      whereConditions.baranguuid = baranguuid;
    }
    if (status) {
      whereConditions.status = status;
    }

    const distribusi = await distribusiStok.findAll({
      where: whereConditions,
      include: [
        {
          model: Barang,
          attributes: ['namabarang'],
        },
        {
          model: Cabang,
          attributes: ['namacabang'],
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    if (distribusi.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Tidak ada distribusi stok ditemukan",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Data distribusi stok ditemukan",
      data: distribusi,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada server",
    });
  }
};

exports.getDistribusiStokById = async (req, res) => {
  try {
    const { id } = req.params;

    const distribusi = await distribusiStok.findOne({
      where: { uuid: id },
      include: [
        {
          model: Barang,
          attributes: ['namabarang'],
        },
        {
          model: Cabang,
          attributes: ['namacabang'],
        }
      ],
    });

    if (!distribusi) {
      return res.status(404).json({
        status: false,
        message: "Distribusi stok tidak ditemukan",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Distribusi stok ditemukan",
      data: distribusi,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada server",
    });
  }
};

exports.createDistribusi = async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ status: false, message: "Akses ditolak. Hanya superadmin yang dapat membuat distribusi stok" });
  }

  const t = await db.transaction();
  try {
    const { baranguuid, cabanguuid, jumlah } = req.body;

    if (!baranguuid || !cabanguuid || !jumlah) {
      return res.status(400).json({ status: false, message: "Data tidak lengkap" });
    }

    const wearhouse = await Wearhouse.findOne({ where: { baranguuid }, transaction: t });
    if (!wearhouse || wearhouse.stok_gudang < jumlah) {
      return res.status(400).json({ status: false, message: "Stok di gudang tidak mencukupi" });
    }

    // wearhouse.stok_gudang -= jumlah;
    // await wearhouse.save({ transaction: t });

    // await mutasiStok.create({
    //   baranguuid,
    //   cabanguuid,
    //   jenis_mutasi: 'keluar',
    //   jumlah,
    //   keterangan: 'Distribusi stok ke cabang'
    // }, { transaction: t });

    const distribusi = await distribusiStok.create({ baranguuid, cabanguuid, jumlah, status: 'pending' }, { transaction: t });

    await t.commit();

    return res.status(201).json({ status: true, message: "Distribusi stok berhasil dibuat", data: distribusi });

  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).json({ status: false, message: "Terjadi kesalahan pada server" });
  }
};


exports.updateDistribusi = async (req, res) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { status } = req.body;

    const distribusi = await distribusiStok.findOne({ where: { uuid: id }, transaction: t });

    if (!distribusi) {
      return res.status(404).json({ status: false, message: "Distribusi stok tidak ditemukan" });
    }

    if (req.user.role !== 'admin' || req.user.cabanguuid !== distribusi.cabanguuid) {
      return res.status(403).json({ status: false, message: "Akses ditolak. Hanya admin cabang terkait yang bisa mengupdate." });
    }

    if (distribusi.status === 'diterima' || distribusi.status === 'cancel') {
      return res.status(400).json({ 
        status: false, 
        message: `Distribusi stok sudah berstatus ${distribusi.status} dan tidak dapat diubah lagi` 
      });
    }

    if (status === 'diterima') {
      const wearhouse = await Wearhouse.findOne({ 
        where: { baranguuid: distribusi.baranguuid }, 
        transaction: t 
      });
      
      if (!wearhouse || wearhouse.stok_gudang < distribusi.jumlah) {
        return res.status(400).json({ 
          status: false, 
          message: "Stok di gudang tidak mencukupi untuk distribusi ini" 
        });
      }
      wearhouse.stok_gudang -= distribusi.jumlah;
      await wearhouse.save({ transaction: t });
      await mutasiStok.create({
        baranguuid: distribusi.baranguuid,
        cabanguuid: null, 
        jenis_mutasi: 'keluar',
        jumlah: distribusi.jumlah,
        keterangan: `Distribusi stok ke cabang (ID: ${distribusi.uuid})`
      }, { transaction: t });
      const barangCabang = await BarangCabang.findOne({
        where: { baranguuid: distribusi.baranguuid, cabanguuid: distribusi.cabanguuid },
        transaction: t
      });

      if (!barangCabang) {
        await BarangCabang.create({
          baranguuid: distribusi.baranguuid,
          cabanguuid: distribusi.cabanguuid,
          stok: distribusi.jumlah
        }, { transaction: t });
      } else {
        barangCabang.stok += distribusi.jumlah;
        await barangCabang.save({ transaction: t });
      }
      await mutasiStok.create({
        baranguuid: distribusi.baranguuid,
        cabanguuid: distribusi.cabanguuid,
        jenis_mutasi: 'masuk',
        jumlah: distribusi.jumlah,
        keterangan: `Distribusi stok dari gudang (ID: ${distribusi.uuid})`
      }, { transaction: t });
    }
    
    if (status === 'cancel') {
    }
    distribusi.status = status;
    distribusi.updated_by = req.user.uuid;
    distribusi.updated_at = new Date();
    await distribusi.save({ transaction: t });

    await t.commit();

    return res.status(200).json({
      status: true,
      message: `Status distribusi stok berhasil diperbarui menjadi ${status}`,
      data: distribusi,
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).json({ status: false, message: "Terjadi kesalahan pada server" });
  }
};


exports.deleteDistribusi = async (req, res) => {
  try {
    const { id } = req.params;

    const distribusi = await distribusiStok.findOne({
      where: { uuid: id },
    });

    if (!distribusi) {
      return res.status(404).json({
        status: false,
        message: "Distribusi stok tidak ditemukan",
      });
    }

    await distribusi.destroy();

    return res.status(200).json({
      status: true,
      message: "Distribusi stok berhasil dihapus",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada server",
    });
  }
};



