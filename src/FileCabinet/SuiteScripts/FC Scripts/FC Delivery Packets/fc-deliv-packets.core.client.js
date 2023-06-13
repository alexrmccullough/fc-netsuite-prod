/**
 *  Client Script
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType ClientScript
 */


define([
    'N/url',
    'N/https',
    './fc-deliv-packets.library-general.module'
], function (
    url,
    https,
    ThisAppLib
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
     * Page Init
     * @param {*} context 
     */
    function pageInit(context) {
        console.log("pageInit Triggered!");

        var thisUrl = new URL(document.location.href);

        // If the form has NOT POSTed, then return
        let formSubmitted = thisUrl.searchParams.get(ThisAppLib.SuiteletParams.SUBMITTED);
        if (!formSubmitted || formSubmitted != 'T') {
            return;
        }

        // Look for all required parameters in the URL
        //   If all present, then launch server Suitelet to generate PDF
        //   If not all present, then display error message
        // Get the required parameters from the URL
        let startShipDate = thisUrl.searchParams.get(ThisAppLib.SuiteletParams.START_SHIP_DATE);
        let endShipDate = thisUrl.searchParams.get(ThisAppLib.SuiteletParams.END_SHIP_DATE);
        let customerSelect = thisUrl.searchParams.get(ThisAppLib.SuiteletParams.CUSTOMER_SELECT);
        let routeSelect = thisUrl.searchParams.get(ThisAppLib.SuiteletParams.ROUTE_SELECT);


        // Launch the server Suitelet to generate the PDF
        var suiteletURL = url.resolveScript({
            scriptId: ThisAppLib.Scripts.GENERATOR_SUITELET.ScriptId,
            deploymentId: ThisAppLib.Scripts.GENERATOR_SUITELET.DeployId,
            returnExternalUrl: false,
            params: {
                [ThisAppLib.SuiteletParams.START_SHIP_DATE]: startShipDate,
                [ThisAppLib.SuiteletParams.END_SHIP_DATE]: endShipDate,
                [ThisAppLib.SuiteletParams.CUSTOMER_SELECT]: customerSelect,
                [ThisAppLib.SuiteletParams.ROUTE_SELECT]: routeSelect,
            }
        });

        function showGeneratorLaunched(startShipDate, endShipDate) {
            var confirmMsg = msg.create({
                title: 'Delivery Packet PDF in Progress',
                message: 'It should be ready soon!',
                type: msg.Type.CONFIRMATION
            });
            confirmMsg.show({
                duration: 5000 // will disappear after 5s
            });
        }

        function showError(message) {
            var confirmMsg = msg.create({
                title: 'Delivery Packet PDF Failed',
                message: "Failed For Reason: " + message,
                type: msg.Type.WARNING
            });
            confirmMsg.show({
                duration: 30000 // will disappear after 30s
            });
        }

        https.get.promise({
            url: suiteletURL
        }).then(function (response) {
            showGeneratorLaunched(startShipDate, endShipDate)
        }).catch(function (reason) {
            log.error("failed to launch PDF generator", reason)
            showError(reason);
        });

        // If the suitelet generates a PDF or form that should appear for the user, use window.open()
        window.open(suiteletURL);
    }
    exports.pageInit = pageInit;


    // /**
    //  * Post Sourcing
    //  * @param {*} context 
    //  */
    // function postSourcing(context) {
    //     console.log("postSourcing Triggered!");
    //     return;
    // }

    // /**
    //  * Save Record
    //  * @param {*} context 
    //  */
    // function saveRecord(context) {
    //     console.log("saveRecord Triggered!");
    //     return true; //Return true if you want to continue saving the record.
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

    /**
     * Export Events
     */
    // var exports = {};
    // exports.lineInit = lineInit;
    // exports.postSourcing = postSourcing;
    // exports.saveRecord = saveRecord;
    // exports.sublistChanged = sublistChanged;
    // exports.validateDelete = validateDelete;
    // exports.validateField = validateField;
    // exports.validateInsert = validateInsert;
    // exports.validateLine = validateLine;
    // exports.fieldChanged = fieldChanged;
    return exports;
});