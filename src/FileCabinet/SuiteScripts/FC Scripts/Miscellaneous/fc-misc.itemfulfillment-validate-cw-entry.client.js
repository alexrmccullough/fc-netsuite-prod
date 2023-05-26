/**
 *  Client Script
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType ClientScript
 */


define([
    'N/record',
    '../Libraries/fc-general.library.module',
    '../Libraries/fc-client.library.module'
], function (
    record,
    FCGenLib,
    FCClientLib
) {
    /* === VARS === */
    var exports = {};

    // /* === EVENTS FUNCTIONS === */
    // /**
    //  * Line Init
    //  * @param {*} context 
    //  */
    // function lineInit(context) {
    //     console.log("lineInit Triggered!");
    //     return;
    // }

    /**
     * Save Record
     * @param {*} context 
     */
    function saveRecord(context) {
        console.log("saveRecord Triggered!");
        debugger;
        let rec = context.currentRecord;

        // For each transaction line, if custcol_fc_zen_cwi == T and the CW configuration has not been set,
        //   then do not save and display an alert.
        // Our indication that CW configuration has been configured: custcol_fc_zen_rate_on_if is not blank
        //   and custcol_fc_zen_rate_on_if is not 0
        // If custcol_fc_zen_cwi == T and custcol_fc_zen_rate_on_if is blank or 0, then display an alert
        //   and do not save.

        let errorCwLines = [];

        const lineCount = rec.getLineCount({
            sublistId: 'item',
        });

        for (var i = 0; i < lineCount; i++) {
            let itemReceived = rec.getSublistValue({
                sublistId: 'item',
                fieldId: 'itemreceive',
                line: i,
            });

            if (FCGenLib.looksLikeNo(itemReceived)) { continue; }

            let cwItem = rec.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_fc_zen_cwi',
                line: i,
            });

            if (FCGenLib.looksLikeNo(cwItem)) { continue; }

            let cwConfigured = rec.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_fc_zen_rate_on_if',
                line: i,
            });

            if (!cwConfigured || cwConfigured === null || cwConfigured === undefined || cwConfigured === "" || cwConfigured === 0) {
                // Get basic information about the line to use in displaying the error
                //   Item name
                //   Quantity
                //   Line number
                let itemName = rec.getSublistText({
                    sublistId: 'item',
                    fieldId: 'itemname',
                    line: i,
                });

                let itemQty = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i,
                });

                errorCwLines.push({
                    itemName: itemName,
                    itemQty: itemQty,
                    lineNum: i
                });
            }
        }

        if (errorCwLines.length > 0) {
            let errorText = "The following CW items have not been configured:\n";
            for (var i = 0; i < errorCwLines.length; i++) {
                errorText += `${errorCwLines[i].itemName} (Line ${errorCwLines[i].lineNum + 1}): qty ${errorCwLines[i].itemQty}\n`;
            }

            alert(errorText);
            return false;
        }
        else {
            return true;
        }


    }
    exports.saveRecord = saveRecord;



    // /**
    //  * Page Init
    //  * @param {*} context 
    //  */
    // function pageInit(context) {
    // }
    // exports.pageInit = pageInit;


    // /**
    //  * Post Sourcing
    //  * @param {*} context 
    //  */
    // function postSourcing(context) {
    //     console.log("postSourcing Triggered!");
    //     return;
    // }

    // /**
    //  * Sublist Changed
    //  * @param {*} context 
    //  */
    // function sublistChanged(context) {
    //     console.log("sublistChanged Triggered!");
    // }

    // /**
    //  * Validate Delete
    //  * @param {*} context 
    //  */
    // function validateDelete(context) {
    //     console.log("validateDelete Triggered!");
    //     return true; //Return true if the line deletion is valid.
    // }

    // /**
    //  * Validate Field
    //  * @param {*} context 
    //  */
    // function validateField(context) {
    //     console.log("validateField Triggered!");
    //     return true; //Return true to continue with the change.
    // }

    // /**
    //  * Validate Insert
    //  * @param {*} context 
    //  */
    // function validateInsert(context) {
    //     console.log("validateInsert Triggered!");
    //     return true; //Return true if the line insertion is valid.
    // }

    // /**
    //  * Validate Line
    //  * @param {*} context 
    //  */
    // function validateLine(context) {
    //     console.log("validateLine Triggered!");
    //     return true; //Return true if the line is valid.
    // }

    // /**
    //  * Field Changed
    //  * @param {*} context 
    //  */
    // function fieldChanged(context) {
    //     console.log("fieldChanged Triggered!");
    //     return;
    // }



    return exports;
});