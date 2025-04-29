const User = require ('../models/userModel')
const Table = require('../models/tableModel')
const Cabang = require('../models/cabangModel');
const BarangCabang = require('../models/BarangCabang');
const Barang = require('../models/barangModel');
const QRCode = require('qrcode');
const Sequelize = require('sequelize')
const Kategori = require('../models/kategoriModel')
require('dotenv').config();

exports.generateTableQR = async (req, res) => {
    try {
        const { id: tableId } = req.params;
        
        const queryOptions = {
            where: { id: tableId },
            include: [{ model: Cabang }]
        };
        if (req.user && req.user.role === 'admin') {
            queryOptions.where.cabangUuid = req.user.cabanguuid;
        } 
        const table = await Table.findOne(queryOptions);
        if (!table) {
            return res.status(404).json({
                status: false,
                message: "Meja tidak ditemukan"
            });
        }
        const orderUrl = `${process.env.FRONTEND_URL}/menu/${table.cabangUuid}/${tableId}`;
        const qrCode = await QRCode.toDataURL(orderUrl);
        
        return res.status(200).json({
            status: true,
            data: {
                table: table,
                qrCode: qrCode,
                orderUrl: orderUrl
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

// Get products available for a specific table (branch)
exports.getTableProducts = async (req, res) => {
    try {
        const { cabangUuid, tableId } = req.params;
        
        const table = await Table.findOne({
            where: {
                id: tableId,
                cabangUuid: cabangUuid
            },
            include: [{
                model: Cabang, 
                attributes: ['uuid', 'namacabang']
            }]
        });
        
        if (!table) {
            return res.status(404).json({
                status: false,
                message: "Meja tidak ditemukan di cabang ini"
            });
        }
        const products = await BarangCabang.findAll({
            where: {
                cabanguuid: cabangUuid,
                stok: {
                    [Sequelize.Op.gt]: 0 
                }
            },
            include: [{
                model: Barang,
                attributes: ['uuid', 'namabarang', 'harga', 'foto','kategoriuuid'],
                include:[{
                    model: Kategori,
                    attributes: ['uuid', 'namakategori']
                }]
            }]
        });
        
        const formattedProducts = products.map(p => ({
            uuid: p.Barang.uuid,
            namabarang: p.Barang.namabarang,
            harga: p.Barang.harga,
            gambar: p.Barang.foto,
            stok: p.stok,
            kategoriuuid: p.Barang.kategoriuuid,
            namakategori: p.Barang.Kategori?.namakategori || ''
        }));
        
        return res.status(200).json({
            status: true,
            data: {
                table: table,
                products: formattedProducts
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};


exports.getMeja = async(req,res) => {
    try {
        let whereCondition = {};
        if (req.user.role === 'admin') {
            whereCondition = { cabangUuid: req.user.cabanguuid };
        }
        const getDataMeja = await Table.findAll({
            where: whereCondition,
            attributes: ['id', 'name', 'cabangUuid'],
            include: [{
                model: Cabang,
                attributes: ['uuid', 'namaCabang'],
            }]
        });
        
        if (!getDataMeja || getDataMeja.length === 0) {
            return res.status(404).json({message: 'Data Meja Not Found'});
        }
        return res.status(200).json({
            status: 'success',
            code: 200,
            data: getDataMeja
        })
    } catch (error) {
        return res.status(500).json(error.message)
    }
}

exports.getMejaById = async(req,res) => {
    try {
        const {id} = req.params
        const queryOptions = {
            where: {id},
            attributes: ['id', 'name', 'cabangUuid'],
            include: [{
                model: Cabang,
                attributes: ['uuid', 'namaCabang'],
            }]
        };
        if (req.user.role === 'admin') {
            queryOptions.where.cabangUuid = req.user.cabanguuid;
        }
        const getDataMejaById = await Table.findOne(queryOptions);
        
        if (!getDataMejaById) {
            return res.status(404).json({message: 'Data Meja Not Found'});
        }
        if(!getDataMejaById){
            return res.status(404).json({message: 'Data Meja Not Found'})
        }
        return res.status(200).json({
            status: 'success',
            code: 200,
            data: getDataMejaById
        })
    } catch (error) {
        return res.status(200).json(error.message)
    }
}

exports.createMeja = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ status: false, message: "Akses ditolak. Hanya admin yang dapat membuat meja" });
        }

        const { name, cabangUuid } = req.body;
        if (!name || !cabangUuid) {
            return res.status(400).json({ status: false, message: 'Nama dan Cabang harus diisi' });
        }

        const cabang = await Cabang.findOne({ where: { uuid: cabangUuid } });
        if (!cabang) {
            return res.status(404).json({ status: false, message: 'Cabang tidak ditemukan' });
        }
        if (req.user.role === 'admin' && req.user.cabanguuid !== cabangUuid) {
            return res.status(403).json({ status: false, message: 'Anda hanya dapat membuat meja untuk cabang Anda sendiri' });
        }

        const newTable = await Table.create({ name, cabangUuid });

        return res.status(201).json({ status: 'success', code: 201, data: newTable });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.updateMeja = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ status: false, message: "Akses ditolak. Hanya admin yang dapat update meja" });
        }

        const { id } = req.params;
        const { name, cabangUuid } = req.body;

        const table = await Table.findOne({ where: { id } });
        if (!table) {
            return res.status(404).json({ status: false, message: 'Data Meja Not Found' });
        }
        if (req.user.role === 'admin' && table.cabangUuid !== req.user.cabanguuid) {
            return res.status(403).json({ 
                status: false, 
                message: 'Anda hanya dapat mengedit meja untuk cabang Anda sendiri' 
            });
        }
        if (req.user.role === 'admin' && cabangUuid && cabangUuid !== req.user.cabanguuid) {
            return res.status(403).json({ 
                status: false, 
                message: 'Anda tidak dapat memindahkan meja ke cabang lain' 
            });
        }

        await Table.update({ name }, { where: { id } });

        const updatedTable = await Table.findOne({ where: { id } });

        return res.status(200).json({ status: 'success', code: 200, data: updatedTable });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.deleteMeja = async(req,res) => {
    try {
        const {id} = req.params
       const deleteMeja = await Table.findOne({
        where: {id}
       })
       if(!deleteMeja){
        return res.status(404).json({message: 'Data Meja Not Found'})
       }
       if (req.user.role === 'admin' && deleteMeja.cabangUuid !== req.user.cabanguuid) {
        return res.status(403).json({ 
            status: false, 
            message: 'Anda hanya dapat menghapus meja untuk cabang Anda sendiri' 
        });
    }
       await Table.destroy({where: {id}})
        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Data Meja Berhasil Dihapus'
        })
    } catch (error) {
        return res.status(500).json(error.message)
    }
}