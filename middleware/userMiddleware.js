const User = require('../models/userModel');
const Cabang = require('../models/cabangModel')

exports.verifyUser = async (req, res, next) => {
  try {
    if (!req.session?.user?.uuid) {
      return res.status(401).json({
        status: false,
        message: "Silahkan login terlebih dahulu"
      });
    }

    const user = await User.findOne({
      where: { 
        uuid: req.session.user.uuid 
      },
      attributes: ['uuid', 'username', 'role', 'cabanguuid'],
      include: [{
        model: Cabang,
        attributes: ['uuid', 'namacabang'],
        required: false 
      }]
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "User tidak ditemukan"
      });
    }

    req.user = req.session.user;
    req.user = user;
    
    next();

  } catch (error) {
    console.error("Verify User Error:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada server"
    });
  }
};

exports.adminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Silahkan login terlebih dahulu"
      });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: false,
        message: "Akses ditolak. Hanya admin yang diizinkan."
      });
    }

    next();
  } catch (error) {
    console.error("Admin Only Error:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada server"
    });
  }
};

exports.superAdminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Silahkan login terlebih dahulu"
      });
    }

    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: false,
        message: "Akses ditolak. Hanya super admin yang diizinkan."
      });
    }

    next();
  } catch (error) {
    console.error("Super Admin Only Error:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada server"
    });
  }
};