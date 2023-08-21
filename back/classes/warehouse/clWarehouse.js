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
}

module.exports = clWarehouse;