const fsProm = require('fs').promises;
const Jimp = require('jimp');
const { v4: uuidv4 } = require('uuid');

class clImageSaver {
  static async save(imageData, path, maxSize = 1024) {
    let avatarData = imageData.split(';base64,');
    let mime = avatarData[0].split(':')[1]; // mime type
    let base64Image = avatarData[1];
    let ext = mime.split('/')[1];  // extracting extension from mime type
    let filename = uuidv4() + '.' + ext;

    // Load image with Jimp
    let image = await Jimp.read(Buffer.from(base64Image, 'base64'));

    // Check image size
    if (image.bitmap.width > maxSize || image.bitmap.height > maxSize) {
      image.resize(maxSize, Jimp.AUTO);
    }

    try {
      await image.writeAsync(`../${path}/${filename}`);
      return filename;
    } catch (error) {
      throw error;
    }
  }
}
exports.clImageSaver = clImageSaver;