const Barang = require('../models/barangModel')
const Kategori = require('../models/kategoriModel')
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

exports.uploadBarang = async (req, res) => {
    try {
        if(!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ msg: 'No files were uploaded.' });
        }
        const file = req.files.file;
        const ext = path.extname(file.name).toLowerCase()
        const allowedType = ['.xlsx','.xls']
        if(!allowedType.includes(ext)){
            return res.status(400).json({ msg: 'Only excel files are allowed.' });
        }
        const tempPath = path.join(__dirname,'../public/uploads',file.name)
        if(!fs.existsSync(path.dirname(tempPath))){
            fs.mkdirSync(path.dirname(tempPath), { recursive: true });
        }
        file.mv(tempPath, async (err)=>{
            if(err){
                return res.status(500).json({ msg: 'Error uploading file.' });
            }
            const workbook = xlsx.readFile(tempPath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);
            for (const row of data) {
                const { namakategori, namabarang, harga } = row;

                if (!namakategori || !namabarang || !harga) {
                    return res.status(400).json({ msg: "Data tidak lengkap dalam Excel" });
                }
                let kategori = await Kategori.findOne({ where: { namakategori } });
                if (!kategori) {
                    kategori = await Kategori.create({ namakategori });
                }
                const barang = await Barang.findOne({ where: { namabarang, kategoriuuid: kategori.uuid } });
                if (!barang) {
                    await Barang.create({
                        namabarang,
                        harga,
                        kategoriuuid: kategori.uuid,
                    });
                }
            }
            fs.unlinkSync(tempPath);

            res.status(201).json({
                status: 201,
                message: 'Barang berhasil diupload',
            });
        })

    } catch (error) {
        res.status(500).json(error.message);
    }
}

