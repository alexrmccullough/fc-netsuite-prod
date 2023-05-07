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
    runtime;


define(['N/record', 'N/search', 'N/runtime'], main);

function main(recordModule, searchModule, runtimeModule) {
    record = recordModule;
    search = searchModule;
    runtime = runtimeModule;

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




        // Test whether the status of this so matches with what we want to act on?
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

function buildTransLineBeforeAfter(context) {
    const fields = ['item', 'quantity', 'rate'];

    const oldRecord = context.oldRecord;
    const newRecord = context.newRecord;
    const oldLineCount = oldRecord.getLineCount({ sublistId: 'item' });
    const newLineCount = newRecord.getLineCount({ sublistId: 'item' });

    var transLineBeforeAfter = {};

    for (let i = 0; i < newLineCount; i++) {
        var lineChanged = fields.some(field => {
            const oldValue = oldRecord.getSublistValue({ sublistId: 'item', fieldId: field, line: i });
            const newValue = newRecord.getSublistValue({ sublistId: 'item', fieldId: field, line: i });

            // var beforeEntry = {
                // oldRecord.getSublistValue({ sublistId: 'item', fieldId: field, line: i });
            // };

        });

    }
}





// function getSOData( context ) {

// 	var sql = `
//         SELECT
//             Item.itemid AS itemexternalid,
//             Item.id AS iteminternalid,
//             Item.itemtype,
//             Item.isLotItem AS islotitem,
//             Item.displayname AS itemdisplayname,
//             Item.custitem_fc_brand AS brandid,
//             Item.custitem_fc_sc_imageprefix as itemimageprefix,
//             Item.custitem_fc_usedefaultbrandscimages as itemusedefaultbrandimages,
//             Brand.name AS brandname,
//             Brand.custrecord_fc_sc_defaultbrandimageprefix AS brandscimageprefix,
//             ImageFiles.hasscimages
//         FROM
//             Item
//         LEFT OUTER JOIN
//             (
//                 SELECT DISTINCT
//                     REGEXP_REPLACE(File.name, '_[^_]+\.[a-zA-Z0-9]+$', '') as itemid,
//                     1 AS HasSCImages
//                 FROM
//                     File
//                 WHERE
//                     (File.folder = '4458' AND File.fileType LIKE '%IMAGE%')
//             ) AS ImageFiles
//             ON Item.itemid = ImageFiles.itemid
//         LEFT OUTER JOIN
//             CUSTOMRECORD_FC_PRODUCT_BRANDS AS Brand
//             ON Item.custitem_fc_brand = Brand.id

//         ORDER BY
//             Item.displayname
// 		`;
//     log.audit( { title: 'getInputData - begin', details: sql} );

// 	var queryParams = new Array();
// 	var rows = selectAllRows( sql, queryParams );
//     //var rows = selectSomeRows(130, sql, queryParams);    // useful for debugging
// 	log.audit( { title: 'getInputData - number of rows selected', details: rows.length } );
// 	return rows;
// }