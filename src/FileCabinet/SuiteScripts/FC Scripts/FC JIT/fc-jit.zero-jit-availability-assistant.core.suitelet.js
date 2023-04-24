/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var modulePathJitAvailUpdateLibrary = './fc-jit.advanced-update-jit-availablity.library.module';
var modulePathThisAppLibrary = './fc-jit.zero-jit-availability-assistant.library.module';

var
    log,
    runtime,
    serverWidget,
    url,
    FCLib,
    FCUpdateJitAvailLib,
    ThisAppLib,
    Papa;


define(['N/log',
    'N/runtime',
    'N/ui/serverWidget',
    'N/url',
    '../Libraries/fc-main.library.module',
    modulePathJitAvailUpdateLibrary,
    modulePathThisAppLibrary,
    '../Libraries/papaparse.min'
], main);


function main(
    logModule,
    runtimeModule,
    serverWidgetModule,
    urlModule,
    fcLibModule,
    updateJitAvailLibraryModule,
    thisAppLibraryModule,
    papaModule
) {
    log = logModule;
    runtime = runtimeModule;
    serverWidget = serverWidgetModule;
    url = urlModule;
    FCLib = fcLibModule;
    FCUpdateJitAvailLib = updateJitAvailLibraryModule;
    ThisAppLib = thisAppLibraryModule;
    Papa = papaModule;

    return {

        onRequest: function (context) {
            scriptURL = url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, returnExternalURL: false });

            var assistant = serverWidget.createAssistant({
                title: 'Zero JIT Availability Assistant',
                hideNavBar: false
            });

            var stepSelectOptions = assistant.addStep({
                id: 'custpage_step_select_options',
                label: 'Select Vendors to Zero',
            });

            var stepReviewAndConfirm = assistant.addStep({
                id: 'custpage_step_review_and_filter',
                label: 'Review Items and Submit',
            });

            // var stepFinalReview = assistant.addStep({
            //     id: 'custpage_step_final_review',
            //     label: 'Final Review'
            // });

            assistant.isNotOrdered = false;

            var steps = [
                null,
                stepSelectOptions,
                stepReviewAndConfirm,
                // stepFinalReview,
                null
            ];

            var stepWriteFunc = [
                writeCancel,
                writeStep1SelectOptions,
                writeStep2ReviewAndConfirm,
                // writeStep3FinalReview,
                writeResult
            ];


            if (context.request.method === 'GET') //GET method means starting the assistant
            {
                stepWriteFunc[1](context, assistant);
                assistant.currentStep = steps[1];
                context.response.writePage(assistant);

            } else { //POST method - process step of the assistant

                if (assistant.getLastAction() == "next" || assistant.getLastAction() == "back") {
                    assistant.currentStep = assistant.getNextStep();
                    let curStepNum = assistant.currentStep.stepNumber;
                    // assistant.sendRedirect(response);
                    stepWriteFunc[curStepNum](context, assistant);
                    context.response.writePage(assistant);
                }

                else if (assistant.getLastAction() == 'finish') {
                    let finishedHtml = writeResult(context, assistant);
                    context.response.write(finishedHtml);
                    //use   nlapiSetRedirectURL if you want to redirect user to any page
                }

                else if (assistant.getLastAction() == 'cancel') {
                    let cancelHtml = writeCancel(context, assistant);
                    context.response.write(cancelHtml);

                }

                else {
                    // FIX: Write unknown error
                }
            }
        }
    }

    function writeStep1SelectOptions(context, assistant) {
        var params = context.request.parameters;

        // // Get current date
        // var today = new Date();

        // Run vendor JIT item availability query
        let sqlVendorJitAvailQueryText = ThisAppLib.Queries.GET_VENDOR_JIT_SUMMARY.Query;
        let vendorJitResults = FCLib.sqlSelectAllRows(sqlVendorJitAvailQueryText);

        // Build the table html
        const fieldDefs = ThisAppLib.Ui.Step1.Sublists.SELECT_VENDORS_TO_ZERO.Fields;
        const tableFields = [
            fieldDefs.CB_Select,
            fieldDefs.VendorInternalId,
            fieldDefs.VendorName,
            fieldDefs.VendorHasJitItemsRemaining,
            fieldDefs.VendorItemCountJitRemaining,
        ];

        let tableHtml = FCLib.updatedConvertLookupTableToHTMLTable({
            data: vendorJitResults,
            fieldDefs: tableFields,
            ...FCLib.Ui.TableStyles.Style1
        });

        // Add an inline html field to the assistant and inject the table html
        let vendorTable = assistant.addField({
            id: 'custpage_vendor_table',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'JIT Vendors & Remaining Availability',
        });
        vendorTable.defaultValue = tableHtml;

        // Attach our client script to enable keyboard shortcuts
        assistant.clientScriptModulePath = '../Libraries/fc.page-input-behavior.client.js';

    }

    function writeStep2ReviewAndConfirm(context, assistant) {
        let params = context.request.parameters;

        // Get the selected vendors
        const vendorSelectedParams = FCLib.extractParametersFromRequest(
            params,
            ThisAppLib.Ui.Step1.Parameters.SELECT_VENDOR_CHECKBOX_ID.looksLike,
            ThisAppLib.Ui.Step1.Parameters.SELECT_VENDOR_CHECKBOX_ID.parse,
        );

        const vendorsSelected = Object.values(vendorSelectedParams);

        // Add an inline html field to the assistant and inject the table html
        let itemTable = assistant.addField({
            id: 'custpage_vendor_item_detail_table',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Confirm Items to Zero',
        });


        // If the user selected vendors, run a query to get the items for those vendors and build a table
        if (vendorsSelected.length > 0) {
            let sqlVendorItemDetailQuery = ThisAppLib.Queries.GET_VENDOR_ITEM_DETAILS.BuildQuery(
                vendorsSelected
            );

            let vendorItemDetailResults = FCLib.sqlSelectAllRows(sqlVendorItemDetailQuery);
            const fieldDefs = ThisAppLib.Ui.Step2.Sublists.SELECT_ITEMS_TO_ZERO.Fields;
            const tableFields = [
                fieldDefs.CB_Select,
                fieldDefs.VendorName,
                fieldDefs.ItemInternalId,
                fieldDefs.ItemName,
                fieldDefs.ItemDisplayName,
                fieldDefs.RemainJitQty,
                fieldDefs.StartJitQty,
            ];

            let tableHtml = FCLib.updatedConvertLookupTableToHTMLTable({
                data: vendorItemDetailResults,
                fieldDefs: tableFields,
                ...FCLib.Ui.TableStyles.Style1
            });

            itemTable.defaultValue = tableHtml;
        }

        // If the user didn't select any vendors, display a simple prompt
        else {
            itemTable.defaultValue = "No vendors selected. Click Back to select vendors.";
        }

        // Attach our client script to enable keyboard shortcuts
        assistant.clientScriptModulePath = '../Libraries/fc.page-input-behavior.client.js';

    }


    function writeResult(context, assistant) {
        let params = context.request.parameters;

        // Get the selected vendors
        const itemsSelectedParams = FCLib.extractParametersFromRequest(
            params,
            ThisAppLib.Ui.Step2.Parameters.SELECT_ITEM_CHECKBOX_ID.looksLike,
            ThisAppLib.Ui.Step2.Parameters.SELECT_ITEM_CHECKBOX_ID.parse,
        );

        const itemsSelected = Object.values(itemsSelectedParams);

        // Build a CSV file mapping every item to:
        //    startjitqty: 0
        //    remainingjitqty: 0
        let csvRawRows = [];
        let csvHeader = [
            FCLib.Ids.Fields.Item.InternalId,
            FCLib.Ids.Fields.Item.StartJITQty,
            FCLib.Ids.Fields.Item.RemainingJITQty
        ];
        csvRawRows.push(csvHeader);

        for (let itemId of itemsSelected) {
            csvRawRows.push([itemId, 0, 0]);
        }

        let csvFormattedText = Papa.unparse(csvRawRows);

        let csvFileName = FCLib.generateTimestampedFilename(
            FCUpdateJitAvailLib.IO.Settings.ZERO_AVAILABILITY_CSV_FILENAME_PREFIX,
            '.csv'
        );

        // Create the output folder and write the csv file
        let outputFolderId = createSessionSubfolder(context);

        let csvFileId = FCLib.writeFileToFileCabinet(
            'csv',
            csvFileName,
            csvFormattedText,
            outputFolderId
        );

        // Launch the map-reduce script to apply changes
        let mrTaskId = FCUpdateJitAvailLib.submitItemUpdateMRJob(csvFileId);

        // Write a page back to the user saying: MR task has been submitted, you will receive an email when it is complete. You can also monitor it here.

        let html = `
            <h1>Zero JIT Availability</h1>
            <p>A Zero JIT Availability task has been submitted. You will receive an email when it is complete.</p>
        `;

        return html;
    }


    function writeCancel(context, assistant) {
        return `
            <h1>JIT PO Email Assistant cancelled</h1>
            <p>POs have not been sent to JIT vendors.</p>
            `;
    }

    function createSessionSubfolder(context, date = new Date()) {
        const curDateTimeStr = FCLib.getStandardDateTimeString1(date);
        var resultsFolderName = ThisAppLib.Settings.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
        var resultsFolderId = FCLib.createFolderInFileCabinet(resultsFolderName, ThisAppLib.Ids.Folders.RESULTS.GetId());

        return resultsFolderId;
    }
}

