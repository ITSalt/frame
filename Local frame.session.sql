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
  wh.idOwner = "id1"
order BY
  cg.name,ci.name
