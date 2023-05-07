WITH TestTable AS (
    SELECT Transaction.id AS traninternalid,
        TransactionLine.id AS tranlineinternalid,
        Item.itemid,
        Transaction.shipdate AS so_shipdate,
        Transaction.createddate AS so_createddate,
        (
            CASE
                WHEN (
                    (TO_CHAR(Transaction.shipdate, 'DY') = 'WED')
                    AND (Item.custitem_fc_sorule_wed_day IS NOT NULL)
                    AND (Item.custitem_fc_sorule_wed_numdays IS NOT NULL)
                ) THEN TO_DATE(TO_CHAR(
                    NEXT_DAY(
                        Transaction.shipdate - (
                            1 + (
                                7 * NVL(
                                    REGEXP_SUBSTR(
                                        BUILTIN.DF(Item.custitem_fc_sorule_wed_day),
                                        '([0-9]{1,2})$'
                                    ),
                                    1
                                )
                            )
                        ),
                        UPPER(
                            REGEXP_SUBSTR(
                                BUILTIN.DF(Item.custitem_fc_sorule_wed_day),
                                '^([[:alpha:]]{3})'
                            )
                        )
                    ),
                    'YYYYMMDD'
                ) || LPAD(
                    NVL(Item.custitem_fc_sorule_wed_numdays, '0'),
                    2,
                    '0'
                ) || ':00:00', 'YYYYMMDDHH24:MI:SS')
                ELSE NULL
            END
        ) AS item_specialduedatetime
    FROM TransactionLine
        JOIN Item ON Item.id = TransactionLine.item
        JOIN ItemVendor ON item.id = itemVendor.item
        JOIN Transaction ON Transaction.id = TransactionLine.transaction
    WHERE Transaction.type = 'SalesOrd'
        AND BUILTIN.CF(Transaction.status) IN ('SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E')
)
SELECT traninternalid,
    tranlineinternalid,
    itemid,
    so_shipdate,
    so_createddate,
    (
        CASE
            WHEN so_createddate > item_specialduedatetime THEN 'LATE!'
            ELSE NULL
        END
    ) AS itemislate
FROM TestTable (
        CASE
            WHEN (so_createddate > item_specialduedatetime) THEN 'LATE!'
            ELSE NULL
        END
    ) AS itemislate