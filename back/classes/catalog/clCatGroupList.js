const clUser = require("./../user/clUser");

class clCatGroupList {
  static async load(pool, data) {
    //check token
    const { token } = data;
    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    let { startFrom, count, sort, idParentCatGroup } = data;
    startFrom = startFrom || 0;
    count = count || 50;
    sort = sort || "cg.name, cg2.name";
    idParentCatGroup = idParentCatGroup || null;

    const queryGroup = `SELECT distinct
      cg.*,
      JSON_ARRAY() as items,
      IF(ISNULL(cg2.id),
        JSON_ARRAY(),
        JSON_ARRAYAGG(JSON_OBJECT(
        "id", cg2.id, 
        "idParent", cg.id,
        "name", cg2.name, 
        "description", cg2.description, 
        "image", cg2.image,
        "items", JSON_ARRAY(),
        "subGroups", JSON_ARRAY()
        ))
      ) as subGroups
    FROM
      categoryGroups cg 
      LEFT JOIN categoryGroups cg2 ON (cg2.idParent = cg.id AND cg2.isDeleted = 'NO')
    WHERE 
      cg.isDeleted = 'NO'  
      and ${idParentCatGroup ? "cg.idParent = ?" : "cg.idParent is null"}
    GROUP BY cg.id
    ORDER BY ?
    LIMIT ?, ?`;

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
      const groups = await pool.query(queryGroup, idParentCatGroup ? [idParentCatGroup, sort, startFrom, count] : [sort, startFrom, count]);
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const items = await pool.query(queryItems, [group.id]);
        group.items = items;
      }
      return { rows: groups, freshToken: user.token };
    } catch (err) {
      console.log(err); 
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }

  static async loadOnlyWH(pool, data) {
    //check token
    const { token } = data;
    const user = await clUser.getUserDataByToken(pool, token, true);
    if (user.errorCode)
      return { errorCode: user.errorCode }

    let { startFrom, count, sort, idParentCatGroup } = data;
    startFrom = startFrom || 0;
    count = count || 50;
    sort = sort || "cg.name, cg2.name";
    idParentCatGroup = idParentCatGroup || null;

    const queryGroup = `SELECT distinct
      cg.*,
      JSON_ARRAY() as items,
      IF(ISNULL(cg2.id),
        JSON_ARRAY(),
        JSON_ARRAYAGG(JSON_OBJECT(
        "id", cg2.id, 
        "idParent", cg.id,
        "name", cg2.name, 
        "description", cg2.description, 
        "image", cg2.image,
        "items", JSON_ARRAY(),
        "subGroups", JSON_ARRAY()
        ))
      ) as subGroups
    FROM
      categoryGroups cg 
      LEFT JOIN categoryGroups cg2 ON (cg2.idParent = cg.id AND cg2.isDeleted = 'NO')
    WHERE 
      cg.isDeleted = 'NO'  
      and ${idParentCatGroup ? "cg.idParent = ?" : "cg.idParent is null"}
    GROUP BY cg.id
    ORDER BY ?
    LIMIT ?, ?`;

    const queryItems = `
      SELECT
        ci.*
      FROM
        categoryItems ci
        JOIN warehouse wi ON (wi.idItem = ci.id AND wi.isDeleted = 'NO' AND wi.quantity > 0 AND wi.idOwner = ?)
      WHERE
        ci.idGroup = ?
        AND ci.isDeleted = 'NO'
      ORDER BY ci.name
    `;
    

    try {
      const groups = await pool.query(queryGroup, idParentCatGroup ? [idParentCatGroup, sort, startFrom, count] : [sort, startFrom, count]);
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const items = await pool.query(queryItems, [user.id, group.id]);
        if (items.length)
          group.items = items;
        else {
          groups.splice(i, 1);
          i--;
        }
      }
      return { rows: groups, freshToken: user.token };
    } catch (err) {
      console.log(err); 
      return { errorCode: "INTERNAL_ERROR", err };
    }
  }

}

module.exports = clCatGroupList;