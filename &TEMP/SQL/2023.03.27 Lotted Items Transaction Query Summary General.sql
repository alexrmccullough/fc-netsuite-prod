SELECT
                        TransactionLine.uniquekey AS tranlineuniquekey,
                        Transaction.id AS tranid,
                        Item.id AS itemid,
                        Item.displayname AS itemdisplayname,
                        InventoryNumber.inventorynumber,
                        ABS(SUM(TransactionLine.quantity)) AS linequantity,
                        ABS(SUM(InventoryAssignment.quantity)) AS lottedquantity,
                        ABS(SUM(TransactionLine.quantity)) - COALESCE( ABS(SUM(InventoryAssignment.quantity)) , 0) AS unlottedquantity,
                        COALESCE(ABS(SUM(InvtAssnmtSummary1.totallottedqtyinline)), 0) as totallottedqtyinline,
			ABS(SUM(TransactionLine.quantity)) -   COALESCE(ABS(SUM(InvtAssnmtSummary1.totallottedqtyinline)), 0) as totalunlottedqtyinline,
			Transaction.type
                        
                    FROM 
                        TransactionLine
                    
                    JOIN Transaction ON  Transaction.id =TransactionLine.transaction
                    LEFT OUTER JOIN InventoryAssignment ON 
                        ( InventoryAssignment.transactionline = TransactionLine.id AND
                        inventoryAssignment.transaction = transactionLine.transaction
                        )
                    
                    LEFT OUTER JOIN 
                        (
                        SELECT
                        InventoryAssignment.transactionline, 
                        InventoryAssignment.transaction,
                        SUM(InventoryAssignment.quantity) AS totallottedqtyinline
                        FROM
                        InventoryAssignment
                        GROUP BY 
                        InventoryAssignment.transactionline,
                        InventoryAssignment.transaction
                    ) 
                        AS InvtAssnmtSummary1 
                        ON
                            ( InvtAssnmtSummary1.transactionline = TransactionLine.id AND
                            InvtAssnmtSummary1.transaction = transactionLine.transaction
                            )
                    
                    LEFT OUTER JOIN InventoryNumber ON Inventorynumber.id = InventoryAssignment.inventorynumber
                    LEFT OUTER JOIN Item ON Item.id = TransactionLine.item
                    
                    WHERE
                        TransactionLine.mainline = 'F' 
			AND Transaction.type = 'SalesOrd'
                    
                    
                    GROUP BY
                        TransactionLine.uniquekey,
                        Item.id,
                        Item.displayname,
                        InventoryNumber.inventoryNumber,
                        Transaction.id,
			Transaction.type
                    
                    ORDER BY
                        Transaction.id,
                        Item.id       





                        