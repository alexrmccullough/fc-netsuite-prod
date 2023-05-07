WITH TestTable AS (
    SELECT Transaction.id AS traninternalid,
        Transaction.tranid AS tranid,
        TransactionLine.id AS tranlineinternalid,
        BUILTIN.DF(Transaction.entity) AS customer,
        Item.itemid,
        Item.displayname AS itemdisplayname,
        Transaction.shipdate AS so_shipdate,
        Transaction.createddate AS so_createddate,
        TO_DATE('19000101', 'YYYYMMDD') AS no_delivery,
        (
            CASE
                WHEN (
                    (TO_CHAR(Transaction.shipdate, 'DY') = 'WED')
                    AND (Item.custitem_fc_sorule_mon_day IS NOT NULL)
                ) THEN (
                    CASE
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_mon_day) = 'No Delivery' THEN (TO_DATE('19000101', 'YYYYMMDD'))
                        WHEN (
                            BUILTIN.DF(Item.custitem_fc_sorule_mon_hour) IS NULL
                            OR BUILTIN.DF(Item.custitem_fc_sorule_mon_hour) < 0
                            OR BUILTIN.DF(Item.custitem_fc_sorule_mon_hour) > 23
                        ) THEN (TO_DATE('19200101', 'YYYYMMDD'))
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_mon_day) = 'Monday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'MON'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_mon_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_mon_day) = 'Tuesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'TUE'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_mon_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_mon_day) = 'Wednesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'WED'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_mon_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_mon_day) = 'Thursday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'THU'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_mon_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_mon_day) = 'Friday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'FRI'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_mon_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_mon_day) = 'Saturday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SAT'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_mon_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_mon_day) = 'Sunday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SUN'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_mon_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        ELSE NULL
                        END
                )
                                WHEN (
                    (TO_CHAR(Transaction.shipdate, 'DY') = 'WED')
                    AND (Item.custitem_fc_sorule_tue_day IS NOT NULL)
                ) THEN (
                    CASE
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_tue_day) = 'No Delivery' THEN (TO_DATE('19000101', 'YYYYMMDD'))
                        WHEN (
                            BUILTIN.DF(Item.custitem_fc_sorule_tue_hour) IS NULL
                            OR BUILTIN.DF(Item.custitem_fc_sorule_tue_hour) < 0
                            OR BUILTIN.DF(Item.custitem_fc_sorule_tue_hour) > 23
                        ) THEN (TO_DATE('19200101', 'YYYYMMDD'))
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_tue_day) = 'Monday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'MON'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_tue_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_tue_day) = 'Tuesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'TUE'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_tue_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_tue_day) = 'Wednesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'WED'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_tue_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_tue_day) = 'Thursday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'THU'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_tue_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_tue_day) = 'Friday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'FRI'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_tue_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_tue_day) = 'Saturday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SAT'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_tue_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_tue_day) = 'Sunday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SUN'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_tue_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        ELSE NULL
                        END
                )
                WHEN (
                    (TO_CHAR(Transaction.shipdate, 'DY') = 'WED')
                    AND (Item.custitem_fc_sorule_wed_day IS NOT NULL)
                ) THEN (
                    CASE
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_wed_day) = 'No Delivery' THEN (TO_DATE('19000101', 'YYYYMMDD'))
                        WHEN (
                            BUILTIN.DF(Item.custitem_fc_sorule_wed_hour) IS NULL
                            OR BUILTIN.DF(Item.custitem_fc_sorule_wed_hour) < 0
                            OR BUILTIN.DF(Item.custitem_fc_sorule_wed_hour) > 23
                        ) THEN (TO_DATE('19200101', 'YYYYMMDD'))
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_wed_day) = 'Monday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'MON'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_wed_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_wed_day) = 'Tuesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'TUE'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_wed_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_wed_day) = 'Wednesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'WED'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_wed_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_wed_day) = 'Thursday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'THU'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_wed_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_wed_day) = 'Friday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'FRI'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_wed_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_wed_day) = 'Saturday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SAT'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_wed_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_wed_day) = 'Sunday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SUN'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_wed_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        ELSE NULL
                        END
                )
                                WHEN (
                    (TO_CHAR(Transaction.shipdate, 'DY') = 'WED')
                    AND (Item.custitem_fc_sorule_thu_day IS NOT NULL)
                ) THEN (
                    CASE
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_thu_day) = 'No Delivery' THEN (TO_DATE('19000101', 'YYYYMMDD'))
                        WHEN (
                            BUILTIN.DF(Item.custitem_fc_sorule_thu_hour) IS NULL
                            OR BUILTIN.DF(Item.custitem_fc_sorule_thu_hour) < 0
                            OR BUILTIN.DF(Item.custitem_fc_sorule_thu_hour) > 23
                        ) THEN (TO_DATE('19200101', 'YYYYMMDD'))
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_thu_day) = 'Monday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'MON'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_thu_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_thu_day) = 'Tuesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'TUE'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_thu_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_thu_day) = 'Wednesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'WED'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_thu_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_thu_day) = 'Thursday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'THU'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_thu_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_thu_day) = 'Friday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'FRI'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_thu_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_thu_day) = 'Saturday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SAT'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_thu_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_thu_day) = 'Sunday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SUN'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_thu_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        ELSE NULL
                        END
                )
                                WHEN (
                    (TO_CHAR(Transaction.shipdate, 'DY') = 'WED')
                    AND (Item.custitem_fc_sorule_fri_day IS NOT NULL)
                ) THEN (
                    CASE
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_fri_day) = 'No Delivery' THEN (TO_DATE('19000101', 'YYYYMMDD'))
                        WHEN (
                            BUILTIN.DF(Item.custitem_fc_sorule_fri_hour) IS NULL
                            OR BUILTIN.DF(Item.custitem_fc_sorule_fri_hour) < 0
                            OR BUILTIN.DF(Item.custitem_fc_sorule_fri_hour) > 23
                        ) THEN (TO_DATE('19200101', 'YYYYMMDD'))
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_fri_day) = 'Monday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'MON'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_fri_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_fri_day) = 'Tuesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'TUE'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_fri_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_fri_day) = 'Wednesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'WED'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_fri_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_fri_day) = 'Thursday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'THU'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_fri_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_fri_day) = 'Friday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'FRI'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_fri_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_fri_day) = 'Saturday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SAT'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_fri_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_fri_day) = 'Sunday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SUN'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_fri_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        ELSE NULL
                        END
                )
                                WHEN (
                    (TO_CHAR(Transaction.shipdate, 'DY') = 'WED')
                    AND (Item.custitem_fc_sorule_sat_day IS NOT NULL)
                ) THEN (
                    CASE
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sat_day) = 'No Delivery' THEN (TO_DATE('19000101', 'YYYYMMDD'))
                        WHEN (
                            BUILTIN.DF(Item.custitem_fc_sorule_sat_hour) IS NULL
                            OR BUILTIN.DF(Item.custitem_fc_sorule_sat_hour) < 0
                            OR BUILTIN.DF(Item.custitem_fc_sorule_sat_hour) > 23
                        ) THEN (TO_DATE('19200101', 'YYYYMMDD'))
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sat_day) = 'Monday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'MON'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sat_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sat_day) = 'Tuesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'TUE'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sat_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sat_day) = 'Wednesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'WED'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sat_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sat_day) = 'Thursday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'THU'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sat_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sat_day) = 'Friday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'FRI'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sat_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sat_day) = 'Saturday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SAT'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sat_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sat_day) = 'Sunday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SUN'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sat_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        ELSE NULL
                        END
                )
                                WHEN (
                    (TO_CHAR(Transaction.shipdate, 'DY') = 'WED')
                    AND (Item.custitem_fc_sorule_sun_day IS NOT NULL)
                ) THEN (
                    CASE
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sun_day) = 'No Delivery' THEN (TO_DATE('19000101', 'YYYYMMDD'))
                        WHEN (
                            BUILTIN.DF(Item.custitem_fc_sorule_sun_hour) IS NULL
                            OR BUILTIN.DF(Item.custitem_fc_sorule_sun_hour) < 0
                            OR BUILTIN.DF(Item.custitem_fc_sorule_sun_hour) > 23
                        ) THEN (TO_DATE('19200101', 'YYYYMMDD'))
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sun_day) = 'Monday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'MON'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sun_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sun_day) = 'Tuesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'TUE'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sun_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sun_day) = 'Wednesday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'WED'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sun_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sun_day) = 'Thursday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'THU'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sun_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sun_day) = 'Friday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'FRI'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sun_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sun_day) = 'Saturday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SAT'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sun_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        WHEN BUILTIN.DF(Item.custitem_fc_sorule_sun_day) = 'Sunday' THEN TO_DATE(
                            TO_CHAR(NEXT_DAY(Transaction.shipdate -8, 'SUN'), 'YYYYMMDD') ||
                            LPAD(NVL(Item.custitem_fc_sorule_sun_hour, '0'), 2, '0') ||
                            ':00:00',
                            'YYYYMMDDHH24:MI:SS'
                        )
                        ELSE NULL
                        END
                )
                ELSE NULL
            END
        ) AS item_specialduedatetime
    FROM TransactionLine
        JOIN Item ON Item.id = TransactionLine.item
        JOIN Transaction ON Transaction.id = TransactionLine.transaction
    WHERE Transaction.type = 'SalesOrd'
)
SELECT tranid,
    customer,
    itemid,
    itemdisplayname,
    TO_CHAR(so_shipdate, 'Dy MM/DD/YYYY') AS so_shipdate,
    TO_CHAR(so_createddate, 'Dy MM/DD/YYYY HH24:MI') AS so_createddatetime,
    TO_CHAR(item_specialduedatetime, 'Dy MM/DD/YYYY HH24:MI') AS item_specialduedatetime,
    (
        CASE
            WHEN item_specialduedatetime = TO_DATE('19000101', 'YYYYMMDD') THEN 'Delivery Not Available'
            WHEN item_specialduedatetime = TO_DATE('19200101', 'YYYYMMDD') THEN 'Invalid Order Due Time in Item Record'
            WHEN so_createddate > item_specialduedatetime THEN 'Ordered Late'
            ELSE NULL
        END
    ) AS specialitemrulestatus
FROM TestTable
WHERE
    item_specialduedatetime IS NOT NULL