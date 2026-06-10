const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const fileController = require('../controllers/fileController');

router.get('/list', fileController.list);
router.get('/tree', fileController.tree);
router.get('/download', fileController.download);
router.get('/shared/:id', fileController.accessShared);
router.post('/upload', upload.array('files', 20), fileController.upload);
router.post('/folder', fileController.createFolder);
router.post('/delete', fileController.delete);
router.post('/rename', fileController.rename);
router.post('/share', fileController.share);

module.exports = router;
