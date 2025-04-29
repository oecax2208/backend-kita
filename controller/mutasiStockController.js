const mutasiStok = require('../models/mutasiStokModel');
const BarangCabang = require('../models/BarangCabang');
const Barang = require('../models/barangModel');
const Cabang = require('../models/cabangModel');
const Kategori = require('../models/kategoriModel')
const user = require('../models/userModel')
const {Op} = require('sequelize')

exports.getMutasiStock = async(req,res) => {
  try {
    const userLogin = req.user
    if(!userLogin){
      return res.status(401).json({message: 'Anda harus login terlebih dahulu'})
    }
    const { startDate, endDate} = req.query;
    let whereConditions = {}
    if (startDate && endDate) {
            whereConditions.createdAt = {
              [Op.gte]: new Date(`${startDate}T00:00:00.000Z`),
              [Op.lte]: new Date(`${endDate}T23:59:59.999Z`),
            };
          }
    const getMutasi = await mutasiStok.findAll({
      where: whereConditions,
            include: [
        {
          model: Barang,
          attributes: ['namabarang'],
        },
        {
          model: Cabang,
          attributes: ['namacabang'],
        },
      ],
      order: [['createdAt', 'DESC']], 
    });
        if (getMutasi.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Tidak ada mutasi stok ditemukan",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Data mutasi stok ditemukan",
      data: getMutasi,
    });
   
  } catch (error) {
    return res.status(500).json(error.message)
  }
}

exports.mutasiTrackingCabang = async(req,res) => {
  try {
    const userLogin = req.user
    if(!userLogin){
      return res.status(401).json({message: 'Anda harus login terlebih dahulu'})
    }
    const userRole = req.user.role; 
      const userCabangUuid = req.user.cabanguuid; 

      const whereClause = userRole === "admin" ? { cabanguuid: userCabangUuid } : {};
      let tracking = await mutasiStok.findAll({
        where: whereClause,
        attributes: [
          'uuid','cabanguuid','baranguuid','jenis_mutasi','jumlah','keterangan','createdAt','updatedAt'
        ],
        include: [
          {
            model: Barang,
            attributes: ['uuid','namabarang','harga','kategoriuuid'],
            include:[
              {
                model: Kategori,
                attributes: ['uuid','namakategori'],
              }
            ]
          },
          
          {
            model: Cabang,
            attributes: ['uuid','namacabang'],
          }
        ],
      })
      tracking = tracking.map((mutasi) => {
        if (mutasi.jenis_mutasi === "keluar" && mutasi.keterangan === "Distribusi stok ke cabang"){
          return {
            ...mutasi.toJSON(),
            jenis_mutasi: "masuk", 
          };
        }
        return mutasi.toJSON();
      });
      if (tracking.length === 0) {
        return res.status(404).json({
          status: false,
          message: "Data mutasi stok tidak ditemukan",
        })
      }
      return res.status(200).json({
        status: true,
        message: "Data mutasi stok ditemukan",
        data: tracking

      })
  } catch (error) {
    return res.status(500).json(error.message)
  }
}
//docs api 
//GET /api/mutasi-stok?cabanguuid=<cabang_uuid>&baranguuid=<barang_uuid>&jenis_mutasi=keluar&startDate=2025-01-01&endDate=2025-02-01

