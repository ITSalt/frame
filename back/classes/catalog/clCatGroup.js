const clUser = require("./../user/clUser");
const { clImageSaver } = require('../clImageSaver');
const { v4: uuidv4 } = require('uuid');

class clCatGroup {
  static async save(pool, data) {
    //check token
    const { token } = data;
    const userData = data.data;

    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    //save avatar
    const uploadDir = "cabinet/assets/img/catalog";
    if (userData.newImage) {
      userData.image = await clImageSaver.save(userData.newImage, uploadDir);
    }
    
    if (!userData.id || userData.id === "new") {
      userData.id = uuidv4();
    }
    const { id, name, idParent, description, image, isDeleted } = userData;
    
    const query = `
      INSERT INTO categoryGroups (id, name, idParent, description, image, isDeleted, idLastUserOperation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      idParent = VALUES(idParent),
      description = VALUES(description),
      ${userData.newImage ? "image = VALUES(image)," : ""}
      isDeleted = VALUES(isDeleted),
      idLastUserOperation = VALUES(idLastUserOperation)
    `;

    try {
      const rows = await pool.query(query, [id, name, idParent, description, image, isDeleted || "NO", user.id]);
      return { id, freshToken: user.token };
    } catch (err) {
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }

  static async load(pool, data) {
    const { id } = data;
    if (!id)
      return { errorCode: "NO_ID" };

    const query = `
      SELECT
        cg.*,
        JSON_ARRAY() as items
      FROM
        categoryGroups cg
      WHERE
        cg.id = ? AND
        cg.isDeleted = 'NO'
      LIMIT 0, 1
    `;

    const queryItems = `
      SELECT
        ci.*
      FROM
        categoryItems ci
      WHERE
        ci.idGroup = ?
        AND ci.isDeleted = 'NO'
      ORDER BY ci.name
    `;

    try {
      const groups = await pool.query(query, [id]);
      groups[0].items = await pool.query(queryItems, [id]);
      
      return { rows: groups };
    } catch (err) {
      console.log(err);
      return { errorCode: "INTERNAL_ERROR", err };
    }

  }

  static async loadParentList(pool, data) {
    const { id } = data;
    if (!id)
      return { errorCode: "NO_ID" };

    const query = `
      WITH RECURSIVE parent_hierarchy AS (
        SELECT c.*
        FROM categoryGroups c
        WHERE c.id = ? and c.isDeleted = "NO"
        UNION ALL
        SELECT t.*
        FROM categoryGroups t
        INNER JOIN parent_hierarchy ph ON t.id = ph.idParent
        WHERE t.isDeleted = "NO"

      )
      SELECT *
      FROM parent_hierarchy;`;

    try {
      const rows = await pool.query(query, [id]);
      return { rows };
    }
    catch (err) {
      return { errorCode: "INTERNAL_ERROR", err };
    }
      
  }
}

module.exports = clCatGroup;