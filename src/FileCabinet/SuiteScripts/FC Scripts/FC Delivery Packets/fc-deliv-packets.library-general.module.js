
var dayjs;

define([
    '../Libraries/dayjs.min',
], main);

function main(
    dayjsModule
) {
    dayjs = dayjsModule;

    var exports = {
        Queries: {
            QUERY_SHIPMENTS_OLD1: {
                Query: `
                    SELECT DISTINCT
                        (TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.custbody_rd_so_route || '_' || SO.entity) AS uniqueshipmentid,
                        RouteShipment.custrecord_rd_route_shipment_ship_date AS shipdate,
                        BUILTIN.DF(SO.custbody_rd_so_route) AS routename,
                        SO.custbody_rd_so_stop,
                        BUILTIN.DF(SO.entity) AS customername,
                        RouteShipment.custrecord_rd_route_shipment_route,
                        RouteShipment.custrecord_rd_route_shipment_seq_no,
                        TransactionShippingAddress.addrText AS shipaddress,
                        LISTAGG(RouteShipment.custrecord_rd_route_shipment_sales_order, ',') WITHIN GROUP (ORDER BY RouteShipment.custrecord_rd_route_shipment_sales_order) AS so_ids
                        
                    FROM 
                        NextTransactionLink AS NTL
                        RIGHT OUTER JOIN Transaction AS SO ON (SO.id = NTL.previousDoc AND SO.type ='SalesOrd')
                        RIGHT OUTER JOIN Transaction AS Inv ON (Inv.id = NTL.nextDoc AND Inv.type='CustInvc')
                        LEFT OUTER JOIN CUSTOMRECORD_RD_ROUTE_SHIPMENT_RECORD AS RouteShipment ON 
                            RouteShipment.custrecord_rd_route_shipment_sales_order = SO.id
                        INNER JOIN TransactionShippingAddress ON SO.shippingaddress = TransactionShippingAddress.nkey

                    WHERE 
                        NULL IS NULL
                        @@START_SHIP_DATE@@ 
                        @@END_SHIP_DATE@@

                    GROUP BY 
                        (TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.custbody_rd_so_route || '_' || SO.entity),
                        RouteShipment.custrecord_rd_route_shipment_ship_date,
                        BUILTIN.DF(SO.custbody_rd_so_route),
                        BUILTIN.DF(SO.entity),
                        SO.custbody_rd_so_stop,
                        RouteShipment.custrecord_rd_route_shipment_route,
                        RouteShipment.custrecord_rd_route_shipment_seq_no,
                        TransactionShippingAddress.addrText

                    ORDER BY
                        RouteShipment.custrecord_rd_route_shipment_ship_date,
                        RouteShipment.custrecord_rd_route_shipment_route,
                        RouteShipment.custrecord_rd_route_shipment_seq_no
                `,
                Parameters: {
                    StartShipDate: `AND SO.shipdate >= '@@START_DATE@@'`,
                    EndShipDate: `AND SO.shipdate <= '@@END_DATE@@'`,
                },
                BuildQuery: function (startShipDate = null, endShipDate = null) {
                    let sqlQuery = this.Query;
                    if (startShipDate) {
                        let filter = this.Parameters.StartShipDate.replace('@@START_DATE@@', startShipDate);
                        sqlQuery = sqlQuery.replace('@@START_SHIP_DATE@@', filter);
                    }
                    if (endShipDate) {
                        let filter = this.Parameters.EndShipDate.replace('@@END_DATE@@', endShipDate);
                        sqlQuery = sqlQuery.replace('@@END_SHIP_DATE@@', filter);
                    }
                    return sqlQuery;
                },
            },
            QUERY_TRANSACTIONS: {
                Query: `
                    SELECT 
                        (
                            TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity
                        ) AS uniqueshipmentid,
                        RouteShipment.custrecord_rd_route_shipment_ship_date AS shipdate,
                        RouteShipment.custrecord_rd_route_shipment_route AS routeid,
                        RouteShipment.custrecord_rd_route_shipment_seq_no AS routeseq,
                        TransactionShipment.shippingMethod,
                        BUILTIN.DF(SO.entity) AS customername,
                        BUILTIN.DF(SO.custbody_rd_so_route) AS routename,
                        SO.id AS so_id,
                        SO.tranid AS so_num,
                        Inv.id AS invoice_id,
                        Inv.tranid AS invoice_num,
                        Inv.foreignTotal AS invoice_totalamount,
                        Inv.foreignAmountUnpaid AS invoice_amountunpaid,
                        Inv.foreignAmountPaid AS invoice_amountpaid,
                        SUM(
                            CASE
                                WHEN InvLine.itemtype = 'Discount' THEN InvLine.foreignAmount
                                ELSE 0
                            END
                        ) * -1 AS invoice_discountamount,
                        SUM(
                            CASE
                                WHEN InvLine.itemtype = 'ShipItem' THEN InvLine.foreignAmount
                                ELSE 0
                            END
                        ) * -1 AS invoice_shipamount,
                        SUM(
                            CASE
                                WHEN (InvLine.itemtype != 'Discount' AND InvLine.itemtype != 'ShipItem') THEN InvLine.foreignAmount
                                ELSE 0
                            END
                        ) * -1 AS invoice_subtotal,
                        TransactionShippingAddress.addrText AS shipaddress,
                        TransactionBillingAddress.addrText AS billaddress,
                        Inv.trandate AS invoice_date,
                        Inv.duedate AS invoice_duedate,
                        NVL(Inv.memo, '') AS invoice_memo,
                        BUILTIN.DF(Inv.terms) AS invoice_terms,
                        Inv.otherrefnum AS invoice_otherrefnum,
                        BUILTIN.DF(Inv.employee) AS invoice_salesrep,
                        NVL(Inv.custbody_fc_inv_num_toprint, 1) AS invoice_copiestoprint,
                        Customer.category AS customercategory
                    
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
                    LEFT OUTER JOIN TransactionShipment ON SO.id = TransactionShipment.doc

                    LEFT OUTER JOIN Customer ON Inv.entity = Customer.id

                    WHERE 
                        NULL IS NULL
                        AND InvLine.donotdisplayline = 'F'
                        AND Customer.category != 10
                        @@START_SHIP_DATE@@
                        @@END_SHIP_DATE@@
                        @@CUSTOMERS@@
                        @@ROUTES@@

                    GROUP BY (
                            TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' || SO.entity
                        ),
                        RouteShipment.custrecord_rd_route_shipment_ship_date,
                        RouteShipment.custrecord_rd_route_shipment_route,
                        RouteShipment.custrecord_rd_route_shipment_seq_no,
                        TransactionShipment.shippingMethod,
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
                        BUILTIN.DF(Inv.terms),
                        Inv.otherrefnum,
                        BUILTIN.DF(Inv.employee),
                        NVL(Inv.custbody_fc_inv_num_toprint, 1),
                        Customer.category
                        
                    ORDER BY RouteShipment.custrecord_rd_route_shipment_ship_date,
                        RouteShipment.custrecord_rd_route_shipment_route,
                        RouteShipment.custrecord_rd_route_shipment_seq_no
                `,
                Parameters: {
                    StartShipDate: `AND SO.shipdate >= '@@START_DATE@@'`,
                    EndShipDate: `AND SO.shipdate <= '@@END_DATE@@'`,
                    Customers: `AND SO.entity IN (@@CUSTOMERS@@)`,
                    Routes: `AND RouteShipment.custrecord_rd_route_shipment_route IN (@@ROUTES@@)`,
                },
                BuildQuery: function ({
                    startShipDate = '',
                    endShipDate = '',
                    customersSelect = '',
                    routesSelect = '',
                }) {
                    let sqlQuery = this.Query;
                    if (startShipDate) {
                        startShipDate = this.Parameters.StartShipDate.replace(
                            '@@START_DATE@@',
                            dayjs(startShipDate).format('MM/DD/YYYY')
                        );
                    }
                    if (endShipDate) {
                        endShipDate = this.Parameters.EndShipDate.replace(
                            '@@END_DATE@@',
                            dayjs(endShipDate).format('MM/DD/YYYY')
                        );
                    }
                    if (customersSelect && (customersSelect.length > 0)) {
                        let customerStr = customersSelect.map(c => `'${c}'`).join(',');
                        customersSelect = this.Parameters.Customers.replace('@@CUSTOMERS@@', customerStr);
                    }
                    if (routesSelect && (routesSelect.length > 0)) {
                        let routeStr = routesSelect.map(r => `'${r}'`).join(',');
                        routesSelect = this.Parameters.Routes.replace('@@ROUTES@@', routeStr);
                    }

                    sqlQuery = sqlQuery.replace('@@START_SHIP_DATE@@', startShipDate ? startShipDate : '');
                    sqlQuery = sqlQuery.replace('@@END_SHIP_DATE@@', endShipDate ? endShipDate : '');
                    sqlQuery = sqlQuery.replace('@@CUSTOMERS@@', customersSelect ? customersSelect : '');
                    sqlQuery = sqlQuery.replace('@@ROUTES@@', routesSelect ? routesSelect : '');

                    return sqlQuery;
                },
            },
            QUERY_INVOICE_LINES: {
                Query: `
                    SELECT
                        (TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.custbody_rd_so_route || '_' || SO.entity) AS uniqueshipmentid,
                        Inv.id AS invoice_id,
                        InvLine.itemtype,
                        InvLine.accountinglinetype,
                        InvLine.item AS iteminternalid,
                        BUILTIN.DF(InvLine.item) AS itemname,
                        Item.displayname,
                        (InvLine.quantity * -1) AS quantitydelivered,
                        (SOLine.quantity * -1) AS quantityordered,
                        InvLine.rate,
                        (InvLine.foreignAmount * -1) AS amount,
                        InvLine.memo AS linedescription,
                    
                    FROM 
                        NextTransactionLink AS NTL
                        RIGHT OUTER JOIN Transaction AS SO ON (SO.id = NTL.previousDoc AND SO.type ='SalesOrd')
                        RIGHT OUTER JOIN Transaction AS Inv ON (Inv.id = NTL.nextDoc AND Inv.type='CustInvc')
                        INNER JOIN TransactionLine AS InvLine ON Inv.id = InvLine.transaction
                        LEFT OUTER JOIN PreviousTransactionLineLink AS PTLL ON (InvLine.id = PTLL.nextline AND InvLine.transaction = PTLL.nextdoc)
                        LEFT OUTER JOIN TransactionLine AS SOLine ON (SOLine.transaction = PTLL.previousDoc AND SOLine.id = PTLL.previousLine)
                        LEFT OUTER JOIN Item ON InvLine.item = Item.id
                    
                    WHERE 
                        InvLine.mainline = 'F'
                        AND InvLine.itemType != 'Discount'
                        AND InvLine.itemType != 'ShipItem'
                        AND InvLine.donotdisplayline = 'F'
                        @@START_SHIP_DATE@@ 
                        @@END_SHIP_DATE@@
                        @@CUSTOMERS@@
                        @@ROUTES@@
                `,
                Parameters: {
                    StartShipDate: `AND SO.shipdate >= '@@START_DATE@@'`,
                    EndShipDate: `AND SO.shipdate <= '@@END_DATE@@'`,
                    Customers: `AND SO.entity IN (@@CUSTOMERS@@)`,
                    Routes: `AND SO.custbody_rd_so_route IN (@@ROUTES@@)`,
                },
                BuildQuery: function ({
                    startShipDate = '',
                    endShipDate = '',
                    customersSelect = '',
                    routesSelect = '',
                }) {
                    let sqlQuery = this.Query;
                    if (startShipDate) {
                        startShipDate = this.Parameters.StartShipDate.replace('@@START_DATE@@', startShipDate);
                    }
                    if (endShipDate) {
                        endShipDate = this.Parameters.EndShipDate.replace('@@END_DATE@@', endShipDate);
                    }
                    if (customersSelect && (customersSelect.length > 0)) {
                        let customerStr = customersSelect.map(c => `'${c}'`).join(',');
                        customersSelect = this.Parameters.Customers.replace('@@CUSTOMERS@@', customerStr);
                    }
                    if (routesSelect && (routesSelect.length > 0)) {
                        let routeStr = routesSelect.map(r => `'${r}'`).join(',');
                        routesSelect = this.Parameters.Routes.replace('@@ROUTES@@', routeStr);
                    }

                    sqlQuery = sqlQuery.replace('@@START_SHIP_DATE@@', startShipDate ? startShipDate : '');
                    sqlQuery = sqlQuery.replace('@@END_SHIP_DATE@@', endShipDate ? endShipDate : '');
                    sqlQuery = sqlQuery.replace('@@CUSTOMERS@@', customersSelect ? customersSelect : '');
                    sqlQuery = sqlQuery.replace('@@ROUTES@@', routesSelect ? routesSelect : '');

                    return sqlQuery;
                },
            },
            QUERY_TICKET_LINES: {
                Query: `
                    SELECT
                        (TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.custbody_rd_so_route || '_' || SO.entity) AS uniqueshipmentid,
                        BUILTIN.DF(InvLine.item) AS itemname,
                        Item.displayname,
                        InvLine.memo AS linedescription,
                        (TO_CHAR(SO.shipdate,'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END ||  '_' || Item.itemid) AS sort1,
                        (TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END) AS ticketsection,
                        (CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END) AS frozen,
                        LEAD((TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END) , 1) 
                            OVER (ORDER BY (TO_CHAR(SO.shipdate,'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END ||  '_' || Item.itemid)) 
                            AS next_ticketsection,
                        LISTAGG(Inv.tranid, ',') WITHIN GROUP (ORDER BY Inv.tranid) AS invoice_nums,
                        SUM(InvLine.quantity) * -1 AS quantitydelivered,
                        SUM(NVL(InvLine.custcol_fc_reported_short, 0)) AS invoice_reportedshort

                    FROM 
                        NextTransactionLink AS NTL
                        RIGHT OUTER JOIN Transaction AS SO ON (SO.id = NTL.previousDoc AND SO.type ='SalesOrd')
                        RIGHT OUTER JOIN Transaction AS Inv ON (Inv.id = NTL.nextDoc AND Inv.type='CustInvc')
                        INNER JOIN TransactionLine AS InvLine ON Inv.id = InvLine.transaction
                        LEFT OUTER JOIN PreviousTransactionLineLink AS PTLL ON (InvLine.id = PTLL.nextline AND InvLine.transaction = PTLL.nextdoc)
                        LEFT OUTER JOIN TransactionLine AS SOLine ON (SOLine.transaction = PTLL.previousDoc AND SOLine.id = PTLL.previousLine)
                        LEFT OUTER JOIN Item ON InvLine.item = Item.id
                    
                    WHERE 
                        InvLine.mainline = 'F'
                        AND InvLine.itemType != 'Discount'
                        AND InvLine.itemType != 'ShipItem'
                        AND InvLine.donotdisplayline = 'F'
                        @@START_SHIP_DATE@@
                        @@END_SHIP_DATE@@
                        @@CUSTOMERS@@
                        @@ROUTES@@

                    GROUP BY 
                        (TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.custbody_rd_so_route || '_' || SO.entity),
                        BUILTIN.DF(InvLine.item),
                        Item.displayname,
                        InvLine.memo,
                        (TO_CHAR(SO.shipdate,'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END ||  '_' || Item.itemid),
                        (TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END),
                        (CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END)

                    ORDER BY
                        (TO_CHAR(SO.shipdate,'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END ||  '_' || Item.itemid)
                `,
                Parameters: {
                    StartShipDate: `AND SO.shipdate >= '@@START_DATE@@'`,
                    EndShipDate: `AND SO.shipdate <= '@@END_DATE@@'`,
                    Customers: `AND SO.entity IN (@@CUSTOMERS@@)`,
                    Routes: `AND SO.custbody_rd_so_route IN (@@ROUTES@@)`,
                },
                BuildQuery: function ({
                    startShipDate = '',
                    endShipDate = '',
                    customersSelect = '',
                    routesSelect = '',
                }) {
                    let sqlQuery = this.Query;
                    if (startShipDate) {
                        startShipDate = this.Parameters.StartShipDate.replace('@@START_DATE@@', startShipDate);
                    }
                    if (endShipDate) {
                        endShipDate = this.Parameters.EndShipDate.replace('@@END_DATE@@', endShipDate);
                    }
                    if (customersSelect && (customersSelect.length > 0)) {
                        let customerStr = customersSelect.map(c => `'${c}'`).join(',');
                        customersSelect = this.Parameters.Customers.replace('@@CUSTOMERS@@', customerStr);
                    }
                    if (routesSelect && (routesSelect.length > 0)) {
                        let routeStr = routesSelect.map(r => `'${r}'`).join(',');
                        routesSelect = this.Parameters.Routes.replace('@@ROUTES@@', routeStr);
                    }

                    sqlQuery = sqlQuery.replace('@@START_SHIP_DATE@@', startShipDate ? startShipDate : '');
                    sqlQuery = sqlQuery.replace('@@END_SHIP_DATE@@', endShipDate ? endShipDate : '');
                    sqlQuery = sqlQuery.replace('@@CUSTOMERS@@', customersSelect ? customersSelect : '');
                    sqlQuery = sqlQuery.replace('@@ROUTES@@', routesSelect ? routesSelect : '');

                    return sqlQuery;
                },
            }

        },
        Scripts: {
            THISAPP_MAIN_SUITELET: {
                ScriptId: 'customscript_fc_am_gen_deliv_packets1',
                DeployId: 'customdeploy_fc_am_gen_deliv_packets1'
            },
            GENERATOR_SUITELET: {
                ScriptId: 'customscript_fc_am_deliverypacketgen1',
                DeployId: 'customdeploy_fc_am_deliverypacketgen1',
            },

        },
        SuiteletParams: {
            SUBMITTED: 'custpage_submitted',
            START_SHIP_DATE: 'custpage_start_date',
            END_SHIP_DATE: 'custpage_end_date',
            CUSTOMER_SELECT: 'custpage_customer_select',
            ROUTE_SELECT: 'custpage_route_select',
        }
    };


    return exports;

}