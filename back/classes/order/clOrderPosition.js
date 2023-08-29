const clUser = require("./../user/clUser");
const { v4: uuidv4 } = require('uuid');

class clOrderPosition {
  static async addToOrder(pool, data) {
    //check token
    const { token } = data;
    const userData = data.data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    if(!userData.idWH) {
      return { errorCode: "NO_WH_ID" };
    }
    
    if (!userData.id || userData.id === "new") {
      userData.id = uuidv4();
    }

    const query = `
      INSERT INTO orderPositions (id, idOrder, idWH, orderQuantity, idLastUserOperation)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      orderQuantity = VALUES(orderQuantity),
      idLastUserOperation = VALUES(idLastUserOperation)
    `;

    try {
      const rows = await pool.query(query, [userData.id, userData.idOrder, userData.idWH, userData.orderQuantity, user.id]);
      return { freshToken: user.token, rows : [userData] };
    } catch (err) {
      console.error(err);
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }

  static async delete(pool, data) {
    //check token
    const { token } = data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    const query = `
      DELETE 
        op.*
      FROM 
        orderPositions op JOIN orders o ON op.idOrder = o.id
      WHERE op.id = ? and o.idOwner = ?
    `;

    try {
      const rows = await pool.query(query, [data.id, user.id]);
      return { freshToken: user.token };
    } catch (err) {
      console.error(err);
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }

}

module.exports = clOrderPosition;