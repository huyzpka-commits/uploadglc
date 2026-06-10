const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const fileController = require('../controllers/fileController');
const { requireAuth } = require('../middleware/auth');

router.get('/list', requireAuth, fileController.list);
router.get('/tree', requireAuth, fileController.tree);
router.get('/download', fileController.download);
router.get('/shared/:id', fileController.accessShared);
router.post('/upload', requireAuth, upload.array('files', 20), fileController.upload);
router.post('/folder', requireAuth, fileController.createFolder);
router.post('/delete', requireAuth, fileController.delete);
router.post('/rename', requireAuth, fileController.rename);
router.post('/share', requireAuth, fileController.share);

module.exports = router;
