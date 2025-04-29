const User = require('../models/userModel')
const Cabang = require('../models/cabangModel')
const argon2 = require('argon2');
const { Model } = require('sequelize');

 exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    console.log("Missing username or password");
    return res.status(400).json({ message: 'Please enter both username and password' });
  }
  try {
    const user = await User.findOne({
      where: { username },
      include: [{
        model: Cabang,
        attributes: ['uuid', 'namacabang']
      }]
    });

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: 'User not found' });
    }

    const match = await argon2.verify(user.password, password);
    if (!match) {
      console.log("Password mismatch");
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Set session data consistently
    req.session.user = {
      uuid: user.uuid,
      username: user.username,
      role: user.role,
      cabanguuid: user.cabanguuid
    };
    
    return res.status(200).json({
      status: 200,
      message: 'Success',
      data: {
        uuid: user.uuid,
        username: user.username,
        role: user.role,
        cabanguuid: user.cabanguuid,
        cabang: user.Cabang
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.me = async (req, res) => {
  if (!req.session.user) {
      return res.status(401).json({ msg: "Mohon login ke akun Anda!" });
  }
  try {
      const user = await User.findOne({
          attributes: ['uuid', 'username', 'role'],
          where: { uuid: req.session.user.uuid },
          include: [{
              model: Cabang,
              attributes: ['uuid', 'namacabang']
          }]
      });
      if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });
      
      res.status(200).json({
          uuid: user.uuid,
          username: user.username,
          role: user.role,
          cabang: user.Cabang,
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ msg: error.message });
  }
};


exports.logOut = async(req, res)=>{
    req.session.destroy((err) => {
        if (err) return res.status(400).json({ msg: "Tidak dapat logout" });
        res.status(200).json({ msg: "Anda telah logout" });
    });
}

