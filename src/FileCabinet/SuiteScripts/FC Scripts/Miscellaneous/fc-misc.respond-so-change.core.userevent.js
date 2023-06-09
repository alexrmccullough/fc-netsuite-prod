/**
 * Module Description...
 *
 * @file fc-misc.respond-so-change.userevent.js
 * @copyright 2023 Food Connects
 * @author Alex McCullough alex.mccullough@gmail.com
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType UserEventScript
 */

var record,
    search,
    FCLib,
    dayjs,
    FCLotMgmtLib;

define([
    'N/record',
    'N/search',
    '../Libraries/fc-main.library.module',
    '../Libraries/dayjs.min',
    './fc-misc.general-lot-mgmt.library.module'
], main);



function main(recordModule, searchModule, fcMainLib, dayjsModule,  fcLotMgmtLibModule) {
    record = recordModule;
    search = searchModule;
    FCLib = fcMainLib;
    dayjs = dayjsModule;
    FCLotMgmtLib = fcLotMgmtLibModule;

    // Sales Order:Pending Approval	SalesOrd:A
    // Sales Order:Pending Fulfillment	SalesOrd:B
    // Sales Order:Cancelled	SalesOrd:C
    // Sales Order:Partially Fulfilled	SalesOrd:D
    // Sales Order:Pending Billing/Partially Fulfilled	SalesOrd:E
    // Sales Order:Pending Billing	SalesOrd:F
    // Sales Order:Billed	SalesOrd:G
    // Sales Order:Closed	SalesOrd:H

    function beforeSubmit(context) {
        // const oldRecStatus = context.oldRecord.getValue({
        //     fieldId: 'status'w
        // });


        // Other action types we need to handle
        //     APPROVE --- do this instead of CREATE?
        //     CANCEL  -- can cancel confirmed/committed orders
        //     COPY   -- do we need to do anything? or will create catch this? 
        //     XEDIT 
        //     REJECT??
        // 

        log.debug({ title: 'context.type', details: context.type });

        let contexttype = context.type;         // Debugging

        if ((context.type == context.UserEventType.CREATE) ||
            (context.type == context.UserEventType.APPROVE)) {
            // FCLotMgmtLib.doAssignSOLotNumbers(context.newRecord);
        }

        // }

        // if ((context.type == context.UserEventType.CREATE) ||
        //     (context.type == context.UserEventType.EDIT) ||
        //     (context.type == context.UserEventType.XEDIT) ||
        //     (context.type == context.UserEventType.APPROVE) ||
        //     (context.type == context.UserEventType.DELETE) ||
        //     (context.type == context.UserEventType.CANCEL)) {

        //     let type = context.type;
        //     doUpdateJitAvailabilities(
        //         context.oldRecord,
        //         context.newRecord,
        //     );
        // }


        return true;
    }

    function afterSubmit(context) {

        if ((context.type == context.UserEventType.CREATE) ||
            (context.type == context.UserEventType.EDIT) ||
            (context.type == context.UserEventType.XEDIT) ||
            (context.type == context.UserEventType.APPROVE) ||
            (context.type == context.UserEventType.DELETE) ||
            (context.type == context.UserEventType.CANCEL)) {

            let type = context.type;
            doUpdateJitAvailabilities(
                context,
                context.oldRecord,
                context.newRecord,
            );
        }

    }

    return {
        // beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };

}


function doUpdateJitAvailabilities(context, oldRecord = null, newRecord = null) {
    let jitSOItemInfo = {};

    let oldRecStatus = null;
    let newRecStatus = null;

    // Compare the approval status before/after
    //     - If the status has changed from Pending Approval to Pending Fulfillment,
    //     then we need to CONSUME JIT.
    //     - If the status has changed from Pending Fulfillment to Pending Approval,
    //     then we need to RELEASE JIT.
    // Statuses of interest:
    //      Sales Order:Pending Approval	SalesOrd:A
    //      Sales Order:Pending Fulfillment	SalesOrd:B
    let oldApprovalStatus = oldRecord ? oldRecord.getValue({ fieldId: 'status' }) : null;
    let newApprovalStatus = newRecord ? newRecord.getValue({ fieldId: 'status' }) : null;

    if ((oldApprovalStatus == 'A') && (newApprovalStatus == 'B')) {
        oldRecord = null;
    }
    else if (
        (context.type == context.UserEventType.DELETE) ||
        (context.type == context.UserEventType.CANCEL) ||
        (oldApprovalStatus == 'B') && (newApprovalStatus == 'A')
    ) {
        newRecord = null;
    }


    let oldLineCount = oldRecord ? oldRecord.getLineCount({ sublistId: 'item' }) : 0;
    let newLineCount = newRecord ? newRecord.getLineCount({ sublistId: 'item' }) : 0;

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
        // 'quantityavailable': 0,
        'backordered': 0,
        // 'quantitybilled': 0,
        // 'quantitycommitted': 0,
        // 'quantityfulfilled': 0,
        // 'quantityrevcommitted': 0,
        'itemtype': '',
        'custcol3': '',
    };

    let allItemIds = new Set();


    for (let i in itemBeforeAfter) {
        let rec = itemBeforeAfter[i].rec;
        let lineCt = itemBeforeAfter[i].lineCt;
        let items = itemBeforeAfter[i].items;

        if ((!rec) || (!lineCt)) {
            continue;
        }

        let sublistFields = rec.getSublistFields({
            sublistId: 'item'
        });

        log.debug({ title: 'sublistFields', details: sublistFields });


        for (let j = 0; j < lineCt; j++) {
            let curItemId = rec.getSublistValue({
                sublistId: 'item',
                fieldId: 'item', line: j
            });

            let curItemIsJit = search.lookupFields({
                type: search.Type.ITEM,
                id: curItemId,
                columns: 'custitem_soft_comit'
            }).custitem_soft_comit;


            if (FCLib.looksLikeNo(curItemIsJit)) {
                continue;
            }

            allItemIds.add(curItemId);
            // var thisItem = {};
            if (!items.hasOwnProperty(curItemId)) {
                items[curItemId] = FCLib.simpleObjCopy(itemSublistFieldsToGet);
            }

            for (let k in itemSublistFieldsToGet) {
                let val = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: k, line: j
                });
                if (val) {
                    items[curItemId][k] += val;
                }
            }
        }
    }

    // If allItemIds is empty, then we've found no JIT items, so return
    if (allItemIds.size == 0) {
        return;
    }


    let jitItemInfo = runJitItemQuery(allItemIds);

    // Update every JIT item record\
    var changes = [];

    for (let [jitItemId, jitItem] of Object.entries(jitItemInfo)) {
        let itemBefore = itemBeforeAfter.befores.items[jitItemId];
        let itemAfter = itemBeforeAfter.afters.items[jitItemId];

        let qtyBefore = 0;
        let qtyAfter = 0;

        if (itemBefore) {
            qtyBefore = itemBefore.quantity;
            // qtyBefore = itemBefore.quantitybackordered;
        }
        if (itemAfter) {
            qtyAfter = itemAfter.quantity;
            // qtyAfter = itemAfter.quantitybackordered;
        }

        let soJitDiff = qtyAfter - qtyBefore;

        // We should limit our JIT adjustments to backordered quantities only.
        // FIX: What is the logic required here?
        if (soJitDiff) {
            let backorderQty = jitItem.totalbackordered == null ? 0 : jitItem.totalbackordered;
            let availableQty = jitItem.totalavailable ? jitItem.totalavailable : 0;

            let endingBackorderedQty = backorderQty + soJitDiff;

            let qtyFulfillableFromStockBefore = Math.min(backorderQty, availableQty);
            let qtyFulfillableFromStockAfter = Math.min(endingBackorderedQty, availableQty);

            let qtyFulfillableDiffBeforeAfter = qtyFulfillableFromStockAfter - qtyFulfillableFromStockBefore;

            let jitAdjustment = soJitDiff - qtyFulfillableDiffBeforeAfter;
            let endingJitRemaining = jitItem.remainjitqty - jitAdjustment;


            if (jitAdjustment !== 0) {
                // FIX: Entry logic for this
                let itemTypeLookupId = jitItem.itemtype + '.' + jitItem.islotitem;
                let convertedType = FCLib.Lookups.ItemTypes[itemTypeLookupId];

                let changedRecordId = record.submitFields({
                    type: convertedType,
                    id: jitItemId,
                    values: {
                        // FIX
                        'custitem_fc_am_jit_remaining': endingJitRemaining
                    }
                });

                changes.push({
                    itemid: jitItemId,
                    itemname: jitItem.itemname,
                    qtyBefore: qtyBefore,
                    qtyAfter: endingJitRemaining,
                });

            }
        }
    }

    log.audit({ title: 'changes', details: changes });

}

function runJitItemQuery(itemIds) {
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
                LocationTotals.totalBackordered AS totalbackordered,
                LocationTotals.totalAvailable AS totalavailable
            FROM
                Item
            JOIN
                (
                    SELECT
                        aggregateItemLocation.item AS item,
                        SUM( aggregateItemLocation.quantityBackOrdered ) AS totalBackordered,
                        SUM( aggregateItemLocation.quantityAvailable ) AS totalAvailable
                    FROM
                        aggregateItemLocation
                    WHERE 
                        aggregateItemLocation.item IN (${itemIdFilter})
                    GROUP BY
                        aggregateItemLocation.item
                ) AS LocationTotals ON item.id = LocationTotals.item		

            WHERE
                Item.custitem_soft_comit = 'T' 
                AND Item.id IN (${itemIdFilter})
        `;

    var queryParams = new Array();
    let rows = FCLib.sqlSelectAllRows(sqlItemJITInfo, queryParams);
    let jitItems = {};

    // Convert query result rows to dictionary: item id > values
    for (let row of rows) {
        // if (row.isjit === 'T') {
        jitItems[row.internalid] = row;
        // }
    }

    return jitItems;


}