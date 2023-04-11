var query,
    record,
    dayjs,
    FCLib;

define([
    'N/query',
    'N/record',
    '../Libraries/dayjs.min.js',
    '../Libraries/fc-main.library.module.js'
], main);

function main(queryModule, recordModule, dayjsModule, fcLibModule) {
    query = queryModule;
    record = recordModule;
    dayjs = dayjsModule;
    FCLib = fcLibModule;

    var exports = {
        Queries: {
            GET_ONHAND_LOTNUMS: {
                Query: `
                    SELECT
                        InventoryNumber.item AS iteminternalid,
                        BUILTIN.DF( InventoryNumber.Item ) AS itemid,
                        InventoryNumber.InventoryNumber AS lotnum,
                        InventoryNumber.id AS invnumberinternalid,
                        INL.QuantityOnHand AS quantityonhand,
                        TO_DATE( InventoryNumber.ExpirationDate) AS expirationdate,
                        TO_DATE( InventoryNumber.ExpirationDate ) - TO_DATE( '@@SO_SHIP_DATE@@' ) AS expirationdays
                    FROM
                        InventoryNumber
                        INNER JOIN InventoryNumberLocation AS INL ON
                            ( INL.InventoryNumber = InventoryNumber.ID )
                    WHERE
                        InventoryNumber.item IN (@@ITEM_FILTER@@)
                    `,
                BuildQuery: function (soShipDate, itemIds) {
                    let itemIdStr = itemIds.map((itemId) => { return `'${itemId}'`; }).join(',');
                    return this.Query.
                        replace('@@SO_SHIP_DATE@@', dayjs(soShipDate).format('M/D/YYYY')).
                        replace('@@ITEM_FILTER@@', itemIdStr);
                },
                FieldSet1: {
                    ItemInternalId: {
                        Name: 'iteminternalid',
                        Label: 'Item Internal ID',
                    },
                    ItemId: {
                        Name: 'itemid',
                        Label: 'Item ID',
                    },
                    LotNum: {
                        Name: 'lotnum',
                        Label: 'Lot Number',
                    },
                    InvNumberInternalId: {
                        Name: 'invnumberinternalid',
                        Label: 'Inventory Number Internal ID',
                    },
                    QuantityOnHand: {
                        Name: 'quantityonhand',
                        Label: 'Quantity On Hand',
                    },
                    ExpirationDate: {
                        Name: 'expirationdate',
                        Label: 'Expiration Date',
                    },
                    ExpirationDays: {
                        Name: 'expirationdays',
                        Label: 'Expiration Days',
                    },
                },
            },

            GET_INBOUND_PO_LOTNUMS: {
                Query: `
                    SELECT
                        TransactionLine.item AS iteminternalid,
                        BUILTIN.DF(TransactionLine.item) AS itemname,
                        TransactionLine.transaction AS traninternalid,
                        InventoryAssignment.quantity AS lotquantity,
                        Transaction.type AS trantype,
                        Transaction.tranid AS tranid,
                        Transaction.duedate AS tranduedate,
                        BUILTIN.CF(Transaction.status) AS transtatus,
                        BUILTIN.DF(InventoryAssignment.inventoryNumber) AS lotnum,
                        InventoryAssignment.inventoryNumber as invnumberinternalid
                    FROM
                        TransactionLine
                    JOIN
                        InventoryAssignment ON (
                            TransactionLine.id = InventoryAssignment.transactionLine
                            AND TransactionLine.transaction = inventoryAssignment.Transaction	
                        )
                    JOIN 
                        Transaction ON TransactionLine.transaction = Transaction.id
                    
                    WHERE
                        Transaction.type = 'PurchOrd'
                        AND BUILTIN.CF(Transaction.status) = 'PurchOrd:B'
                        AND TransactionLine.item IN (@@ITEM_FILTER@@)
                        AND Transaction.duedate <= '@@PO_DUEDATE_FILTER@@'
                    `,
                BuildQuery: function (soShipDate, itemIds) {
                    let dueDateStr = dayjs(soShipDate).format('M/D/YYYY');
                    let itemIdStr = itemIds.map((itemId) => { return `'${itemId}'`; }).join(',');
                    return this.Query
                        .replace('@@ITEM_FILTER@@', itemIdStr)
                        .replace('@@PO_DUEDATE_FILTER@@', dueDateStr)
                },
                FieldSet1: {
                    ItemInternalId: {
                        Name: 'iteminternalid',
                        Label: 'Item Internal ID',
                    },
                    ItemName: {
                        Name: 'itemname',
                        Label: 'Item Name',
                    },
                    TranInternalId: {
                        Name: 'traninternalid',
                        Label: 'Transaction Internal ID',
                    },
                    LotQuantity: {
                        Name: 'lotquantity',
                        Label: 'Lot Quantity',
                    },
                    TranType: {
                        Name: 'trantype',
                        Label: 'Transaction Type',
                    },
                    TranId: {
                        Name: 'tranid',
                        Label: 'Transaction ID',
                    },
                    TranDueDate: {
                        Name: 'tranduedate',
                        Label: 'Transaction Due Date',
                    },
                    TranStatus: {
                        Name: 'transtatus',
                        Label: 'Transaction Status',
                    },
                    LotNum: {
                        Name: 'lotnum',
                        Label: 'Lot Number',
                    },
                    InvNumberInternalId: {
                        Name: 'invnumberinternalid',
                        Label: 'Inventory Number Internal ID',
                    },
                },
            },
        },


    };



    var Settings = {

    };
    exports.Settings = Settings;


    function doAssignSOLotNumbers(soRec) {
        let dynamic = soRec.isDynamic;

        // For all items on SO
        //   If item is not lot tracked, skip
        //   Try to assign lot number to item, in FEFO order of priority:
        //      UNIVERSAL CRITERIA:
        //          - Expiration date > 1 week from SO ship date
        //          - 
        //      1. Lot # earliest expiration date of qty on hand
        //      1b.   If no expiration dates to choose from, use earliest created date of qty on hand
        //      2. Lot # earliest created date of lots on inbound POs with arrival dates < SO ship date

        // Run both lot number queries to gather:
        //    1. Lots of on-hand inventory
        //    2. Lots from inbound POs with arrival dates <= SO ship date   // FIX??

        let soShipDate = soRec.getValue({
            fieldId: 'shipdate'
        });

        let soItemIds = getTranLineItemIds(soRec);

        let sqlOnHandLots = exports.Queries.GET_ONHAND_LOTNUMS.BuildQuery(
            soShipDate,
            soItemIds
        );

        // let sqlInboundLots = ThisAppLib.Queries.GET_INBOUND_PO_LOTNUMS.BuildQuery(
        //     soShipDate,
        //     soItemIds
        // );

        let onHandLotData = FCLib.sqlSelectAllRowsIntoNestedDict(
            sqlOnHandLots,
            [exports.Queries.GET_ONHAND_LOTNUMS.FieldSet1.ItemInternalId.Name],
        );

        // let inboundLotData = FCLib.sqlSelectAllRowsIntoNestedDict(
        //     sqlInboundLots,
        //     [ThisAppLib.Queries.GET_INBOUND_PO_LOTNUMS.FieldSet1.ItemInternalId.Name],
        // );


        if ((!onHandLotData) && (!inboundLotData) && (onHandLotData.length == 0) && (inboundLotData.length == 0)) {
            return;
        }

        // Loop through each item on SO and try to assign lot number
        let itemLineCount = soRec.getLineCount({
            sublistId: 'item'
        });

        for (let i = 0; i < itemLineCount; i++) {
            if (dynamic) {
                soRec.selectLine({
                    sublistId: 'item',
                    line: i 
                });
            }

            let itemId;
            if (dynamic) {
                itemId = soRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                });
            }
            else {
                itemId = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
            }

            // Check whether item is lot tracked. Skip if it is not.
            let itemIsLotTracked = search.lookupFields({
                type: search.Type.ITEM,
                id: itemId,
                columns: ['islotitem']
            });

            if (FCLib.looksLikeNo(itemIsLotTracked.islotitem)) {
                continue;
            }

            // Check whether item has any quantity not already assigned to a lot number
            let lineQty;
            if (dynamic) {
                lineQty = soRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                });
            }
            else {
                lineQty = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                });
            }
            lineQty = parseFloat(lineQty);


            let invDetailSubrec;
            if (dynamic) {
                invDetailSubrec = soRec.getCurrentSublistSubrecord({
                    sublistId: 'item',
                    fieldId: 'inventorydetail'
                });
            }
            else {
                invDetailSubrec = soRec.getSublistSubrecord({
                    sublistId: 'item',
                    line: i,
                    fieldId: 'inventorydetail'
                });
            }

            let invDetailLineCt = 0;

            if ((invDetailSubrec !== null) && (invDetailSubrec !== undefined) && (invDetailSubrec !== '')) {
                invDetailLineCt = invDetailSubrec.getLineCount({
                    sublistId: 'inventoryassignment'
                });
            }


            let lineLotAssignedQty = 0;
            if (invDetailLineCt > 0) {
                for (let j = 0; j < invDetailLineCt; j++) {
                    if (dynamic) {
                        invDetailSubrec.selectLine({
                            sublistId: 'inventoryassignment',
                            line: j 
                        });
                    }

                    let invDetailLotNum;
                    if (dynamic) {
                        invDetailLotNum = invDetailSubrec.getCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'inventorynumber',
                        });
                    }
                    else {
                        invDetailLotNum = invDetailSubrec.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'inventorynumber',
                            line: j
                        });
                    }


                    if (invDetailLotNum) {
                        let thisLotQty;
                        if (dynamic) {
                            thisLotQty = invDetailSubrec.getCurrentSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'quantity',
                            });
                        }
                        else {
                            thisLotQty = invDetailSubrec.getSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'quantity',
                                line: j
                            });
                        }
                        lineLotAssignedQty += parseFloat(thisLotQty);
                    }
                }
            }

            let quantityLeftToAssign = lineQty - lineLotAssignedQty;

            if (quantityLeftToAssign <= 0) {
                continue;
            }


            let currentInvAssnLineNum = invDetailLineCt;

            // It looks like we still have quantity on this line that needs to be assigned to a lot number.
            // Try to assign on-hand inventory first
            let onHandLots = onHandLotData[itemId];

            if (onHandLots && onHandLots.length > 0) {
                onHandLots = FCLib.sortArrayOfObjsByKeys(
                    onHandLots,
                    [
                        exports.Queries.GET_ONHAND_LOTNUMS.FieldSet1.ExpirationDate.Name,
                        exports.Queries.GET_ONHAND_LOTNUMS.FieldSet1.InvNumberInternalId.Name,
                    ]
                );

                for (let j = 0; j < onHandLots.length; j++) {
                    if (quantityLeftToAssign <= 0) {
                        break;
                    }

                    if (dynamic) {
                        invDetailSubrec.selectNewLine({
                            sublistId: 'inventoryassignment'
                        });
                    }

                    // let lotNum = onHandLots[j][ThisAppLib.Queries.GET_ONHAND_LOTNUMS.FieldSet1.LotNum.Name];
                    let lotId = onHandLots[j][exports.Queries.GET_ONHAND_LOTNUMS.FieldSet1.InvNumberInternalId.Name];
                    let lotQtyOnHand = onHandLots[j][exports.Queries.GET_ONHAND_LOTNUMS.FieldSet1.QuantityOnHand.Name];

                    let lotQtyToAssign = Math.min(quantityLeftToAssign, lotQtyOnHand);

                    // Assign lot number to SO line
                    if (dynamic) {
                        invDetailSubrec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber',
                            value: lotId
                        });

                        invDetailSubrec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: lotQtyToAssign
                        });

                        // TEMP
                        invDetailSubrec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'inventorystatus',
                            value: 1
                        });

                        // Commit the line
                        invDetailSubrec.commitLine({
                            sublistId: 'inventoryassignment'
                        });
                    }
                    else {
                        invDetailSubrec.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber',
                            line: currentInvAssnLineNum,
                            value: lotId
                        });

                        invDetailSubrec.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            line: currentInvAssnLineNum,
                            value: lotQtyToAssign
                        });

                        // TEMP
                        invDetailSubrec.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'inventorystatus',
                            line: currentInvAssnLineNum,
                            value: 1
                        });
                    }

                    quantityLeftToAssign -= lotQtyToAssign;
                    currentInvAssnLineNum++;
                }
            }

            if (dynamic) {
                soRec.commitLine({
                    sublistId: 'item'
                });
            }
            // // If we still have quantity left to assign, try to assign inbound POs
            // if (quantityLeftToAssign <=0) { continue; }

            // let inboundLots = inboundLotData[itemId];

            // if (inboundLots && inboundLots.length > 0) {
            //     inboundLots = FCLib.sortArrayOfObjsByKeys(
            //         inboundLots,
            //         [
            //             ThisAppLib.Queries.GET_INBOUND_PO_LOTNUMS.FieldSet1.TranDueDate.Name,
            //         ]
            //     );

            //     for (let j = 0; j < inboundLots.length; j++) {
            //         if (quantityLeftToAssign <= 0) {
            //             break;
            //         }

            //         // let lotNum = inboundLots[j][ThisAppLib.Queries.GET_ONHAND_LOTNUMS.FieldSet1.LotNum.Name];
            //         let lotId = inboundLots[j][ThisAppLib.Queries.GET_INBOUND_PO_LOTNUMS.FieldSet1.InvNumberInternalId.Name];
            //         let lotQty = inboundLots[j][ThisAppLib.Queries.GET_INBOUND_PO_LOTNUMS.FieldSet1.LotQuantity.Name];

            //         let lotQtyToAssign = Math.min(quantityLeftToAssign, lotQty);

            //         // Assign lot number to SO line
            //         invDetailSubrec.setSublistValue({
            //             sublistId: 'inventoryassignment',
            //             fieldId: 'issueinventorynumber',
            //             line: currentInvAssnLineNum,
            //             value: lotId
            //         });

            //         invDetailSubrec.setSublistValue({
            //             sublistId: 'inventoryassignment',
            //             fieldId: 'quantity',
            //             line: currentInvAssnLineNum,
            //             value: lotQtyToAssign
            //         });

            //         quantityLeftToAssign -= lotQtyToAssign;
            //         currentInvAssnLineNum++;
            //     }
            // }
        }

    }
    exports.doAssignSOLotNumbers = doAssignSOLotNumbers;


    function getTranLineItemIds(tranRec) {
        let lineCount = tranRec.getLineCount({
            sublistId: 'item'
        });

        let itemIds = [];

        for (let i = 0; i < lineCount; i++) {
            let itemId;
            if (tranRec.isDynamic) {
                tranRec.selectLine({
                    sublistId: 'item',
                    line: i
                });

                itemId = tranRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });
            }
            else {
                itemId = tranRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
            }

            itemIds.push(itemId);
        }

        return itemIds;
    }
    exports.getTranLineItemIds = getTranLineItemIds;

    return exports;
}

