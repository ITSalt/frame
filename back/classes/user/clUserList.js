const clUser = require("./clUser");

class clUserList {
  static async getUserList(pool, data) {
    //check token
    const { token } = data;
    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    let { startFrom, count, sort } = data;
    startFrom = startFrom || 0;
    count = count || 10;
    sort = sort || "fName, lName";

    const query = `
      SELECT id, fName, lName, mName, email, phone, avatar, created
      FROM users
      WHERE isDeleted = "NO"
      ORDER BY ${sort}
      LIMIT ?,?
    `;

    try {
      const rows = await pool.query(query, [startFrom, count]);
      return { rows, freshToken: user.token };
    } catch (err) {
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }
}

module.exports = clUserList;