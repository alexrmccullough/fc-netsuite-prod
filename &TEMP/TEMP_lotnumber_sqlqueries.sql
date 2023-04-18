SELECT
	Transaction.tranid,
	Transaction.shipdate AS shipdate,
	Transaction.entity AS customerinternalid,
	BUILTIN.DF(Transaction.entity) AS customername,
	SUM(TransactionLine.quantity) AS totalquantity,
	SUM(InventoryAssignment.quantity) AS totallottedquantity

FROM
	Transaction

INNER JOIN TransactionLine ON TransactionLine.transaction = Transaction.id
LEFT OUTER JOIN InventoryAssignment ON (
	TransactionLine.id = InventoryAssignment.transactionLine
	AND TransactionLine.transaction = inventoryAssignment.Transaction	
)
LEFT OUTER JOIN InventoryNumber ON InventoryAssignment.inventoryNumber = InventoryNumber.id
INNER JOIN Item ON TransactionLine.item = Item.id

WHERE
	Transaction.type = 'SalesOrd'
	AND BUILTIN.CF(Transaction.status) IN ('SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E')
	AND TransactionLine.itemType = 'InvtPart'
	AND Item.isLotItem = 'T'

GROUP BY 
	Transaction.tranid,
	Transaction.shipdate,
	Transaction.entity,
	BUILTIN.DF(Transaction.entity)	
	



-------------

                    SELECT
                        TransactionLine.item AS iteminternalid,
                        BUILTIN.DF(TransactionLine.item) AS itemname,
                        TransactionLine.transaction AS traninternalid,
                        InventoryAssignment.quantity AS lotquantity,
                        Transaction.type AS trantype,
                        Transaction.tranid AS tranid,
                        Transaction.duedate AS tranduedate,
                        BUILTIN.CF(Transaction.status) AS transtatus,
                        BUILTIN.DF(InventoryAssignment.inventoryNumber) AS lotnum,
			InventoryAssignment.inventoryNumber as inventorynumberinternalid,
			InventoryNumber.*
                    FROM
                        TransactionLine
                    JOIN
                        InventoryAssignment ON (
                            TransactionLine.id = InventoryAssignment.transactionLine
                            AND TransactionLine.transaction = inventoryAssignment.Transaction	
                        )
                    JOIN 
                        Transaction ON TransactionLine.transaction = Transaction.id
		   JOIN InventoryNumber ON InventoryAssignment.inventoryNumber = InventoryNumber.id
                    
                    WHERE
                        Transaction.type = 'PurchOrd'
                        AND BUILTIN.CF(Transaction.status) = 'PurchOrd:B'



---------------
SELECT
	InventoryNumber.item AS iteminternalid,
	BUILTIN.DF( InventoryNumber.Item ) AS itemid,
	InventoryNumber.InventoryNumber AS lotnum,
	InventoryNumber.id AS invnumberinternalid,
	INL.QuantityOnHand AS quantityonhand,
	TO_DATE( InventoryNumber.ExpirationDate) AS expirationdate,
	TO_DATE( InventoryNumber.ExpirationDate ) - TO_DATE( '4/1/2023' ) AS expirationdays
FROM
	InventoryNumber
	INNER JOIN InventoryNumberLocation AS INL ON
		( INL.InventoryNumber = InventoryNumber.ID )

