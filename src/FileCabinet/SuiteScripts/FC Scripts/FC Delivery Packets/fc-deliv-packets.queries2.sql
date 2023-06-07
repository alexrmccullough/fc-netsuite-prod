SELECT (
        TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity
    ) AS uniqueshipmentid,
    BUILTIN.DF(InvLine.item) AS itemname,
    Item.displayname,
    InvLine.memo AS linedescription,
    (
        TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity || '_' || CASE
            WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen'
            ELSE 'Not Frozen'
        END || '_' || Item.itemid
    ) AS sort1,
    (
        TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.entity || '_' || CASE
            WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen'
            ELSE 'Not Frozen'
        END
    ) AS ticketsection,
    (
        CASE
            WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen'
            ELSE 'Not Frozen'
        END
    ) AS frozen,
    LEAD(
        (
            TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.entity || '_' || CASE
                WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen'
                ELSE 'Not Frozen'
            END
        ),
        1
    ) OVER (
        ORDER BY (
                TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity || '_' || CASE
                    WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen'
                    ELSE 'Not Frozen'
                END || '_' || Item.itemid
            )
    ) AS next_ticketsection,
    LISTAGG(Inv.tranid, ',') WITHIN GROUP (
        ORDER BY Inv.tranid
    ) AS invoice_ids,
    SUM(InvLine.quantity) * -1 AS quantitydelivered
FROM NextTransactionLink AS NTL
    RIGHT OUTER JOIN Transaction AS SO ON (
        SO.id = NTL.previousDoc
        AND SO.type = 'SalesOrd'
    )
    RIGHT OUTER JOIN Transaction AS Inv ON (
        Inv.id = NTL.nextDoc
        AND Inv.type = 'CustInvc'
    )
    INNER JOIN TransactionLine AS InvLine ON Inv.id = InvLine.transaction
    LEFT OUTER JOIN PreviousTransactionLineLink AS PTLL ON (
        InvLine.id = PTLL.nextline
        AND InvLine.transaction = PTLL.nextdoc
    )
    LEFT OUTER JOIN TransactionLine AS SOLine ON (
        SOLine.transaction = PTLL.previousDoc
        AND SOLine.id = PTLL.previousLine
    )
    LEFT OUTER JOIN Item ON InvLine.item = Item.id
WHERE InvLine.mainline = 'F'
    AND InvLine.itemType != 'Discount'
    AND InvLine.itemType != 'ShipItem'
    AND InvLine.donotdisplayline = 'F'
    AND SO.shipdate >= '6/1/2023'
GROUP BY (
        TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity
    ),
    BUILTIN.DF(InvLine.item),
    Item.displayname,
    InvLine.memo,
    (
        TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity || '_' || CASE
            WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen'
            ELSE 'Not Frozen'
        END || '_' || Item.itemid
    ),
    (
        TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.entity || '_' || CASE
            WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen'
            ELSE 'Not Frozen'
        END
    ),
    (
        CASE
            WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen'
            ELSE 'Not Frozen'
        END
    )
ORDER BY (
        TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity || '_' || CASE
            WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen'
            ELSE 'Not Frozen'
        END || '_' || Item.itemid
    ) 
    
    
    
    
    ---------
SELECT (
        TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity
    ) AS uniqueshipmentid,
    RouteShipment.custrecord_rd_route_shipment_ship_date AS shipdate,
    RouteShipment.custrecord_rd_route_shipment_route AS routeid,
    RouteShipment.custrecord_rd_route_shipment_seq_no AS routeseq,
    BUILTIN.DF(SO.entity) AS customername,
    BUILTIN.DF(SO.custbody_rd_so_route) AS routename,
    SO.id AS so_id,
    SO.tranid AS so_num,
    Inv.id AS invoice_id,
    Inv.tranid AS invoice_num,
    Inv.foreignTotal AS invoice_totalamount,
    Inv.foreignAmountUnpaid AS invoice_amountpaid,
    Inv.foreignAmountPaid AS invoice_amountunpaid,
    SUM(
        CASE
            WHEN InvLine.itemtype = 'Discount' THEN InvLine.foreignAmount
            ELSE 0
        END
    ) AS invoice_discountamount,
    SUM(
        CASE
            WHEN InvLine.itemtype = 'ShipItem' THEN InvLine.foreignAmount
            ELSE 0
        END
    ) AS invoice_shipamount,
    TransactionShippingAddress.addrText AS shipaddress,
    TransactionBillingAddress.addrText AS billaddress,
    Inv.trandate AS invoice_date,
    Inv.duedate AS invoice_duedate,
    Inv.memo AS invoice_memo,
    Inv.terms AS invoice_terms,
    Inv.otherrefnum AS invoice_otherrefnum,
    BUILTIN.DF(Inv.employee) AS invoice_salesrep
FROM NextTransactionLink AS NTL
    RIGHT OUTER JOIN Transaction AS SO ON (
        SO.id = NTL.previousDoc
        AND SO.type = 'SalesOrd'
    )
    RIGHT OUTER JOIN Transaction AS Inv ON (
        Inv.id = NTL.nextDoc
        AND Inv.type = 'CustInvc'
    )
    LEFT OUTER JOIN CUSTOMRECORD_RD_ROUTE_SHIPMENT_RECORD AS RouteShipment ON (
        RouteShipment.custrecord_rd_route_shipment_sales_order = SO.id
    )
    LEFT OUTER JOIN TransactionShippingAddress ON (
        SO.shippingaddress = TransactionShippingAddress.nkey
    )
    LEFT OUTER JOIN TransactionBillingAddress ON (
        SO.billingaddress = TransactionBillingAddress.nkey
    )
    INNER JOIN TransactionLine AS InvLine ON (Inv.id = InvLine.transaction)
WHERE InvLine.donotdisplayline = 'F'
    AND SO.shipdate >= '5/26/2023'
GROUP BY (
        TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity
    ),
    RouteShipment.custrecord_rd_route_shipment_ship_date,
    RouteShipment.custrecord_rd_route_shipment_route,
    RouteShipment.custrecord_rd_route_shipment_seq_no,
    BUILTIN.DF(SO.entity),
    BUILTIN.DF(SO.custbody_rd_so_route),
    SO.id,
    SO.tranid,
    Inv.id,
    Inv.tranid,
    Inv.foreignTotal,
    Inv.foreignAmountUnpaid,
    Inv.foreignAmountPaid,
    TransactionShippingAddress.addrText,
    TransactionBillingAddress.addrText,
    Inv.trandate,
    Inv.duedate,
    Inv.memo,
    Inv.terms,
    Inv.otherrefnum,
    BUILTIN.DF(Inv.employee)
ORDER BY RouteShipment.custrecord_rd_route_shipment_ship_date,
    RouteShipment.custrecord_rd_route_shipment_route,
    RouteShipment.custrecord_rd_route_shipment_seq_no