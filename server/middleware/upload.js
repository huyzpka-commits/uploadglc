const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || '';
    const dest = path.join(__dirname, '../../uploads', folder);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = uuidv4();
    cb(null, `${unique}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept all files for now
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
