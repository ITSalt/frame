const clUser = require("./../user/clUser");
const { v4: uuidv4 } = require('uuid');

class clWarehouse {
  static async load(pool, data) {
    //check token
    const { token } = data;
    const userData = data.data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    const query = `
      SELECT
        wh.*,
        ci.name as itemName,
        ci.image as itemImage,
        ci.description as itemDescription,
        ci.measureUnit as measureUnit,
        cg.name as groupName,
        cg.image as groupImage,
        cg.description as groupDescription
      FROM
        warehouse wh
        JOIN categoryItems ci ON (ci.id = wh.idItem and ci.isDeleted = "NO") 
        JOIN categoryGroups cg ON (cg.id = ci.idGroup and cg.isDeleted = "NO")
      WHERE
        wh.idOwner = ?
      order BY
        cg.name,ci.name
    `;

    try {
      const rows = await pool.execute(query, [user.id]);
      return { rows, freshToken: user.token };
    } catch (error) {
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }

  static async loadOne(pool, data) {
    //check token
    const { token } = data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    const query = `
      SELECT
        wh.*,
        ci.name as itemName,
        ci.image as itemImage,
        ci.description as itemDescription,
        ci.measureUnit as measureUnit,
        cg.name as groupName,
        cg.image as groupImage,
        cg.description as groupDescription
      FROM
        warehouse wh
        JOIN categoryItems ci ON (ci.id = wh.idItem and ci.isDeleted = "NO") 
        JOIN categoryGroups cg ON (cg.id = ci.idGroup and cg.isDeleted = "NO")
      WHERE
        wh.id = ? and wh.idOwner = ?
    `;

    try {
      const rows = await pool.execute(query, [data.id, user.id]);
      return { rows, freshToken: user.token };
    } catch (error) {
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }

  static async loadOneByItem(pool, data) {
    //check token
    const { token } = data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    const query = `
      SELECT
        wh.*,
        ci.name as itemName,
        ci.image as itemImage,
        ci.description as itemDescription,
        ci.measureUnit as measureUnit,
        cg.name as groupName,
        cg.image as groupImage,
        cg.description as groupDescription
      FROM
        warehouse wh
        JOIN categoryItems ci ON (ci.id = wh.idItem and ci.isDeleted = "NO") 
        JOIN categoryGroups cg ON (cg.id = ci.idGroup and cg.isDeleted = "NO")
      WHERE
        wh.idItem = ? and wh.idOwner = ?
    `;

    try {
      const rows = await pool.execute(query, [data.idItem, user.id]);
      return { rows, freshToken: user.token };
    } catch (error) {
      console.error(error);
      return { errorCode: "INTERNAL_ERROR", error };
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

    const query = `
      insert into warehouse 
        (id, idItem, idOwner, quantity, isDeleted, idLastUserOperation)
        values (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        quantity = quantity + VALUES(quantity)`;

    try {
      const rows = await pool.execute(query, [userData.id, userData.idItem, user.id, userData.plusQuantity, userData.isDeleted ? userData.isDeleted : "NO", user.id]);
      return { id : user.id, freshToken: user.token };
    }
    catch (error) {
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }
}

module.exports = clWarehouse;