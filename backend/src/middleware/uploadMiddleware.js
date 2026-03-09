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

const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext || '';
    cb(null, `event-material-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function imageFileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
    return;
  }
  cb(null, true);
}

const allowedMaterialExactMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.apple.keynote',
  'text/plain',
  'application/octet-stream'
]);

const allowedMaterialMimePrefixes = ['video/', 'audio/', 'image/'];

function materialFileFilter(req, file, cb) {
  const mimetype = (file.mimetype || '').toLowerCase();
  const isAllowedExact = allowedMaterialExactMimeTypes.has(mimetype);
  const matchesPrefix = allowedMaterialMimePrefixes.some((prefix) => mimetype.startsWith(prefix));

  if (matchesPrefix || isAllowedExact) {
    cb(null, true);
    return;
  }

  cb(new Error('Unsupported file type for event materials'));
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

const materialUpload = multer({
  storage: materialStorage,
  fileFilter: materialFileFilter,
  limits: {
    fileSize: Math.floor(readSizeMb('EVENT_MATERIAL_MAX_MB', 150) * 1024 * 1024),
  },
});

module.exports = { eventImageUpload, profileImageUpload, createImageUploader, materialUpload };
