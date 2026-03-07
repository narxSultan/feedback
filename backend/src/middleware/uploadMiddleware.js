const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `event-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function imageFileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
    return;
  }
  cb(null, true);
}

function readSizeMb(envKey, fallbackMb) {
  const raw = process.env[envKey];
  const parsed = Number(raw);
  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    return fallbackMb;
  }
  return parsed;
}

function createImageUploader(maxMb = 1.5) {
  return multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: Math.floor(maxMb * 1024 * 1024) },
  });
}

const eventImageUpload = createImageUploader(
  readSizeMb('EVENT_IMAGE_MAX_MB', readSizeMb('UPLOAD_IMAGE_MAX_MB', 1.5))
);

const profileImageUpload = createImageUploader(
  readSizeMb('PROFILE_IMAGE_MAX_MB', readSizeMb('UPLOAD_IMAGE_MAX_MB', 1.5))
);

module.exports = { eventImageUpload, profileImageUpload, createImageUploader };
