const path = require('path');
const { Storage } = require('@google-cloud/storage');

const keyFilePath = path.join(__dirname, '..', 'animestream-425811-ea235ce3d195.json');

const storage = new Storage({
  projectId: 'animestream-425811',
  keyFilename: keyFilePath
});

const bucket = storage.bucket('personelbucket');

module.exports = { bucket };