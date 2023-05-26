    SELECT 
        Item.itemid,
        CUSTOMRECORD_FC_SPECIAL_SO_RULE.id,
        BUILTIN.DF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_mon_due_day) AS DueDayMonDeliv,
        BUILTIN.DF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_tue_due_day) AS DueDayTueDeliv,
        BUILTIN.DF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_wed_due_day) AS DueDayWedDeliv,
        BUILTIN.DF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_thu_due_day) AS DueDayThuDeliv,
        BUILTIN.DF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_fri_due_day) AS DueDayFriDeliv,
        BUILTIN.DF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_sat_due_day) AS DueDaySatDeliv,
        BUILTIN.DF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_sun_due_day) AS DueDaySunDeliv,
        BUILTIN.CF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_mon_due_time) AS DueTimeMonDeliv,
        BUILTIN.CF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_tue_due_time) AS DueTimeTueDeliv,
        BUILTIN.CF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_wed_due_time) AS DueTimeWedDeliv,
        BUILTIN.CF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_thu_due_time) AS DueTimeThuDeliv,
        BUILTIN.CF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_fri_due_time) AS DueTimeFriDeliv,
        BUILTIN.CF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_sat_due_time) AS DueTimeSatDeliv,
        BUILTIN.CF(CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_sun_due_time) AS DueTimeSunDeliv,
	MonTime.custrecord_time_decimal

    FROM Item
    JOIN CUSTOMRECORD_FC_SPECIAL_SO_RULE ON CUSTOMRECORD_FC_SPECIAL_SO_RULE.id = Item.custitem_fc_special_so_rule
    JOIN CUSTOMRECORD_FC_TIMEOFDAY AS MonTime ON MonTime.id = CUSTOMRECORD_FC_SPECIAL_SO_RULE.custrecord_mon_due_time

