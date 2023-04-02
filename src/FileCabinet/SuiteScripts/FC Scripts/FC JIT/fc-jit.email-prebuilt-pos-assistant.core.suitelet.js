/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var modulePathThisAppLibrary = './fc-jit.email-prebuilt-pos-assistant.library.module.js';
var modulePathShipLabelLibrary = '../FC Shipping Labels/fc-shipping-labels.library.module.js';

var
    file,
    log,
    query,
    record,
    // render,
    runtime,
    serverWidget,
    url,
    FCLib,
    ThisAppLib,
    FCShipLabelLib;
// Papa;
// assistant, 
// stepSelectOptions;


define(['N/file', 'N/log', 'N/query', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/fc-main.library.module.js', modulePathThisAppLibrary, modulePathShipLabelLibrary], main);


function main(fileModule, logModule, queryModule, recordModule, runtimeModule, serverWidgetModule, urlModule, fcLibModule, thisAppLibModule, shipLabelModule) {
    file = fileModule;
    log = logModule;
    query = queryModule;
    record = recordModule;
    runtime = runtimeModule;
    serverWidget = serverWidgetModule;
    url = urlModule;
    FCLib = fcLibModule;
    ThisAppLib = thisAppLibModule;
    FCShipLabelLib = shipLabelModule;

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
        });
        captureSosStartDate.isMandatory = true;

        // Set default value to today
        // captureSosStartDate.defaultValue = today;

        var captureSosEndDate = assistant.addField({
            id: ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: ThisAppLib.Settings.Ui.Fields.CAPTURE_SOS_END_DATE_LABEL,
        });
        captureSosEndDate.isMandatory = true;


        // Check if we have been passed a list of POs
        let poIds = null;
        if (ThisAppLib.Settings.Ui.Parameters.INPUT_PREBUILT_PO_IDS in params) {
            poIds = params[ThisAppLib.Settings.Ui.Parameters.INPUT_PREBUILT_PO_IDS].split(',');
        }

        let sqlQuery = ThisAppLib.buildQueryBasicUnsentJitPo({
            // filterJitUnsent: poIds == null ? true : false,
            filterJitUnsent: false,
            poIds: poIds,
        });

        // Run the query
        let queryResults = FCLib.sqlSelectAllRows(sqlQuery);


        // let poSublist = assistant.addSublist({
        //     id: ThisAppLib.Settings.Ui.Sublists.SELECT_POS.Id,
        //     type: serverWidget.SublistType.INLINEEDITOR,
        //     label: ThisAppLib.Settings.Ui.Sublists.SELECT_POS.Label,
        // });
        // buildPoSelectSublist(context, poSublist, queryResults);

        // let poList = assistant.CreateList({
        //     title: 'This List'
        // });
        // buildPoSelectREGULARLIST(context, poList, queryResults);


        // Build an INLINEHTML field, create a PO table, and inject the HTML into the table

        let tableHtml = buildPoSelectHtmlList(context, queryResults);



        let poTable = assistant.addField({
            id: 'custpage_po_table',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'PO Table',
        });
        poTable.defaultValue = tableHtml;


        assistant.clientScriptModulePath = './fc-jit.email-prebuilt-pos-assistant.core.client.js';


    }

    function writeStep2ReviewAndConfirm(context, assistant) {
        // Get date parameters
        // var persistentParams = {
        //     [ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID]: context.request.parameters[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
        //     [ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID]: context.request.parameters[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID],
        //     [ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL]: context.request.parameters[ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL],
        // };

        // var soStartDate = context.request.parameters[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID];
        // var soEndDate = context.request.parameters[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID];
        // var sendAllPosByDefault = context.request.parameters[ThisAppLib.Settings.Ui.Parameters.ENABLE_SEND_ALL_POS_BY_DEFAULT_ID];

        let debugHtml = '';
        let params = context.request.parameters;

        // Get PO IDs from checkbox values submitted via POST
        let poIdsSelected = Object.entries(params).reduce(
            (matched, [paramName, value]) => {
                if (ThisAppLib.Settings.Ui.Parameters.SELECT_PO_ID_CHECKBOX_ID.looksLike(paramName)) {
                    return [...matched, value];
                }
                return matched;
            }, []
        );

        // Save these values to persistent param, just in case
        var persistentParams = {
            [ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL]: poIdsSelected,
        };


        // If no POs selected, write a simple message and return
        if (poIdsSelected.length == 0) {
            let noPosSelectedHtml = `
                <h1>No POs Selected</h1>
                <p>Please return to the previous page and select at least one PO to send.</p>
            `;

            // Add this to the Assistant as a field
            let noPosSelectedField = assistant.addField({
                id: 'custpage_no_pos_selected',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'No POs Selected',
            });
            noPosSelectedField.defaultValue = noPosSelectedHtml;

            return;
        }


        // Build list of PO items counts
        //   Item Internal ID / Item Quantity
        //   Filter by:
        //      Is JIT?
        //      Doesn't already have Lot Number assigned

        // Steps: 
        //  1. Run query on PO items for JIT items
        //  2. Run query/search for JIT label data

        // Run query on PO transactions for JIT items
        let sqlQuery = ThisAppLib.buildQueryGetItemInfoFromPos(poIdsSelected);

        debugHtml += `<pre>sqlQuery: ${sqlQuery}</pre><br><br>`;

        let nestingKeys = [
            // ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemid.fieldid
            ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorname.fieldid
        ];

        let queryResults = FCLib.sqlSelectAllRowsIntoNestedDict(
            sqlQuery,
            nestingKeys
        );

        debugHtml += `<pre>queryResults: ${JSON.stringify(queryResults)}</pre><br><br>`;

        // Get list of vendor info returned from the PO query, to be used in the JIT label search
        // Vendor info is a 2-elem array: [0] = vendor ids, [1] = vendor names
        let vendorInfo = Object.values(queryResults).reduce(
            (acc, poItem) => {
                let vendorName = poItem[0][ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorname.fieldid];
                let vendorId = poItem[0][ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorid.fieldid];

                if (!(vendorName in acc)) {
                    acc[vendorName] = vendorId;
                }
                return acc;
            }, {}
        );      // queryResults = 1:N map from item id > q result




        // Run query/search for labels, filtered by JIT items only
        // FIX: Can we combine this savedsearch into the above query?
        let labelSearchParams = {
            vendorInternalIds: Object.values(vendorInfo),
            itemIsJit: true,
            soShipStartDate: params[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            soShipEndDate: params[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID],
        };

        let searchResults = FCShipLabelLib.runLotNumberedShippingLabelSearch(labelSearchParams);
        debugHtml += `<pre>searchResults: ${JSON.stringify(searchResults)}</pre><br><br>`;

        // FIX: Add check here for empty search results? 





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
        let lineUniqueKeyHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.TransLineUniqueKey.nsSsFieldId;
        let itemIdHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.ItemInternalId.nsSsFieldId;
        let lineQtyHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.SOLineQuantity.nsSsFieldId;


        for (let labelSearchLine of searchResults.data) {
            let lineUniqueKey = labelSearchLine[lineUniqueKeyHeader];
            let itemId = labelSearchLine[itemIdHeader];
            let lineQty = labelSearchLine[lineQtyHeader];

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
            let lineQty = Number(lineCount.lineQty);

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

        // FIX / Challenge: If we don't assume that there is a strict 1-1 relationship between item and vendor, 
        //   then how do we display a summary of the PO item quantities against label item quantities?
        //   We can't just use the PO item quantities because there may be multiple vendors for a given item.
        //   We can't just use the label item quantities because there may be multiple items for a given vendor.

        // FIX / Challenge: What if we don't assume 1-1 relationship between PO and vendor? In other words,
        //   what if a vendor has multiple POs selected here? 

        // The plan for now (2023.04.02): Break the items out by vendor. Inclue a column specifying the PO Number(s) 
        //   in which the items appear, with counts (e.g. PO123 (5)).



        //  First, add itemId as field in every entry 
        for (let itemId of Object.keys(itemInfo)) {
            itemInfo[itemId][itemIdKey] = itemId;
        }

        var comparisonTableHtml = FCLib.convertObjToHTMLTableStylized({
            fields: [itemIdKey, poQtyKey, labelQtyKey],
            data: Object.values(itemInfo),
        });


        // Embed in an inlinehtml form field
        let comparisonTableHtmlField = assistant.addField({
            id: 'custpage_comptable_html_field',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Confirm PO vs Label Item Quantities'
        });
        comparisonTableHtmlField.defaultValue = comparisonTableHtml;


        

        // If we got here, then we have at least one PO to send
        // Create a session folder to store data to be passed to PO sending script
        
        let labelJsonFileIds = {};
        let vendorNameHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.PreferredVendor.nsSsFieldId;

        let sessionFolderId = ThisAppLib.createSessionSubfolder(context);

        // Split label search results by vendor ID. Save one set of the label search results per vendor ID to a JSON file.
        //    Plan: Send one email per vendor and include 1 to many POs in each email. 
        //          Include a single label file for the combined items. 
        //    FIX: The above assumes a 1-1 relationship between item and vendor. 

        for (let vendorName of Object.keys(vendorInfo)) {
            let vendorLabelSearchResults = searchResults.data.filter(result => result[vendorNameHeader] == vendorName);
            let vendorId = vendorInfo[vendorName];

            let vendorLabelSearchResultsFile = FCLib.writeFileToFileCabinet(
                'json',
                `labelSearchResults_${vendorId}.json`,
                JSON.stringify(vendorLabelSearchResults),
                sessionFolderId,
            );

            labelJsonFileIds[vendorId] = vendorLabelSearchResultsFile.id;
        }

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



    function buildPoSelectHtmlList(context, poQueryResults) {
        let fieldDefs = ThisAppLib.Settings.Ui.Sublists.SELECT_POS.Fields;
        let fieldHeaders = Object.keys(fieldDefs).map(key => fieldDefs[key].Label);


        let selectCheckboxInputSpecs = {
            htmlElem: 'checkbox',
            valueSourceField: fieldDefs.PoInternalId.Label,
            checkedSourceField: fieldDefs.Select.Label,
            fieldDisplayName: 'Select',
            idPrefixPart1Str: ThisAppLib.Settings.Ui.Parameters.SELECT_PO_ID_CHECKBOX_ID.prefix,
            idPrefixPart2Str: '',
            idUniqueSuffixSourceField: fieldDefs.PoInternalId.Label,
        };

        // First, sort the list by PO ID
        let sortField = ThisAppLib.Settings.Ui.Sublists.SELECT_POS.Fields.PoDisplayName.UnsentPoQuerySource.fieldid;
        let poQueryResultsSorted = FCLib.sortArrayOfObjsByKey(poQueryResults, sortField, true);

        let formattedRows = [];

        // Loop through sorted query results and add them to the list
        for (let i = 0; i < poQueryResultsSorted.length; i++) {
            let queryRow = poQueryResultsSorted[i];
            let formattedRow = {};

            for (let fieldDef of Object.values(fieldDefs)) {
                let fieldId = fieldDef.Id;
                let fieldLabel = fieldDef.Label;
                let fieldVal = ('DefaultValue' in fieldDef) ? fieldDef.DefaultValue : '';

                if ('UnsentPoQuerySource' in fieldDef) {
                    fieldVal = queryRow[fieldDef.UnsentPoQuerySource.fieldid];
                }

                if (fieldVal !== null && fieldVal !== undefined && fieldVal != '') {
                    if ('TypeFunc' in fieldDef) { fieldVal = fieldDef.TypeFunc(fieldVal); }

                    formattedRow[fieldLabel] = fieldVal;
                    // sublist.setSublistValue({
                    //     id: fieldId,
                    //     line: i,
                    //     value: fieldVal,
                    // });
                }
            }
            formattedRows.push(formattedRow);
        }

        let tableHtml = FCLib.convertObjToHTMLTableStylized({
            fields: fieldHeaders,
            data: formattedRows,
            specialElems: [selectCheckboxInputSpecs],
            hideFields: { [fieldDefs.Select.Label]: true }
        });

        return tableHtml;

    }


    function writeCancel(context, assistant) {
        return `
            <h1>JIT PO Email Assistant cancelled</h1>
            <p>POs have not been sent to JIT vendors.</p>
            `;
    }


}

