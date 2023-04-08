/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var modulePathJitAvailUpdateLibrary = './fc-jit.update-jit-availablity.library.module.js';
var modulePathThisAppLibrary = './fc-jit.zero-jit-availability-assistant.library.module.js';

var
    file,
    log,
    record,
    runtime,
    serverWidget,
    url,
    FCLib,
    FCUpdateJitAvailLib,
    ThisAppLib,
    Papa;


define(['N/file', 'N/log', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/fc-main.library.module.js', modulePathJitAvailUpdateLibrary, modulePathThisAppLibrary, '../Libraries/papaparse.min.js'], main);


function main(
    fileModule,
    logModule,
    recordModule,
    runtimeModule,
    serverWidgetModule,
    urlModule,
    fcLibModule,
    updateJitAvailLibraryModule,
    thisAppLibraryModule,
    papaModule
) {
    file = fileModule;
    log = logModule;
    record = recordModule;
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

        let tableHtml = buildVendorSelectList(context, vendorJitResults);

        // Add an inline html field to the assistant and inject the table html
        let vendorTable = assistant.addField({
            id: 'custpage_vendor_table',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'JIT Vendors & Remaining Availability',
        });
        vendorTable.defaultValue = tableHtml;

    }

    function writeStep2ReviewAndConfirm(context, assistant) {
        let params = context.request.parameters;

        // FIX: Get these search functions into an FCLib function?
        let vendorsSelected = Object.entries(params).reduce(
            (matched, [paramName, value]) => {
                if (ThisAppLib.Settings.Ui.Parameters.SELECT_VENDOR_CHECKBOX_ID.looksLike(paramName)) {
                    return [...matched, value];
                }
                return matched;
            }, []
        );

        // Add an inline html field to the assistant and inject the table html
        let itemTable = assistant.addField({
            id: 'custpage_vendor_item_detail_table',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Confirm Items to Zero',
        });


        // If the user selected vendors, run a query to get the items for those vendors and build a table
        if (vendorsSelected.length > 0) {
            let sqlVendorItemDetailQuery = ThisAppLib.buildQueryGetVendorItemDetails(
                vendorsSelected
            );

            let vendorItemDetailResults = FCLib.sqlSelectAllRows(sqlVendorItemDetailQuery);
            let tableHtml = buildVendorItemDetailTable(context, vendorItemDetailResults);
            itemTable.defaultValue = tableHtml;
        }

        // If the user didn't select any vendors, display a simple prompt
        else {
            itemTable.defaultValue = "No vendors selected. Click Back to select vendors.";
        }


    }


    function writeResult(context, assistant) {
        let params = context.request.parameters;

        // FIX: Get these search functions into an FCLib function?
        let itemsSelected = Object.entries(params).reduce(
            (matched, [paramName, value]) => {
                if (ThisAppLib.Settings.Ui.Parameters.SELECT_ITEM_CHECKBOX_ID.looksLike(paramName)) {
                    return [...matched, value];
                }
                return matched;
            }, []
        );

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
            FCUpdateJitAvailLib.Settings.ZERO_AVAILABILITY_CSV_FILENAME_PREFIX,
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


    function buildVendorSelectList(context, vendorQueryResults) {
        let fieldDefs = ThisAppLib.Settings.Ui.Sublists.SELECT_VENDORS_TO_ZERO.Fields;

        let formattedRows = FCLib.formatQueryRowsOnFieldDefs(fieldDefs, vendorQueryResults);


        let tableHeaders = Object.keys(fieldDefs).map((key) => fieldDefs[key].Label);
        let selectCheckboxInputSpecs = {
            htmlElem: 'checkbox',
            valueSourceField: fieldDefs.VendorInternalId.Label,
            checkedSourceField: fieldDefs.Select.Label,
            fieldDisplayName: fieldDefs.Select.Label,
            idPrefixPart1Str: ThisAppLib.Settings.Ui.Parameters.SELECT_VENDOR_CHECKBOX_ID.prefix,
            idPrefixPart2Str: '',
            idUniqueSuffixSourceField: fieldDefs.VendorInternalId.Label,
        };

        let tableHtml = FCLib.convertObjToHTMLTableStylized({
            fields: tableHeaders,
            data: formattedRows,
            specialElems: [selectCheckboxInputSpecs],
            hideFields: {
                [fieldDefs.Select.Label]: true,
            },
        });

        return tableHtml;

    }

    function buildVendorItemDetailTable(context, itemQueryResults) {
        let fieldDefs = ThisAppLib.Settings.Ui.Sublists.SELECT_ITEMS_TO_ZERO.Fields;
        let formattedRows = FCLib.formatQueryRowsOnFieldDefs(fieldDefs, itemQueryResults);
        let tableHeaders = Object.keys(fieldDefs).map((key) => fieldDefs[key].Label);

        let selectCheckboxInputSpecs = {
            htmlElem: 'checkbox',
            valueSourceField: fieldDefs.ItemId.Label,
            checkedSourceField: fieldDefs.Select.Label,
            fieldDisplayName: fieldDefs.Select.Label,
            idPrefixPart1Str: ThisAppLib.Settings.Ui.Parameters.SELECT_ITEM_CHECKBOX_ID.prefix,
            idPrefixPart2Str: '',
            idUniqueSuffixSourceField: fieldDefs.ItemId.Label,
        };

        let tableHtml = FCLib.convertObjToHTMLTableStylized({
            fields: tableHeaders,
            data: formattedRows,
            specialElems: [selectCheckboxInputSpecs],
            hideFields: {
                [fieldDefs.Select.Label]: true,
            },
        });

        return tableHtml;

    }

    function createSessionSubfolder(context, date = new Date()) {
        const curDateTimeStr = FCLib.getStandardDateTimeString1(date);
        // const curDateTime = new Date();
        // const curDateTimeStr = curDateTime.toISOString().replace(/:/g, '-');
        var resultsFolderName = ThisAppLib.Settings.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
        var resultsFolderId = FCLib.createFolderInFileCabinet(resultsFolderName, ThisAppLib.Ids.Folders.RESULTS);

        return resultsFolderId;
    }
}

