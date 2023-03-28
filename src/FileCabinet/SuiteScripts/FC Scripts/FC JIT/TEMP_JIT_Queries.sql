SELECT
   TransactionLine.uniquekey,
   Transaction.id AS tranid,
   Item.id AS itemid,
   Item.displayname AS itemdisplayname,
   InventoryNumber.inventorynumber,
   SUM(TransactionLine.quantity) AS linequantity,
   SUM(InventoryAssignment.quantity) AS lottedQuantity,
   SUM(TransactionLine.quantity) - SUM(InventoryAssignment.quantity) AS unlottedquantity
   

FROM 
   TransactionLine

JOIN Transaction ON  Transaction.id =TransactionLine.transaction
JOIN InventoryAssignment ON 
   ( InventoryAssignment.transactionline = TransactionLine.id AND
     inventoryAssignment.transaction = transactionLine.transaction
   )
JOIN InventoryNumber ON Inventorynumber.id = InventoryAssignment.inventorynumber
JOIN Item ON Item.id = TransactionLine.item

WHERE
   Transaction.type = 'SalesOrd' AND
   TransactionLine.mainline = 'F'


GROUP BY
   TransactionLine.uniquekey,
   Item.id,
   Item.displayname,
   InventoryNumber.inventoryNumber,
   Transaction.id

ORDER BY
   Transaction.id,
   Item.id



FROM (
SELECT
   TransactionLine.uniquekey,
   Transaction.id AS tranid,
   Item.id AS itemid,
   Item.displayname AS itemdisplayname,
   InventoryNumber.inventorynumber,
   SUM(TransactionLine.quantity) AS linequantity,
   SUM(InventoryAssignment.quantity) AS lottedQuantity,
   SUM(TransactionLine.quantity) - SUM(InventoryAssignment.quantity) AS unlottedquantity
   

FROM 
   TransactionLine

JOIN Transaction ON  Transaction.id =TransactionLine.transaction
JOIN InventoryAssignment ON 
   ( InventoryAssignment.transactionline = TransactionLine.id AND
     inventoryAssignment.transaction = transactionLine.transaction
   )
JOIN InventoryNumber ON Inventorynumber.id = InventoryAssignment.inventorynumber
JOIN Item ON Item.id = TransactionLine.item

WHERE
   Transaction.type = 'SalesOrd' AND
   TransactionLine.mainline = 'F'


GROUP BY
   TransactionLine.uniquekey,
   Item.id,
   Item.displayname,
   InventoryNumber.inventoryNumber,
   Transaction.id

ORDER BY
   Transaction.id,
   Item.id