const clUser = require("./../user/clUser");
const { clImageSaver } = require('../clImageSaver');
const { v4: uuidv4 } = require('uuid');

class clCatItem {
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
    else
      userData.image = userData.image || null;

    if (!userData.id || userData.id === "new") {
      userData.id = uuidv4();
    }
    const { id, name, description, slangTags, idGroup, image, isDeleted } = userData;

    const query = `
      INSERT INTO categoryItems (id, name, description, slangTags, idGroup, image, isDeleted, idLastUserOperation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      idGroup = VALUES(idGroup),
      description = VALUES(description),
      slangTags = VALUES(slangTags),
      ${userData.newImage ? "image = VALUES(image)," : ""}
      isDeleted = VALUES(isDeleted),
      idLastUserOperation = VALUES(idLastUserOperation)
    `;

    try {
      const rows = await pool.query(query, [id, name, description, slangTags, idGroup, image, isDeleted || "NO", user.id]);
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
        ci.*
      FROM
        categoryItems ci
      WHERE
        ci.id = ? AND
        ci.isDeleted = 'NO'
      LIMIT 0, 1
    `;


    try {
      const rows = await pool.query(query, [id]);
      
      return { rows };
    } catch (err) {
      console.log(err);
      return { errorCode: "INTERNAL_ERROR", err };
    }

  }
}

module.exports = clCatItem ;