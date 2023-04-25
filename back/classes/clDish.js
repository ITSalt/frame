class clDish {
  static async getFullTechCard(pool, id) {
    const rows = await pool.query(`
      WITH RECURSIVE cte AS (
        SELECT ri.id_Food, ri.id_Dish, rf.Name, rf.IsSemi, ri.Quantity, ri.SortOrder, 0 as "idParentFood", 1 AS level
        FROM rest_Ingredients ri
        JOIN rest_Foods rf ON ri.id_Food = rf.id
        WHERE ri.id_Dish = ? AND rf.isDelete = 'NO'
        GROUP BY ri.id_Food
        UNION
        -- Получаем ингредиенты для каждого продукта-полуфабриката
        SELECT fi.id_SemiFood, cte.id_Dish, rf2.Name, rf2.IsSemi, fi.Quantity, fi.SortOrder, fi.id_Food AS "idParentFood", cte.level + 1 AS level
        FROM cte
        JOIN FoodIngredients fi ON fi.id_Food = cte.id_Food
        JOIN rest_Foods rf2 ON fi.id_SemiFood = rf2.id AND rf2.isDelete = 'NO'
      )

      SELECT *
      FROM cte
      LIMIT 0,100

    `, [id]);

    //cycle by rows and fill ierarhy object
    const techCard = {};
    for (let i = 0; i < rows.length; i++) {}


    return rows;
  }

}

module
  .exports = clDish;