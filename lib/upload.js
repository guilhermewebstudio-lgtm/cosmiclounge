const multer = require('multer');
const { pool } = require('./db');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED.includes(file.mimetype))
});

async function saveImages(ownerType, ownerId, files) {
  if (!files || !files.length) return;
  const { rows } = await pool.query(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM images WHERE owner_type=$1 AND owner_id=$2',
    [ownerType, ownerId]
  );
  let pos = rows[0].next;
  for (const f of files) {
    await pool.query(
      'INSERT INTO images (owner_type, owner_id, mime, data, position) VALUES ($1,$2,$3,$4,$5)',
      [ownerType, ownerId, f.mimetype, f.buffer, pos++]
    );
  }
}

module.exports = { upload, saveImages };
