var fcLibModulePath = '../Libraries/fc-main.library.module';

var FCLib;


define([
    fcLibModulePath
], main);

function main(
    fcLibModule
) {
    FCLib = fcLibModule;

    var exports = {
        Queries: {
            QUERY_SHIPMENTS: {
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
            QUERY_SHIPMENT_LINES: {
                Query: `
                    SELECT
                        (TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.custbody_rd_so_route || '_' || SO.entity) AS uniqueshipmentid,
                        SO.id AS so_id,
                        SO.tranid AS so_tranid,
                        BUILTIN.DF(SO.entity) AS customer,
                        BUILTIN.DF(SO.custbody_rd_so_route) AS routename,
                        SO.shipdate,
                        TransactionShipment.shippingMethod,
                        Inv.tranid,
                        Inv.trandate,
                        Inv.duedate,
                        Inv.memo,
                        Inv.terms,
                        Inv.otherrefnum,
                        BUILTIN.DF(Inv.employee) AS salesrep,
                        TransactionShippingAddress.addrText AS shipaddress,
                        TransactionBillingAddress.addrText AS billingaddress,
                        InvLine.itemtype,
                        InvLIne.accountinglinetype,
                        InvLine.item AS iteminternalid,
                        BUILTIN.DF(InvLine.item) AS itemname,
                        Item.displayname,
                        (InvLine.quantity * -1) AS quantitydelivered,
                        (SOLine.quantity * -1) AS quantityordered,
                        InvLine.rate,
                        InvLine.netamount,
                        InvLine.memo AS linedescription,
                        (TO_CHAR(SO.shipdate,'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END ||  '_' || Item.itemid) AS sort1,
                        (TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END) AS ticketsection,
                        (CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END) AS frozen,
                        LEAD((TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END) , 1) 
                            OVER (ORDER BY (TO_CHAR(SO.shipdate,'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END ||  '_' || Item.itemid)) 
                            AS next_ticketsection	
                    
                    FROM 
                        NextTransactionLink AS NTL
                        RIGHT OUTER JOIN Transaction AS SO ON (SO.id = NTL.previousDoc AND SO.type ='SalesOrd')
                        RIGHT OUTER JOIN Transaction AS Inv ON (Inv.id = NTL.nextDoc AND Inv.type='CustInvc')
                        INNER JOIN TransactionLine AS InvLine ON Inv.id = InvLine.transaction
                        LEFT OUTER JOIN PreviousTransactionLineLink AS PTLL ON (InvLine.id = PTLL.nextline AND InvLine.transaction = PTLL.nextdoc)
                        LEFT OUTER JOIN TransactionLine AS SOLine ON (SOLine.transaction = PTLL.previousDoc AND SOLine.id = PTLL.previousLine)
                        LEFT OUTER JOIN TransactionBillingAddress ON Inv.billingaddress = TransactionBillingAddress.nkey
                        LEFT OUTER JOIN TransactionShippingAddress ON Inv.shippingaddress = TransactionShippingAddress.nkey
                        LEFT OUTER JOIN TransactionShipment ON SO.id = TransactionShipment.doc
                        LEFT OUTER JOIN Item ON InvLine.item = Item.id
                    
                    WHERE 
                        InvLine.mainline = 'F'
                        AND InvLine.itemType = 'InvtPart'
                        @@START_SHIP_DATE@@ 
                        @@END_SHIP_DATE@@

                    ORDER BY
                        (TO_CHAR(SO.shipdate,'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END ||  '_' || Item.itemid)


                    
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

        },
    };


    return exports;

}