const BarangCabang = require('../models/BarangCabang');
const Barang = require('../models/barangModel');
const Cabang = require('../models/cabangModel');
const Kategori = require('../models/kategoriModel');

exports.createStokCabang = async (req, res) => {
   
};

exports.cekStokCabang = async (req, res) => {
    try {
        const user = req.user;
        let whereCondition = {};
        if (user.role !== "superadmin") {
            whereCondition.cabanguuid = user.cabanguuid;
        }

        const barangCabang = await BarangCabang.findAll({
            attributes: ['uuid', 'baranguuid', 'cabanguuid', 'stok'],
            where: whereCondition,
            include: [
                {
                    model: Barang,
                    attributes: ['uuid', 'namabarang', 'harga', 'kategoriuuid'],
                    include: {
                        model: Kategori,
                        attributes: ['uuid', 'namakategori']
                    }
                },
                {
                    model: Cabang,
                    attributes: ['uuid', 'namacabang']
                }
            ]
        });

        const barangSegeraHabis = barangCabang.filter(item => item.stok < 5);
        if (barangCabang.length === 0) {
            return res.status(404).json({
                status: false,
                message: "Tidak ada data barang untuk cabang ini."
            });
        }
        if (barangSegeraHabis.length > 0) {
            return res.status(200).json({
                status: true,
                message: "Beberapa barang hampir habis.",
                data: barangSegeraHabis
            });
        }
        return res.status(200).json({
            status: true,
            message: "Stok barang dalam kondisi aman.",
            data: barangCabang
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: false,
            message: "Terjadi kesalahan pada server.",
            error: error.message
        });
    }
};
