const clUser = require("./../user/clUser");
const { v4: uuidv4 } = require('uuid');

class clOrder {
  static async openOrder(pool, data) {
    //check token
    const { token } = data;
    const userData = data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    let rowsCheck = await clOrder.load(pool, { token, filterByState: "OPEN" });
    if (rowsCheck.errorCode)
      return { errorCode: rowsCheck.errorCode }

    if (!rowsCheck.rows || rowsCheck.rows.length === 0) {
      userData.id = uuidv4();
      const orderid = require('order-id')('mysecret');
      userData.orderNum = orderid.generate();
      userData.state = "OPEN";

      const query = `
        INSERT INTO orders (id, orderNum, idOwner, state, idLastUserOperation)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        state = VALUES(state),
        idLastUserOperation = VALUES(idLastUserOperation)
      `;
      try {
        const res = await pool.query(query, [userData.id, userData.orderNum, user.id, userData.state, user.id]);
      } catch (err) {
        console.error(err);
        return { errorCode: "INTERNAL_ERROR", err };
      }

      rowsCheck = await clOrder.load(pool, { token, filterByState: "OPEN" });
    }

    if (rowsCheck.errorCode)
      return { errorCode: rowsCheck.errorCode }

    if (rowsCheck.rows && rowsCheck.rows.length > 0) {
      return { "id": rowsCheck.rows[0].id, freshToken: rowsCheck.freshToken, rows : rowsCheck.rows };
    }
    else {
      return { errorCode: "INTERNAL_ERROR", err: "NO_OPENED_ORDER" };
    }
    
  }

  static async load(pool, data) {
    //check token
    const { token } = data;
    const userData = data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    
    const filterByState = userData.filterByState ? " AND o.state = ? " : "";

    const query = `
      SELECT 
          o.*,
          IF(ISNULL(op.id),
            JSON_ARRAY(),
            JSON_ARRAYAGG(JSON_OBJECT(
              "id", op.id,
              "idOrder", op.idOrder,
              "itemName", i.name,
              "itemImage", i.image,
              "itemMeasureUnit", i.measureUnit,
              "idItem", i.id,
              "idWH", op.idWH,
              "idGroup", cg.id,
              "groupName", cg.name,
              "orderQuantity", op.orderQuantity,
              "byedQuantity", op.byedQuantity)
            ) 
          ) as positions

        FROM orders o
          LEFT JOIN orderPositions op ON op.idOrder = o.id
          LEFT JOIN warehouse wh ON wh.id = op.idWH
          LEFT JOIN categoryItems i ON i.id = wh.idItem
          LEFT JOIN categoryGroups cg ON cg.id = i.idGroup
        WHERE o.idOwner = ? AND o.state = "OPEN"
        ${filterByState}
        GROUP BY o.id
    `;
    try {
      const dataArray = userData.filterByState ? [user.id, userData.filterByState] : [user.id];
      const rows = await pool.query(query, dataArray);
      return { rows, freshToken: user.token };
    } catch (err) {
      console.error(err);
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }

  static async sendOrder(pool, data) {
    //check token
    const { token } = data;
    const userData = data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    const query = `
      UPDATE orders SET state = "SENDED", idLastUserOperation = ? WHERE id = ? and idOwner = ? and state = "OPEN"
    `;

    const queryPositions = `
      UPDATE
        warehouse wh 
        JOIN orderPositions op ON wh.id = op.idWH
        JOIN orders o ON op.idOrder = o.id
        SET 
          wh.quantity = wh.quantity - op.orderQuantity,
          wh.idLastUserOperation = ?
        WHERE op.idOrder = ? and o.idOwner = ?
    `;

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      await conn.query(query, [user.id, userData.id, user.id]);
      await conn.query(queryPositions, [user.id, userData.id, user.id]);
      await conn.commit();
      
    } catch (err) {
      await conn.rollback();
      console.error(err);
      return { errorCode: "INTERNAL_ERROR", err };
    }
    finally {
      conn.release();
    }

    return { freshToken: user.token };
  }

}

module.exports = clOrder;