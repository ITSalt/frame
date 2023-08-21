const jwt = require('jsonwebtoken'); 
const fs = require('fs').promises;
const path = require('path');
const { clImageSaver } = require('../clImageSaver');
const { v4: uuidv4 } = require('uuid');

const secretJWT = process.env.SECRET_JWT || 'lsdfsdhf^565$_sdkjfgsdjfgsdfg';
const maxSize = 1024;

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
    //check token
    const { token } = data;
    const userData = data.data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }
    
    if (!userData.id || userData.id === "new") {
      userData.id = uuidv4();
    }
    
    const { phone, id } = userData;
    
    if (!(phone)) {
      return { errorCode: 'EMPTY_FIELDS' };
    }
    // check doubles by phone
    const queryPhone = `
      SELECT *
      FROM users
      WHERE phone = ? AND isDeleted = "NO" AND id != ?
      LIMIT 0,1
    `;
    try {
      const rows = await pool.query(queryPhone, [phone, id]);
      if (rows.length) {
        return { errorCode: 'PHONE_EXISTS' };
      }
    }
    catch (err) {
      return { errorCode: 'INTERNAL_ERROR', err };
    }

    //save avatar
    const uploadDir = "cabinet/assets/img/profiles";
    if (userData.avatarData) {
      userData.avatar = await clImageSaver.save(userData.avatarData, uploadDir);
     }

    const query = `
      INSERT INTO users (id, fName, lName, mName, email, passwd, phone, avatar, isDeleted, idLastUserOperation, role, needPwdChange)
      VALUES (?, ?, ?, ?, ?, MD5(?), ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      fName = VALUES(fname), 
      lName = VALUES(lName), 
      mName = VALUES(mName),
      ${userData.passwd ? "passwd = VALUES(passwd)," : ""} 
      email = VALUES(eMail), 
      phone = VALUES(phone),
      ${userData.avatarData ? "avatar = VALUES(avatar)," : ""}
      isDeleted = VALUES(isDeleted),
      idLastUserOperation = VALUES(idLastUserOperation),
      role = VALUES(role),
      needPwdChange = VALUES(needPwdChange)
    `;

    try {
      const rows = await pool.query(query, 
        [
          id, 
          userData.fName || null, 
          userData.lName || null,
          userData.mName || null, 
          userData.email || null, 
          userData.passwd, 
          userData.phone, 
          userData.avatar || null, 
          userData.isDeleted ? userData.isDeleted : "NO", 
          user.id, 
          userData.role || "SELLER", 
          userData.needPwdChange || "NO"]);
      
      return { "id" : id, "fullData": userData, freshToken: user.token };
    } catch (err) {
      return { errorCode : "INTERNAL_ERROR", err} ;
    }
  }

  static async register(pool, data) {
    const userData = data.data;
    userData.id = uuidv4();
    userData.needPwdChange = "YES";
    userData.passwd = md5(uuidv4());

    myUser = new clUser(id, userData);
    myUser.generateToken();
    const res = await myUser.save(pool, {token: myUser.token, data: userData});
    return res;
  }
}


module.exports = clUser;