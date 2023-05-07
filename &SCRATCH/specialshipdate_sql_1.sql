SELECT Transaction.id AS traninternalid,
    TransactionLine.id AS tranlineinternalid,
    Item.itemid,
    Transaction.shipdate,
    UPPER(
        SUBSTR(
            BUILTIN.DF(Item.custitem_fc_sorule_wed_day),
            1,
            3
        )
    ) AS daytest,
    LPAD('1', 2, '0') AS test,
    LPAD(
        NVL(Item.custitem_fc_sorule_wed_numdays, '0'),
        2,
        '0'
    ) || ':00:00' AS test2,
    REGEXP_SUBSTR(
        BUILTIN.DF(Item.custitem_fc_sorule_wed_day),
        '^([[:alpha:]]{3})'
    ) AS test3,
    REGEXP_SUBSTR(
        BUILTIN.DF(Item.custitem_fc_sorule_wed_day),
        '([0-9]{1,2})$'
    ) AS test4,
    NVL(
        REGEXP_SUBSTR(
            BUILTIN.DF(Item.custitem_fc_sorule_wed_day),
            '([0-9]{1,2})$'
        ),
        1
    ) AS test5,
    (
        CASE
            WHEN TO_CHAR(Transaction.shipdate, 'DY') = 'MON' THEN TO_CHAR(
                NEXT_DAY(
                    Transaction.shipdate - (
                        1 + (
                            7 * NVL(
                                REGEXP_SUBSTR(
                                    BUILTIN.DF(Item.custitem_fc_sorule_mon_day),
                                    '([0-9]{1,2})$'
                                ),
                                1
                            )
                        )
                    ),
                    'MON'
                ),
                'YYYYMMDD'
            ) || LPAD(
                NVL(Item.custitem_fc_sorule_wed_numdays, '0'),
                2,
                '0'
            ) || ':00:00'
            WHEN TO_CHAR(Transaction.shipdate, 'DY') = 'TUE' THEN TO_CHAR(
                NEXT_DAY(
                    Transaction.shipdate - (
                        1 + (
                            7 * NVL(
                                REGEXP_SUBSTR(
                                    BUILTIN.DF(Item.custitem_fc_sorule_tue_day),
                                    '([0-9]{1,2})$'
                                ),
                                1
                            )
                        )
                    ),
                    'MON'
                ),
                'YYYYMMDD'
            ) || LPAD(
                NVL(Item.custitem_fc_sorule_wed_numdays, '0'),
                2,
                '0'
            ) || ':00:00'
            WHEN TO_CHAR(Transaction.shipdate, 'DY') = 'WED' THEN TO_CHAR(
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
                    'MON'
                ),
                'YYYYMMDD'
            ) || LPAD(
                NVL(Item.custitem_fc_sorule_wed_numdays, '0'),
                2,
                '0'
            ) || ':00:00'
            WHEN TO_CHAR(Transaction.shipdate, 'DY') = 'THU' THEN TO_CHAR(
                NEXT_DAY(
                    Transaction.shipdate - (
                        1 + (
                            7 * NVL(
                                REGEXP_SUBSTR(
                                    BUILTIN.DF(Item.custitem_fc_sorule_thu_day),
                                    '([0-9]{1,2})$'
                                ),
                                1
                            )
                        )
                    ),
                    'MON'
                ),
                'YYYYMMDD'
            ) || LPAD(
                NVL(Item.custitem_fc_sorule_wed_numdays, '0'),
                2,
                '0'
            ) || ':00:00'
            WHEN TO_CHAR(Transaction.shipdate, 'DY') = 'FRI' THEN TO_CHAR(
                NEXT_DAY(
                    Transaction.shipdate - (
                        1 + (
                            7 * NVL(
                                REGEXP_SUBSTR(
                                    BUILTIN.DF(Item.custitem_fc_sorule_fri_day),
                                    '([0-9]{1,2})$'
                                ),
                                1
                            )
                        )
                    ),
                    'MON'
                ),
                'YYYYMMDD'
            ) || LPAD(
                NVL(Item.custitem_fc_sorule_wed_numdays, '0'),
                2,
                '0'
            ) || ':00:00'
            WHEN TO_CHAR(Transaction.shipdate, 'DY') = 'SAT' THEN TO_CHAR(
                NEXT_DAY(
                    Transaction.shipdate - (
                        1 + (
                            7 * NVL(
                                REGEXP_SUBSTR(
                                    BUILTIN.DF(Item.custitem_fc_sorule_sat_day),
                                    '([0-9]{1,2})$'
                                ),
                                1
                            )
                        )
                    ),
                    'MON'
                ),
                'YYYYMMDD'
            ) || LPAD(
                NVL(Item.custitem_fc_sorule_wed_numdays, '0'),
                2,
                '0'
            ) || ':00:00'
            WHEN TO_CHAR(Transaction.shipdate, 'DY') = 'SUN' THEN TO_CHAR(
                NEXT_DAY(
                    Transaction.shipdate - (
                        1 + (
                            7 * NVL(
                                REGEXP_SUBSTR(
                                    BUILTIN.DF(Item.custitem_fc_sorule_sun_day),
                                    '([0-9]{1,2})$'
                                ),
                                1
                            )
                        )
                    ),
                    'MON'
                ),
                'YYYYMMDD'
            ) || LPAD(
                NVL(Item.custitem_fc_sorule_wed_numdays, '0'),
                2,
                '0'
            ) || ':00:00'
            ELSE NULL
        END
    ) AS Item_SpecialDueDateTime,
    FROM TransactionLine
    JOIN Item ON Item.id = TransactionLine.item
    JOIN ItemVendor ON item.id = itemVendor.item
    JOIN Transaction ON Transaction.id = TransactionLine.transaction
WHERE Transaction.type = 'SalesOrd'
    AND BUILTIN.CF(Transaction.status) IN ('SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E')