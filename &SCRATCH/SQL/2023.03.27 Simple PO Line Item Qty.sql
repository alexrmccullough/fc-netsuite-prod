SELECT TransactionLine.uniquekey AS tranlineuniquekey,
    Transaction.id AS tranid,
    Item.id AS itemid,
    ABS(SUM(TransactionLine.quantity)) AS linequantity
FROM TransactionLine
    JOIN Transaction ON Transaction.id = TransactionLine.transaction
    LEFT OUTER JOIN Item ON Item.id = TransactionLine.item
WHERE TransactionLine.mainline = 'F'
    AND Transaction.type = 'PurchOrd'
GROUP BY TransactionLine.uniquekey,
    Transaction.id,
    Item.id