const jwt = require('jsonwebtoken'); 
const fs = require('fs').promises;
const path = require('path');
const { createCanvas, Image } = require('canvas');
const { v4: uuidv4 } = require('uuid');

const secretJWT = process.env.SECRET_JWT || 'lsdfsdhf^565$_sdkjfgsdjfgsdfg';
const maxSize = 1024;
const uploadDir = "cabinet/assets/img/profiles"; //path.join(__dirname, 'uploads');

class clUser {
  constructor(id, data) {
    this.id = id;
    this.fullData = {...data};
    this.token = null;
  }

  generateToken() {
    this.token = jwt.sign(this.fullData, secretJWT, {
      expiresIn: '1h',
    });

    return this.token;
  }

  async localLoad(pool) {
    // load data from database by id
    if (!this.id)
      return false;

    const query = `
      SELECT * 
      FROM users
      WHERE id = ? AND isDeleted = "NO"
      LIMIT 0,1
    `;
    try {
      const rows = await pool.query(query, [this.id]);
      const row = rows[0];

      if (!row) {
        return { errorCode: 'USER_NOT_FOUND' };
      }
      row.passwd = null;

      this.fullData = row;
      return true;
    }
    catch (err) {
      return { errorCode: 'INTERNAL_ERROR', err };
    }

  }

  static async authorize(pool, data) {
    const { email, passwd } = data;
  
    if (!email || !passwd) {
      return { errorCode: 'EMPTY_FIELDS' };
    }
  
    const query = `
      SELECT *
      FROM users
      WHERE email = ? AND passwd = MD5(?) AND isDeleted = "NO"
      LIMIT 0,1
    `;

    try {
      const rows = await pool.query(query, [data.email, data.passwd]);
      const row = rows[0];
      
      if (!row) {
        return { errorCode: 'USER_NOT_FOUND' };
      }
      row.passwd = null;

      const user = new clUser(
        row.id,
        row
      );

      const token = user.generateToken();

      return { "freshToken" : token, user };
    } catch (err) {
      return { errorCode : "INTERNAL_ERROR", err} ;
    }
  }
  
  static async verifyToken(pool, data) {
    try {
      const { token } = data;
      if (!token)
        return { errorCode: 'INVALID_TOKEN' };

      const decoded = jwt.verify(token, secretJWT);
      return decoded;
    } catch (err) {
      // If the token is invalid or expired, an error will be thrown
      return { errorCode: 'INVALID_TOKEN' };
    }
  }  

  static async getUserDataByToken(pool, token, refreshToken = true) {
    const decoded = await this.verifyToken(pool, {token});
    if (decoded.id) {

      const user = new clUser(
        decoded.id,
        {}
      );

      const loadUser = await user.localLoad(pool);
      if (loadUser.errorCode)
        return loadUser;

      if (refreshToken)
        user.generateToken();

      return user;
    }
    else
      return decoded;
  }

  static async load(pool, data) {
    //check token
    const { token } = data;
    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    const { idUser } = data;
  
    if (!idUser) {
      return { errorCode: 'EMPTY_FIELDS' };
    }
  
    const query = `
      SELECT *
      FROM users
      WHERE id = ? AND isDeleted = "NO"
      LIMIT 0,1
    `;

    try {
      const rows = await pool.query(query, [idUser]);
      const row = rows[0];
      
      if (!row) {
        return { errorCode: 'USER_NOT_FOUND' };
      }
      row.passwd = null;

      
      return { "user" : row, freshToken: user.token };
    } catch (err) {
      return { errorCode : "INTERNAL_ERROR", err} ;
    }
  }

  static async save(pool, data) {
    const resizeImage = (file) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = file.buffer;
        img.onload = () => {
          const canvas = createCanvas(maxSize, maxSize);
          const ctx = canvas.getContext('2d');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL(file.mimetype, 0.8));
        };

        img.onerror = reject;
      });
    };

    const saveFile = async (file, resizedFile) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${uniqueSuffix}-${file.filename}`;
      const filepath = path.join(uploadDir, filename);

      try {
        await fs.writeFile(filepath, resizedFile);
      } catch (error) {
        throw error;
      }

      return { filename, filepath };
    };

    //check token
    const { token } = data;
    const userData = data.data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    const { id, fName, lName, email, passwd, isNew } = userData;
  
    if (!(id || fName || lName || email) || (isNew && !passwd)) {
      return { errorCode: 'EMPTY_FIELDS' };
    }

    //save avatar
    if (userData.avatarData) {
      let avatarData = userData.avatarData.split(';base64,');
      let mime = avatarData[0].split(':')[1]; // mime type
      let base64Image = avatarData[1];
      let ext = mime.split('/')[1];  // extracting extension from mime type
      let filename = uuidv4() + '.' + ext;

      try {
        await fs.writeFile(`../${uploadDir}/${filename}`, base64Image, { encoding: 'base64' });
        //await fs.writeFile(filename, base64Image, { encoding: 'base64' });
        userData.avatar = filename;
      } catch (error) {
        throw error;
      }
    }

    const query = `
      INSERT INTO users (id, fName, lName, mName, email, passwd, phone, avatar, isDeleted, idLastUserOperation)
      VALUES (?, ?, ?, ?, ?, MD5(?), ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      fName = VALUES(fname), 
      lName = VALUES(lName), 
      mName = VALUES(mName),
      ${passwd ? "passwd = MD5(VALUES(passwd))," : ""} 
      email = VALUES(eMail), 
      phone = VALUES(phone),
      ${userData.avatarData ? "avatar = VALUES(avatar)," : ""}
      isDeleted = VALUES(isDeleted),
      idLastUserOperation = VALUES(idLastUserOperation)
    `;

    try {
      const rows = await pool.query(query, [id, fName, lName, userData.mName, email, passwd, userData.phone, userData.avatar, userData.isDeleted ? userData.isDeleted : "NO", user.id]);

      
      return { "id" : id, "fullData": userData, freshToken: user.token };
    } catch (err) {
      return { errorCode : "INTERNAL_ERROR", err} ;
    }
  }
}


module.exports = clUser;