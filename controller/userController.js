  const User = require('../models/userModel')
  const Cabang = require('../models/cabangModel')
  const argon2 = require('argon2');
const { where } = require('sequelize');

  exports.getUser = async (req,res) => {
    try {
        const response = await User.findAll({
            attributes: ['uuid','username','role','cabanguuid'],
            include: [{
                model: Cabang,
                attributes: ['uuid','namacabang']
            }]
        });
        
        res.status(200).json({
            status: 200,
            message: 'success',
            data: response
        });
    } catch (error) {
        res.status(500).json(error.message);
    }
  }

  exports.getUserByUuid = async (req,res) => {
      const {uuid} = req.params
      try {
          const user = await User.findOne({
              where:{
                  uuid
              },
              attributes:['uuid','username','role','cabanguuid'],
              include:[{
                  model:Cabang,
                  attributes:['uuid','namacabang']
          }]
          })
          if(!user){
              return res.status(404).json('user not found')
          }
          res.status(200).json({
              status:200,
              message:'succes',
              data:user
          })
      } catch (error) {
          res.status(500).json(error.message)
      }
  }
exports.getUserCabang = async (req,res) => {
  try {
    const user = req.user;
    if(!["admin","superadmin"].includes(user.role)){
      return res.status(403).json({
        status: 403,
        message: "Access forbidden. Only admins or superadmins can access this data.",
      })
    }
    let whereClause = {};
    if (user.role === "admin") {
      whereClause = { cabanguuid: user.cabanguuid };
    }
    const getUserCabang = await User.findAll({
      where: whereClause,
      attributes: ['uuid', 'username', 'role', 'cabanguuid'],
      include: [{
        model: Cabang,
        attributes: ['uuid', 'namacabang']
      }]
    })
    return res.status(200).json({
      status: true,
      message: "Data user berhasil diambil",
      data: getUserCabang
    });
    
  } catch (error) {
    console.error("Get User Cabang Error:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada server",
    });
  }
}

  exports.createUser = async (req, res) => {
    const user = req.user;
    if (!["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({
        status: 403,
        message: "Access forbidden. Only admins or superadmins can access this data.",
      });
    }
    const { username, password, confpassword, role, cabanguuid } = req.body;

    try {

      if (password !== confpassword) {
        return res.status(400).json({ message: 'Password and confirm password do not match' });
      }

      if (!['superadmin', 'admin', 'kasir'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      // if (user.role === "admin" && role !== "kasir") {
      //   return res.status(403).json({
      //     status: 403,
      //     message: "Admins are only allowed to create users with the 'kasir' role.",
      //   });
      // }
      if (user.role === 'admin') {
        if (role !== 'kasir') {
          return res.status(403).json({
            status: 403,
            message: "Admins are only allowed to create users with the 'kasir' role."
          });
        }
        if (user.cabanguuid !== cabanguuid) {
          return res.status(403).json({
            status: 403,
            message: "Admins can only create 'kasir' users within their own branch."
          });
        }
      }
      let cabang;
      if (role !== 'superadmin') {
        if (!cabanguuid) {
          return res.status(400).json({ message: 'Cabang UUID is required for admin or user role' });
        }
        cabang = await Cabang.findOne({ where: { uuid: cabanguuid } });
        if (!cabang) {
          return res.status(404).json({ message: 'Cabang not found' });
        }
      }
      const hashedPassword = await argon2.hash(password);
      const newUser = await User.create({
        username,
        password: hashedPassword,
        role,
        cabanguuid: role === 'superadmin' ? null : cabanguuid,
      });

      res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
    }
  };


  exports.updateUser = async (req,res) => {
      try {
        const { uuid } = req.params
        const {username, password, confpassword, cabanguuid} = req.body
        const user = await User.findOne({
          where: { uuid },
        })
        if(!user){
          return res.status(404).json('user not found')
        }
        let updatedFields = {};
        if (username) updatedFields.username = username;

        if (password) {
            if (password !== confpassword) {
                return res.status(400).json({ message: 'Password and confirm password do not match' });
            }
            updatedFields.password = await argon2.hash(password);
        }
        if(cabanguuid)updatedFields.cabanguuid = cabanguuid;

        await User.update(
          updatedFields,{where: {uuid}}
        )
        return res.status(200).json({
          message: 'User updated successfully',
          status: 200,
          data: updatedFields
        })
          
      } catch (error) {
          return res.status(500).json(error.message)
      }
  }

  exports.deleteUser = async (req,res) => {
      try {
          const {uuid} = req.params;
          const user = await User.findOne({where: {uuid}})
          if(!user){
            return res.status(404).json('user not found')
          }
          await User.destroy({where: {uuid}});
          return res.status(203).json({
            message: 'User deleted successfully',
            status: 203
          })
      } catch (error) {
          return res.status(500).json(error.message)
      }
  }
  exports.updateByUser = async (req, res) => {
    try {
      const { uuid } = req.params;
      const { password, confpassword } = req.body;
      const user = await User.findOne({ where: { uuid } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (password && password !== confpassword) {
        return res.status(400).json({ message: 'Password and confirm password do not match' });
      }
      const hashedPassword = password ? await argon2.hash(password) : undefined;
      const updatedData = {
        password: hashedPassword || user.password, 
      };
      await User.update(updatedData, { where: { uuid } });
  
      return res.status(200).json({
        message: 'User updated successfully',
        status: 200,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ message: error.message });
    }
  };
  