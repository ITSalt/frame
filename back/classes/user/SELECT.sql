SELECT
  cg.*,
  IF(ISNULL(ci.id),
    JSON_ARRAY(),
    JSON_ARRAYAGG(JSON_OBJECT(
    "id", ci.id, 
    "name", ci.name, 
    "description", ci.description, 
    "slangTag", ci.slangTags,
    "image", ci.image
    ))
  ) as items,
  IF(ISNULL(cg2.id),
    JSON_ARRAY(),
    JSON_ARRAYAGG(JSON_OBJECT(
    "id", cg2.id, 
    "name", cg2.name, 
    "description", cg2.description, 
    "image", cg2.image
    ))
  ) as subGroups
  
FROM
  categoryGroups cg 
  LEFT JOIN categoryItems ci ON cg.id = ci.idGroup
  LEFT JOIN categoryGroups cg2 ON cg2.idParent = cg.id
WHERE 
  cg.isDeleted = 'NO' 
  AND ci.isDeleted = 'NO' 
  AND cg2.isDeleted = 'NO'
  and cg.idParent is null
GROUP BY cg.id
limit 0,1;