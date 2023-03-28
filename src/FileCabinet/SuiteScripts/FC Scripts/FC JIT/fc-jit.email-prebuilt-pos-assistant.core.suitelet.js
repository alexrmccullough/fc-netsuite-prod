/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

// var modulePathThisAppLibrary = './fc-jit.send-jit-po-utility.library.module.js';
var modulePathThisAppLibrary = './fc-jit.email-prebuilt-pos-assistant.library.module.js';


var
    file,
    https,
    log,
    page,
    query,
    record,
    render,
    runtime,
    scriptURL,
    url,
    FCLib,
    ThisAppLib,
    Papa;
// assistant, 
// stepSelectOptions;


define(['N/file', 'N/https', 'N/log', 'N/ui/message', 'N/query', 'N/record', 'N/render', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/FC_MainLibrary', modulePathThisAppLibrary, '../Libraries/papaparse.min.js'], main);


function main(fileModule, httpsModule, logModule, messageModule, queryModule, recordModule, renderModule, runtimeModule, serverWidgetModule, urlModule, fcLibModule, thisAppLibModule, papaparseModule) {
    file = fileModule;
    https = httpsModule;
    log = logModule;
    message = messageModule;
    query = queryModule;
    record = recordModule;
    render = renderModule;
    runtime = runtimeModule;
    serverWidget = serverWidgetModule;
    url = urlModule;
    FCLib = fcLibModule;
    ThisAppLib = thisAppLibModule;
    Papa = papaparseModule;

    return {

        onRequest: function (context) {
            scriptURL = url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, returnExternalURL: false });

            var assistant = serverWidget.createAssistant({
                title: 'Email Pre-built JIT POs Assistant',
                hideNavBar: false
            });

            var stepSelectOptions = assistant.addStep({
                id: 'custpage_step_select_options',
                label: 'Select Options',
            });

            var stepReviewAndConfirm = assistant.addStep({
                id: 'custpage_step_review_and_filter',
                label: 'Initial Edit',
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


        // Get current date
        var today = new Date();

        var captureSosStartDate = assistant.addField({
            id: ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: ThisAppLib.Settings.Ui.Fields.CAPTURE_SOS_START_DATE_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });
        captureSosStartDate.isMandatory = true;

        // Set default value to today
        // captureSosStartDate.defaultValue = today;

        var captureSosEndDate = assistant.addField({
            id: ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: ThisAppLib.Settings.Ui.Fields.CAPTURE_SOS_END_DATE_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });
        captureSosEndDate.isMandatory = true;


        // Build multiselect field for POs
        //    If we have been passed a list of POs as a parameter, populate this field and disable it
        //    Otherwise, we need to populate the field with PO query
        //       POs that are pending receipt, have not been emailed, and are for JIT vendors
        var poField = assistant.addField({
            id: ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL,
            type: serverWidget.FieldType.SELECT,
            label: ThisAppLib.Settings.Ui.Fields.CAPTURE_PO_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });
        poField.isMandatory = true;

        // Check if we have been passed a list of POs
        let poIds = null;
        if (ThisAppLib.Settings.Ui.Parameters.INPUT_PREBUILT_PO_IDS in params) {
            poIds = params[ThisAppLib.Settings.Ui.Parameters.INPUT_PREBUILT_PO_IDS].split(',');
        }

        let sqlQuery = ThisAppLib.buildQueryBasicUnsentJITPO({
            filterJitUnsent: poIds == null ? true : false,
            poIds: poIds,
        });

        // Run the query
        let queryResults = FCLib.sqlSelectAllRows(sqlQuery);

        // Build array of fields to display
        let poDisplayFields = ThisAppLib.Settings.Ui.FieldDataFormat.PO_MULTISELECT_PO_FIELDS;
        let poValueFields = Object.keys(ThisAppLib.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1);

        let poSelectEntries = [];
        // let vendorIds = new Set();

        for (let result of queryResults) {
            // Build string to display for PO
            let poDisplayStr = '';
            for (let field of poDisplayFields) {
                poDisplayStr += result[ThisAppLib.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1[field].fieldid] + ', ';
            }

            // Build entry value string to be passed with parameters
            let poEntryValue = result[ThisAppLib.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.tranid.fieldid];
            // for (let field of poValueFields) {
            //     poEntryValue += 
            //         field + '=' +
            //         result[ThisAppLib.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1[field].fieldid] + '|~|';
            // }

            // Enter PO ID as separate value to be used in building the select field
            // let poId = result[ThisAppLib.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.tranid.fieldid];

            poSelectEntries.push({
                displayStr: poDisplayStr,
                entryValue: poEntryValue,
                // poId: poId
            })

            // vendorIds.add(result[ThisAppLib.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.entity.fieldid]);
        }

        // Add options to PO field
        for (let poSelectEntry of poSelectEntries) {
            poField.addSelectOption({
                value: poSelectEntry.entryValue,
                text: poSelectEntry.displayStr,
                isSelected: poIds == null ? false : poIds.includes(poSelectEntry.entryValue)
            });
        }

        // Disable PO field if we have been passed a list of POs
        if (poIds != null) {
            poField.isDisabled = true;
        }


    }

    function writeStep2ReviewAndConfirm(context, assistant) {
        // Get date parameters
        // var persistentParams = {
        //     [ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID]: context.request.parameters[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
        //     [ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID]: context.request.parameters[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID],
        //     [ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL]: context.request.parameters[ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL],
        // };

        // var soStartDate = context.request.parameters[FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID];
        // var soEndDate = context.request.parameters[FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID];
        // var sendAllPosByDefault = context.request.parameters[ThisAppLib.Settings.Ui.Parameters.ENABLE_SEND_ALL_POS_BY_DEFAULT_ID];

        let debugHtml = '';
        // let params = context.request.parameters;


        // Create a session folder to store data to be passed to PO sending script
        let sessionFolder = ThisAppLib.createSessionSubfolder(context);



        // Build list of PO items counts
        //   Item Internal ID / Item Quantity
        //   Filter by:
        //      Is JIT?
        //      Doesn't already have Lot Number assigned

        // Steps: 
        //  1. Run query on PO items for JIT items
        //  2. Run query/search for JIT label data


        // Run query on PO transactions for JIT items
        let poIdsSelected = context.request.parameters[ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL].split(',');

        let sqlQuery = FCJITLib.buildQueryGetItemInfoFromPOs(poIdsSelected);

        debugHtml += `<pre>sqlQuery: ${sqlQuery}</pre><br><br>`;

        let nestingKeys = [
            ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemid.fieldid
        ];

        let queryResults = FCLib.sqlSelectAllRowsIntoNestedDict(
            sqlQuery,
            nestingKeys              // FIX: Replace with setting variable?
        );

        debugHtml += `<pre>queryResults: ${JSON.stringify(queryResults)}</pre><br><br>`;

        // Get list of vendors returned from the PO query, to be used in the JIT label search
        let vendorIds = new Set();
        for (let result of Object.entries(queryResults)) {
            vendorIds.add(
                result[ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorid.fieldid]
            );
        }

        // Run query/search for labels, filtered by JIT items only
        let labelSearchParams = {
            vendorInternalIds: [...vendorIds],
            itemIsJit: true,
            soShipStartDate: FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID,
            soShipEndDate: FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID,
        };

        let searchResults = FCShipLabelLib.runLotNumberedShippingLabelSearch(labelSearchParams);
        debugHtml += `<pre>searchResults: ${JSON.stringify(searchResults)}</pre><br><br>`;


        let labelJsonFileIds = {};

        // Split label search results by vendor ID. Save one set of the label search results per vendor ID to a JSON file
        for (let vendorId of vendorIds) {
            let vendorLabelSearchResults = searchResults.filter(result => result.vendorid == vendorId);

            let vendorLabelSearchResultsFile = sessionFolder.createFile({
                name: `labelSearchResults_${vendorId}.json`,
                fileType: file.Type.JSON,
                contents: JSON.stringify(vendorLabelSearchResults)
            });

            labelJsonFileIds[vendorId] = vendorLabelSearchResultsFile.id;
        }

        // Build dict of all items to display comparison between items/quantities that appear on 
        //   the PO vs the items/quantities that appear on the JIT label search
        //   Struture: 
        //      itemid > 
        //          poQty
        //          labelQty
        let itemIdKey = 'Item ID';
        let poQtyKey = 'Quantity on PO';
        let labelQtyKey = 'Quantity on Shipping Labels';

        let itemInfo = {};

        for (let itemId of Object.keys(queryResults)) {
            // Results of query in nested dict are in array format. 
            // Sum quantities across array
            let itemResults = queryResults[itemId];
            let poQty = itemResults.reduce((total, item) => total + item.itemquantity, 0);

            if (!(itemId in itemInfo)) {
                itemInfo[itemId] = {
                    [poQtyKey]: poQty,
                    [labelQtyKey]: 'none',
                };
            }
        }

        // We have to do more work to summarize the label results by itemid because the results
        //   by default group by lot number rather than itemid.
        // We do this work here so that we can use the same saved search that we use for all other label generation. 

        // First, we need to build a dict of line item counts. The saved search returns lines with duplicate item counts because
        //   it's showing detail by lot number. 
        let lineCounts = {};

        for (let labelSearchLine of searchResults.data) {
            let lineUniqueKey = labelSearchLine[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.TransLineUniqueKey];
            let itemId = labelSearchLine[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.ItemId];
            let lineQty = labelSearchLine[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.ItemQty];

            // Take the first instance of the unique line key / line qty combo
            if (!(lineUniqueKey in lineCounts)) {
                lineQty = lineQty ? lineQty : 0;

                lineCounts[lineUniqueKey] = {
                    lineQty: lineQty,
                    itemId: itemId,
                }
            }
        }

        // Now we have the summarized item totals. 
        //   Add them into our comparison dict (itemInfo)
        for (let lineCount of Object.values(lineCounts)) {
            let itemId = lineCount.itemId;
            let lineQty = lineCount.lineQty;

            if (!(itemId in itemInfo)) {
                itemInfo[itemId] = {
                    [poQtyKey]: 'none',
                    [labelQtyKey]: lineQty,
                };
            } else {
                if (itemInfo[itemId][labelQtyKey] === 'none') {
                    itemInfo[itemId][labelQtyKey] = lineQty;
                } else {
                    itemInfo[itemId][labelQtyKey] += lineQty;
                }
            }
        }

        debugHtml += `<pre>itemInfo: ${JSON.stringify(itemInfo)}</pre><br><br>`;

        // Build table to display comparison
        //  First, add itemId as field in every entry 
        for (let itemId of Object.keys(itemInfo)) {
            itemInfo[itemId][itemIdKey] = itemId;
        }

        var comparisonTableHtml = FCLib.convertObjToHTMLTableStylized({
            fields: [itemIdKey, poQtyKey, labelQtyKey],
            data: itemInfo,
        });


        // Embed in an inlinehtml form field
        let comparisonTableHtmlField = form.addField({
            id: 'custpage_comptable_html_field',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Confirm PO vs Label Item Quantities'
        });
        comparisonTableHtmlField.defaultValue = comparisonTableHtml;

        var persistentParams = {
            [ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL]: poIdsSelected.join(','),
            [ThisAppLib.Settings.Ui.Parameters.LABEL_JSON_FILE_IDS]: JSON.stringify(labelJsonFileIds),
        };
        FCLib.addPersistentParamsField(assistant, persistentParams);

    }


    function writeResult(context, assistant) {
        var persistentParams = FCLib.getPersistentParams(context);
        // let poIdsSelected = persistentParams[ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL].split(',');
        // let labelJsonFileIds = JSON.parse(persistentParams[ThisAppLib.Settings.Ui.Parameters.LABEL_JSON_FILE_IDS]);

        let poIdsStr = persistentParams[ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL];
        let outHtml = '';

        // (As of 2023.03.28) Simple logic, to be improved later:
        //   If we've gotten here, we can assume: 
        //      - Single PO selected (initial PO field is a SELECT, not MULTISELECT)
        //      - PO has been confirmed (otherwise, we would have gone back to the PO selection screen)
        //      - PO has been confirmed to have the same item quantities as the JIT labels (otherwise, we would have gone back to the PO selection screen)

        // Get PO ID
        

        let jitPoSendTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: ThisAppLib.Ids.Scripts.EMAIL_JIT_POS,
            deploymentId: ThisAppLib.Ids.Deployments.EMAIL_JIT_POS,
            parameters: {
                poIds: poIdsStr,
                labelJsonFileIdsByVendorId: persistentParams[ThisAppLib.Settings.Ui.Parameters.LABEL_JSON_FILE_IDS],
            }
        });
        
        let jitPoSendTaskId = jitPoSendTask.submit();

        // Write confirmation message to page
        outHtml += `
            <h1>JIT Email Sending Triggered</h1>
            <p>POs have been sent to JIT vendors. PO IDs: ${poIdsStr}</p>
            `;

        // let jitPoSendTaskStatus = task.checkStatus({
        //     taskId: jitPoSendTaskId
        // });

        return outHtml;

    }

    function writeCancel(context, assistant) {
        return `
            <h1>JIT PO Email Assistant cancelled</h1>
            <p>POs have not been sent to JIT vendors.</p>
            `;
    }


}

