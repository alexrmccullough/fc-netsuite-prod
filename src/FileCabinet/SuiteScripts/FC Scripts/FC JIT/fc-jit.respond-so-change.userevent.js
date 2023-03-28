/**
 * Module Description...
 *
 * @file FC_AM_UE_AdjustJITonSO.js
 * @copyright 2023 Food Connects
 * @author Alex McCullough alex.mccullough@gmail.com
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType UserEventScript
 */

var record,
    search,
    runtime,
    fcLib;

define(['N/record', 'N/search', 'N/runtime', '../Libraries/FC_MainLibrary'], main);



function main(recordModule, searchModule, runtimeModule, fcMainLib) {
    record = recordModule;
    search = searchModule;
    runtime = runtimeModule;
    fcLib = fcMainLib;

    // function beforeLoad(context) {
    // }

    // function beforeSubmit(context) {

    // }


    // Sales Order:Pending Approval	SalesOrd:A
    // Sales Order:Pending Fulfillment	SalesOrd:B
    // Sales Order:Cancelled	SalesOrd:C
    // Sales Order:Partially Fulfilled	SalesOrd:D
    // Sales Order:Pending Billing/Partially Fulfilled	SalesOrd:E
    // Sales Order:Pending Billing	SalesOrd:F
    // Sales Order:Billed	SalesOrd:G
    // Sales Order:Closed	SalesOrd:H

    function afterSubmit(context) {
        var jitSOItemInfo = {};
        // const oldRecStatus = context.oldRecord.getValue({
        //     fieldId: 'status'
        // });
        const oldRecord = context.oldRecord;
        const newRecord = context.newRecord;
        const oldLineCount = oldRecord.getLineCount({ sublistId: 'item' });
        const newLineCount = newRecord.getLineCount({ sublistId: 'item' });

        var itemBeforeAfter = {
            befores: {
                rec: oldRecord,
                lineCt: oldLineCount,
                items: {}
            },
            afters: {
                rec: newRecord,
                lineCt: newLineCount,
                items: {}
            }
        };
        var itemSublistFieldsToGet = {
            // 'item': '',
            'quantity': 0,
            'quantityavailable': 0,
            'quantitybackordered': 0,
            'quantitybilled': 0,
            'quantitycommitted': 0,
            'quantityfulfilled': 0,
            'quantityrevcommitted': 0,
            'itemtype': ''
        };

        const itemIds = new Set();

        for (let i in itemBeforeAfter) {
            let rec = itemBeforeAfter[i].rec;
            let lineCt = itemBeforeAfter[i].lineCt;
            let items = itemBeforeAfter[i].items;

            for (let j = 0; j < lineCt; j++) {
                let curItemId = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                itemIds.add(curItemId);
                // var thisItem = {};
                if (!items.hasOwnProperty(curItemId)) {
                    items[curItemId] = fcLib.simpleObjCopy(itemSublistFieldsToGet);
                }

                for (let k in itemSublistFieldsToGet) {
                    let val = rec.getSublistValue({ sublistId: 'item', fieldId: k, line: j });
                    if (val) {
                        items[curItemId][k] += val;
                    }
                }
            }
        }

        // Do Query on Item IDs to find: 
        //    JIT status
        //    JIT qty fields
        const itemIdsArr = Array.from(itemIds);

        let itemIdFilter = itemIdsArr.join(',');

        var sqlItemJITInfo = `
            SELECT
                Item.itemId as itemname,
                Item.id AS internalid,
                Item.itemtype AS itemtype,
                Item.isLotItem AS islotitem,
                Item.custitem_soft_comit AS isjit,
                Item.custitem_fc_zen_sft_comm_qty AS standingjitqty,
                Item.custitem_fc_am_jit_start_qty AS startjitqty,
                Item.custitem_fc_am_jit_remaining AS remainjitqty,
                Item.custitem_fc_zen_jit_producers AS jitproducers,		
                LocationTotals.totalBackordered AS totalbackordered
            FROM
                Item
            JOIN
                (
                    SELECT
                        aggregateItemLocation.item AS item,
                        SUM( aggregateItemLocation.quantityBackOrdered ) AS totalBackordered
                    FROM
                        aggregateItemLocation
                    WHERE 
                        aggregateItemLocation.item IN (${itemIdFilter})
                    GROUP BY
                        aggregateItemLocation.item
                ) AS LocationTotals ON item.id = LocationTotals.item		

            WHERE
            Item.custitem_soft_comit = 'T' AND Item.id IN (${itemIdFilter})
        `;

        var queryParams = new Array();
        let rows = fcLib.sqlSelectAllRows( sqlItemJITInfo, queryParams );
        let jitItems = {};

        // Convert query result rows to dictionary: item id > values
        for (let row of rows) {
            // if (row.isjit === 'T') {
            jitItems[row.internalid] = row;
            // }
        }

        // Update every JIT item record
        for (let [jitItemId, jitItem] of Object.entries(jitItems)) {
            let itemBefore = itemBeforeAfter.befores.items[jitItemId];
            let itemAfter = itemBeforeAfter.afters.items[jitItemId];

            let qtyBefore = 0;
            let qtyAfter = 0;

            if (itemBefore) {
                qtyBefore = itemBefore.quantity;
            }
            if (itemAfter) {
                qtyAfter = itemAfter.quantity;
            }

            let diff = qtyAfter - qtyBefore;

            // We should limit our JIT adjustments to backordered quantities only.
            // FIX: What is the logic required here?
            if (diff) {
                let adjustment = 0;
                if (diff > 1) {     // Item qty added; consume JIT qty
                    adjustment = -1 * diff;
                }
                else {              // Item qty reduced; replenish JIT qty
                    // Don't want to over-replenish JIT qty by eating into inventoried items
                    // Need to get the backordered quantity before form is submitted.
                    //     If we can only get AFTER submittal and backordered = 0, we don't know where we started.
                    // Ideally, we want min (backordered quantity reduced , total quantity reduced)

                }


                // let adjustment = -1 * diff;

                // Get the item's current backorder qty
                let backorderQty = jitItem.totalbackordered;
                if (diff < 0 && backorderQty && backorderQty >= 0) {
                    adjustment = - ( Math.max (Math.abs(diff), backorderQty) ) 
                }

                if (adjustment) {
                    // FIX: Entry logic for this
                    let itemTypeLookupId =  jitItem.itemtype + '.' + jitItem.islotitem;
                    let convertedType = fcLib.Lookups.ItemTypes[itemTypeLookupId];

                    let changedRecordId = record.submitFields({
                        type: convertedType,
                        id: jitItemId,
                        values: {
                            // FIX
                            'custitem_fc_am_jit_remaining': -9999
                        }
                    });

                    // DO: Log all changes
                }


            }
        }

        return true;




        // // Test whether the status of this so matches with what we want to act on?
        // if (context.type == context.UserEventType.DELETE
        //     // context.type == context.UserEventType.CANCEL 
        // ) { }


        // if (context.type == context.UserEventType.APPROVE ||
        //     context.type == context.UserEventType.CREATE ||
        //     context.type == context.UserEventType.COPY ||
        //     context.type == context.UserEventType.EDIT ||
        //     context.type == context.UserEventType.XEDIT
        // ) {
        //     // If newRec status > approved...


        // }



        // If newRec.status == pending fulfillment, partially fulfilled, pending billing/partially fulfilled, pending billing, billed, closed
        //      Then do JIT adjustment
        //      Pull out the JIT items that were not already fulfilled before this SO edit?
        //          These are the items for which we'll modify JIT availability. 

        // Loop through JIT items
        //      Calculate difference in qty oldRec vs newRec
        //      Adjust JIT remaining in Item record by difference
        //      Question: Can I record notes about the adjustment (originating SO, timestamp, etc) to be included on Item record audit?





    }



    return {
        afterSubmit: afterSubmit
    };

}
