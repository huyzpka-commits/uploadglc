const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BASE_DIR = path.join(__dirname, '../../uploads');

function getRelativePath(fullPath) {
  return path.relative(BASE_DIR, fullPath).replace(/\\/g, '/');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildTree(dirPath, basePath = '') {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  const folders = [];
  const files = [];

  items.forEach(item => {
    const fullPath = path.join(dirPath, item.name);
    const relPath = getRelativePath(fullPath);

    if (item.isDirectory()) {
      folders.push({
        id: uuidv4(),
        name: item.name,
        type: 'folder',
        path: relPath,
        children: buildTree(fullPath, relPath)
      });
    } else {
      const stat = fs.statSync(fullPath);
      files.push({
        id: uuidv4(),
        name: item.name,
        type: 'file',
        path: relPath,
        size: stat.size,
        modified: stat.mtime
      });
    }
  });

  return [...folders, ...files];
}

const fileController = {
  // List files and folders in a directory
  list: (req, res) => {
    try {
      const folder = req.query.folder || '';
      const targetPath = path.join(BASE_DIR, folder);

      if (!fs.existsSync(targetPath)) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const items = fs.readdirSync(targetPath, { withFileTypes: true });
      const result = items.map(item => {
        const fullPath = path.join(targetPath, item.name);
        const relPath = getRelativePath(fullPath);
        const stat = fs.statSync(fullPath);

        return {
          id: uuidv4(),
          name: item.name,
          type: item.isDirectory() ? 'folder' : 'file',
          path: relPath,
          size: stat.size,
          modified: stat.mtime
        };
      });

      res.json({ folder, items: result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Upload file(s)
  upload: (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      const files = req.files.map(file => ({
        originalName: file.originalname,
        filename: file.filename,
        path: getRelativePath(file.path),
        size: file.size
      }));
      res.json({ message: 'Upload successful', files });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Create folder
  createFolder: (req, res) => {
    try {
      const { folderName, parent = '' } = req.body;
      if (!folderName) {
        return res.status(400).json({ error: 'Folder name required' });
      }
      const targetPath = path.join(BASE_DIR, parent, folderName);
      ensureDir(targetPath);
      res.json({ message: 'Folder created', path: getRelativePath(targetPath) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Delete file or folder
  delete: (req, res) => {
    try {
      const { targetPath } = req.body;
      if (!targetPath) {
        return res.status(400).json({ error: 'Path required' });
      }
      const fullPath = path.join(BASE_DIR, targetPath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'Not found' });
      }
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Rename file or folder
  rename: (req, res) => {
    try {
      const { targetPath, newName } = req.body;
      if (!targetPath || !newName) {
        return res.status(400).json({ error: 'Path and new name required' });
      }
      const oldPath = path.join(BASE_DIR, targetPath);
      const newPath = path.join(path.dirname(oldPath), newName);
      if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ error: 'Not found' });
      }
      fs.renameSync(oldPath, newPath);
      res.json({ message: 'Renamed successfully', newPath: getRelativePath(newPath) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Download file
  download: (req, res) => {
    try {
      const filePath = req.query.path;
      if (!filePath) {
        return res.status(400).json({ error: 'Path required' });
      }
      const fullPath = path.join(BASE_DIR, filePath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.download(fullPath);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Get tree structure
  tree: (req, res) => {
    try {
      ensureDir(BASE_DIR);
      const tree = buildTree(BASE_DIR);
      res.json({ tree });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = fileController;
