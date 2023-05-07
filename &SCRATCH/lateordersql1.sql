SELECT Transaction.id AS traninternalid,
    Transaction.tranid AS tranid,
    BUILTIN.DF(Transaction.entity) as customerid,
    Transaction.shipdate AS shipdate,
    TO_CHAR(
        Transaction.createddate,
        'YYYY-MM-DD HH24:MI:SS'
    ) AS SO_CreatedDate,
    TO_CHAR(
        Transaction.lastModifiedDate,
        'YYYY-MM-DD HH24:MI:SS'
    ) AS SO_LastModifiedDate,
    TO_CHAR (
        TransactionLine.lineLastModifiedDate,
        'YYYY-MM-DD HH24:MI:SS'
    ) AS Line_LastModifiedDate,
    (
        CASE
            WHEN TO_CHAR(Transaction.shipdate, 'DY') = 'WED' THEN NEXT_DAY(
                Transaction.shipdate - 8,
                UPPER(SUBSTR(Item.custitem_fc_sorule_wed_day, 1, 3))
            )
            ELSE ''
        END
    ) AS Item_SpecialDueDate,
    Item.id as iteminternalid,
    Item.itemId as itemid,
    Item.displayname as itemdisplayname,
    FROM TransactionLine
    JOIN Item ON Item.id = TransactionLine.item
    JOIN ItemVendor ON item.id = itemVendor.item
    JOIN Transaction ON Transaction.id = TransactionLine.transaction
WHERE Transaction.type = 'SalesOrd'
    AND BUILTIN.CF(Transaction.status) IN ('SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E')