const multer = require('multer');
const { bucket } = require('../utils/gsConfig');

const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

const uploadToGCS = (file) => new Promise((resolve, reject) => {
  const blob = bucket.file(file.originalname);
  const blobStream = blob.createWriteStream();

  blobStream.on('finish', () => {
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    resolve(publicUrl);
  });

  blobStream.on('error', (err) => {
    reject(err);
  });

  blobStream.end(file.buffer);
});

const deleteFromGCS = (fileUrl) => new Promise((resolve, reject) => {
  const fileName = fileUrl.split('/').pop();
  const file = bucket.file(fileName);

  file.delete((err) => {
    if (err) {
      console.error('Error deleting file from GCS:', err);
      reject(err);
    } else {
      console.log(`File ${fileName} deleted successfully from GCS.`);
      resolve();
    }
  });
});

module.exports = { upload, uploadToGCS, deleteFromGCS };