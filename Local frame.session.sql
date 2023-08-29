UPDATE
warehouse wh JOIN orderPositions op ON wh.id = op.idWH
SET wh.quantity = wh.quantity - op.orderQuantity
WHERE op.idOrder = 'cf4de4cb-c62f-4ecd-a341-fee61d02b25f'
