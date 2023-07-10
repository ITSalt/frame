const jwt = require('jsonwebtoken'); 
const secretJWT = process.env.SECRET_JWT || 'lsdfsdhf^565$_sdkjfgsdjfgsdfg';

class clUser {
  constructor(id, data) {
    this.id = id;
    this.fullData = {...data};
    this.token = null;
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
      row.passwd = null;

      if (!row) {
        return { errorCode: 'USER_NOT_FOUND' };
      }

      const user = new clUser(
        row.id,
        row
      );

      const token = user.generateToken();

      return { token, user };
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

  async refreshTokenLifetime(token) {
    const decoded = await clUser.verifyToken(null, { token });
    if (decoded) {
      const refreshedToken = this.generateToken(decoded); // Generate a new token using the existing user data
      return refreshedToken;
    }
    return null;
  }

  generateToken() {  
    this.token = jwt.sign(this.fullData, secretJWT, {
      expiresIn: '1h',
    });

    return this.token;  
  }

  static async getUserDataByToken(pool, token, refreshToken = true) {
    const decoded = this.verifyToken(token);
    if (!decoded.errorCode) {
      const user = new clUser(
        decoded.id,
        decoded
      );
      if (refreshToken)
        this.generateToken();

      return user;
    }
    else
      return decoded;
  }
}

module.exports = clUser;