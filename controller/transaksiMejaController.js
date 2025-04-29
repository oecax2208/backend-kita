const Transaksi = require('../models/transaksiModel')
const TransaksiDetail = require('../models/transaksiDetailModel')
const User = require('../models/userModel')
const Cabang = require('../models/cabangModel')
const Barang = require('../models/barangModel')
const moment = require('moment-timezone')
const Op = require('sequelize')
const db = require('../config/database')
const {snap, coreApi} = require('../config/midtransConfig');

//--------------TRANSAKSI PERMEJA(SEDANG DI KEMBANGKAN)-----------------
exports.createTransaksi = async (req, res) => {
    try {
      const { table_id, user_uuid } = req.body;
  
      if (!table_id) return res.status(400).json({ message: 'Table ID is required' });
  
      const order_id = `ORDER-${Date.now()}`;
      const newTransaksi = await Transaksi.create({
        order_id,
        totaljual: 0, 
        useruuid: user_uuid,
        pembayaran: 'pending', 
      });
  
      res.status(201).json({
        message: 'Transaksi berhasil dibuat',
        data: newTransaksi,
      });
    } catch (error) {
      console.error('Error in createTransaksi:', error);
      res.status(500).json({ message: error.message });
    }
  };

  exports.addMenuToTransaksi = async (req, res) => {
    try {
      const { id } = req.params; // ID transaksi
      const { menu_uuid, jumlah } = req.body;
  
      const barang = await Barang.findOne({ where: { uuid: menu_uuid } });
      if (!barang) return res.status(404).json({ message: 'Menu tidak ditemukan' });
  
      const total = barang.harga * jumlah;
      const transaksiDetail = await TransaksiDetail.create({
        transaksiuuid: id,
        baranguuid: menu_uuid,
        jumlahbarang: jumlah,
        harga: barang.harga,
        total,
      });
  
      const transaksi = await Transaksi.findByPk(id);
      transaksi.totaljual += total;
      await transaksi.save();
  
      res.status(201).json({
        message: 'Menu berhasil ditambahkan ke transaksi',
        data: transaksiDetail,
      });
    } catch (error) {
      console.error('Error in addMenuToTransaksi:', error);
      res.status(500).json({ message: error.message });
    }
  };
  exports.confirmTransaksi = async (req, res) => {
    try {
      const { id } = req.params;
  
      const transaksi = await Transaksi.findByPk(id);
      if (!transaksi) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
  
      transaksi.status_pembayaran = 'settlement';
      await transaksi.save();
  
      res.status(200).json({
        message: 'Transaksi berhasil dikonfirmasi',
        data: transaksi,
      });
    } catch (error) {
      console.error('Error in confirmTransaksi:', error);
      res.status(500).json({ message: error.message });
    }
  };
    