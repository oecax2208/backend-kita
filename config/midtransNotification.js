const Transaksi = require('../models/transaksiModel');

exports.midtransNotification = async (req, res) => {
    try {
      const notification = req.body;
      const { order_id, transaction_status, fraud_status } = notification;
      const transaksi = await Transaksi.findOne({ where: { uuid: order_id } });
  
      if (!transaksi) {
        console.error(`Transaksi dengan order_id ${order_id} tidak ditemukan.`);
        return res.status(404).json({ status: false, message: "Transaksi tidak ditemukan" });
      }
      let status = "pending";
      if (transaction_status === "capture") {
        status = fraud_status === "accept" ? "settlement" : "deny";
      } else if (transaction_status === "settlement") {
        status = "settlement";
      } else if (transaction_status === "deny") {
        status = "deny";
      } else if (transaction_status === "cancel" || transaction_status === "expire") {
        status = "cancel";
      }
      await Transaksi.update({ status_pembayaran: status }, { where: { uuid: order_id } });
  
      console.log(`Order ${order_id} updated to status: ${status}`);
      return res.status(200).json({ status: true, message: "Notifikasi berhasil diproses" });
    } catch (error) {
      console.error("Error processing notification:", error.message);
      return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };