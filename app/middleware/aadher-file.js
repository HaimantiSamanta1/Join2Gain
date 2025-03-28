const multer = require('multer');
const fs = require('fs')
const path = require('path');

// Configure multer storage and file name
const storageA = multer.diskStorage({
  destination: function (req, file, cb) {
  let dir = './JoinToGain/AadharCardFiles'
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir,{ recursive: true });
  }
  cb(null,dir)
},
    filename: (req, file, cb) => {
      //cb(null , file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const currentDate = new Date().toISOString().replace(/[:.]/g, '-'); // Replace colon and dot characters for compatibility
    let name = file.originalname.split('.')[0];
    let extension = path.extname(file.originalname);
    cb(null, `${name}_${currentDate}_${uniqueSuffix}${extension}`);
    },
  })
  
// Create multer upload instance
const uploadAadharFile = multer({ storage: storageA })
module.exports = {uploadAadharFile}