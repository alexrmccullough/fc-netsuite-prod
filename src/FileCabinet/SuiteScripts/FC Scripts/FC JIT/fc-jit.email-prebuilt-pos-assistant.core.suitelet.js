/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var modulePathThisAppLibrary = './fc-jit.email-prebuilt-pos-assistant.library.module.js';
var modulePathShipLabelLibrary = '../FC Shipping Labels/fc-shipping-labels.library.module.js';
var modulePathBulkEmailProcessLibrary = './fc-jit.bulk-email-jit-pos-labels.process-emails.library.module.js';

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
    FCShipLabelLib, 
    FCBulkEmailProcessLib;
// Papa;
// assistant, 
// stepSelectOptions;


define(['N/file', 'N/log', 'N/query', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/fc-main.library.module.js', modulePathThisAppLibrary, modulePathShipLabelLibrary, modulePathBulkEmailProcessLibrary], main);


function main(fileModule, logModule, queryModule, recordModule, runtimeModule, serverWidgetModule, urlModule, fcLibModule, thisAppLibModule, shipLabelModule, bulkEmailProcessModule) {
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
    FCBulkEmailProcessLib = bulkEmailProcessModule;

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
            ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorname.fieldid
        ];

        let poTransSearchResults = FCLib.sqlSelectAllRowsIntoNestedDict(
            sqlQuery,
            nestingKeys
        );

        debugHtml += `<pre>queryResults: ${JSON.stringify(poTransSearchResults)}</pre><br><br>`;

        // Get list of vendor info returned from the PO query, to be used in the JIT label search
        // Vendor info is a 2-elem array: [0] = vendor ids, [1] = vendor names
        let vendorInfo = Object.values(poTransSearchResults).reduce(
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
        let soShipLabelSearchFilters = {
            vendorInternalIds: Object.values(vendorInfo),
            itemIsJit: true,
            soShipStartDate: params[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            soShipEndDate: params[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID],
        };

        let soShipLabelSearchResults = FCShipLabelLib.runLotNumberedShippingLabelSearch(soShipLabelSearchFilters);
        debugHtml += `<pre>searchResults: ${JSON.stringify(soShipLabelSearchResults)}</pre><br><br>`;

        // FIX: Add check here for empty search results? 


        // FIX / Challenge: If we don't assume that there is a strict 1-1 relationship between item and vendor, 
        //   then how do we display a summary of the PO item quantities against label item quantities?
        //   We can't just use the PO item quantities because there may be multiple vendors for a given item.
        //   We can't just use the label item quantities because there may be multiple items for a given vendor.

        // FIX / Challenge: What if we don't assume 1-1 relationship between PO and vendor? In other words,
        //   what if a vendor has multiple POs selected here? 

        // The plan for now (2023.04.02): Break the items out by vendor. Inclue a column specifying the PO Number(s) 
        //   in which the items appear, with counts (e.g. PO123 (5)).

        // Sum up item quantities for all the label items and create a parallel dict of vendor > item > quantity
        let labelSearchSummary = {};

        // We have to do more work to summarize the label results by itemid because the results
        //   by default group by lot number rather than itemid.
        // We do this work here so that we can use the same saved search that we use for all other label generation. 

        // First, we need to build a dict of line item counts. The saved search returns lines with duplicate item counts because
        //   it's showing detail by lot number. 
        let lineCounts = {};
        let labelSsLineUniqueKeyHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.TransLineUniqueKey.nsSsFieldId;
        let labelSsItemIdHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.ItemInternalId.nsSsFieldId;
        let labelSsLineQtyHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.SOLineQuantity.nsSsFieldId;
        let labelSsVendorNameHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.PreferredVendor.nsSsFieldId;
        let labelSsItemDisplayNameHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.ItemName.nsSsFieldId;
        let labelSsItemNameHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.ItemId.nsSsFieldId;


        for (let labelSearchLine of soShipLabelSearchResults.data) {
            let lineUniqueKey = labelSearchLine[labelSsLineUniqueKeyHeader];
            let itemId = labelSearchLine[labelSsItemIdHeader];
            let lineQty = labelSearchLine[labelSsLineQtyHeader];
            let vendorName = labelSearchLine[labelSsVendorNameHeader];
            let itemDisplayName = labelSearchLine[labelSsItemDisplayNameHeader];
            let itemName = labelSearchLine[labelSsItemNameHeader];


            // Take the first instance of the unique line key / line qty combo
            if (!(lineUniqueKey in lineCounts)) {
                lineQty = lineQty ? lineQty : 0;

                lineCounts[lineUniqueKey] = {
                    lineQty: lineQty,
                    itemId: itemId,
                    vendorName: vendorName,
                    itemDisplayName: itemDisplayName,
                    itemName: itemName
                }
            }
        }


        // Now we have the summarized item totals. 
        //   Add them into our label item summary dict
        // let labelSearchQuantityHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.SOLineQuantity.nsSsFieldId;

        for (let lineCount of Object.values(lineCounts)) {
            let itemId = lineCount.itemId;
            let vendorName = lineCount.vendorName;
            let lineQty = Number(lineCount.lineQty);


            if (!(vendorName in labelSearchSummary)) { labelSearchSummary[vendorName] = {}; }

            if (!(itemId in labelSearchSummary[vendorName])) {
                labelSearchSummary[vendorName][itemId] = {
                    quantity: lineQty,
                    visited: false,
                    vendorName: vendorName,
                    itemDisplayName: lineCount.itemDisplayName,
                    itemName: lineCount.itemName
                };
            }
            else { labelSearchSummary[vendorName][itemId][labelSsLineQtyHeader] += lineQty; }
        }


        // Build our ouptut tables (vendor > item > qty).
        //  These will display basic item info + 
        //    total quantity on POs
        //    breakdown of quantities per PO
        //    total quantity on labels
        //    highlight discrepancies between PO and label quantities

        let outputTables = {};
        let outputHeaders = [
            ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemid.label,
            ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemname.label,
            ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemdisplayname.label,
            ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorid.label,
            ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorname.label,
            'Quantity on Labels',
            'Quantity on POs',
            'Quantities per PO'
        ];

        for (let vendorName of Object.keys(poTransSearchResults)) {
            if (!(vendorName in outputTables)) { outputTables[vendorName] = []; }
            let vendorTable = [];

            let itemsInShipLabelResults = vendorName in labelSearchSummary ? labelSearchSummary[vendorName] : {};
            let vendorHasShipLabels = Object.keys(itemsInShipLabelResults).length > 0;

            // Add every PO query result line to the output table.
            //    Keep track of which items out of the label search results have been visited. 
            //    Once we're done with PO lines, add unvisited label search results. 


            // Start by adding all the results of the PO query 
            for (let poQueryResult of poTransSearchResults[vendorName]) {
                let itemId = poQueryResult[ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemid.fieldid];
                let itemName = poQueryResult[ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemname.fieldid];
                let qtyOnPos = poQueryResult[ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemquantity.fieldid];
                let itemDisplayName = poQueryResult[ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemdisplayname.fieldid];
                let vendorId = poQueryResult[ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorid.fieldid];
                let qtyPerPoDisplay = poQueryResult[ThisAppLib.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.qtyperpodisplay.fieldid];

                let shipLabelQty = 0;
                if (vendorHasShipLabels && itemId in itemsInShipLabelResults) {
                    shipLabelQty = itemsInShipLabelResults[itemId].quantity;
                    itemsInShipLabelResults[itemId].visited = true;
                }

                let outputRow = {
                    [outputHeaders[0]]: itemId,
                    [outputHeaders[1]]: itemName,
                    [outputHeaders[2]]: itemDisplayName,
                    [outputHeaders[3]]: vendorId,
                    [outputHeaders[4]]: vendorName,
                    [outputHeaders[5]]: shipLabelQty,
                    [outputHeaders[6]]: qtyOnPos,
                    [outputHeaders[7]]: qtyPerPoDisplay,
                };

                outputTables[vendorName].push(outputRow);
            }

            // Now add any label search results that weren't already added. 
            for (let itemId of Object.keys(itemsInShipLabelResults)) {
                if (!itemsInShipLabelResults[itemId].visited) {
                    let item = itemsInShipLabelResults[itemId];
                    let vendorName = item.vendorName;

                    let outputRow = {
                        [outputHeaders[0]]: itemId,
                        [outputHeaders[1]]: item.itemName,
                        [outputHeaders[2]]: item.itemDisplayName,
                        [outputHeaders[3]]: vendorInfo[vendorName],
                        [outputHeaders[4]]: vendorName,
                        [outputHeaders[5]]: item.quantity,
                        [outputHeaders[6]]: 0,              // Nothing on POs by definition
                        [outputHeaders[7]]: '',             // Nothing on POs by definition
                    };

                    outputTables[vendorName].push(outputRow);
                }
            }

        }

        // Build a function for styling <tr> elements to highlight rows where the PO and label quantities don't match.
        let highlightRowDiscrepancies = function (row) {
            let qtyOnLabels = Number(row[outputHeaders[5]]);
            let qtyOnPos = Number(row[outputHeaders[6]]);
            if (qtyOnLabels != qtyOnPos) {
                return 'background-color: #ffcccc;';
            }
            else { return ''; }
        };

        // We have our output tables. Write them to separate Field Groups within the assistant.
        for (let vendorName of Object.keys(outputTables).sort()) {
            var vendorComparisonTableHtml = FCLib.convertObjToHTMLTableStylized({
                fields: outputHeaders,
                data: outputTables[vendorName],
                trStyleFuncs: [highlightRowDiscrepancies]
            });

            let simplifiedVendorName = FCLib.condenseSimplifyString(vendorName)

            // Create a field group to hold this table
            let comparisonTableFieldGroup = assistant.addFieldGroup({
                id: 'custpage_comptable_field_group_' + simplifiedVendorName,
                label: vendorName
            });

            // Embed in an inlinehtml form field
            let comparisonTableHtmlField = assistant.addField({
                id: 'custpage_comptable_html_field_' + simplifiedVendorName,
                type: serverWidget.FieldType.INLINEHTML,
                label: vendorName,
                container: 'custpage_comptable_field_group_' + simplifiedVendorName
            });
            comparisonTableHtmlField.defaultValue = vendorComparisonTableHtml;
        }




        // If we got here, then we have at least one PO to send
        // Create a session folder to store data to be passed to PO sending script
        let labelJsonFileIds = {};
        // let vendorNameHeader = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.PreferredVendor.nsSsFieldId;

        let sessionFolderId = ThisAppLib.createSessionSubfolder(context);

        // Split label search results by vendor ID. Save one set of the label search results per vendor ID to a JSON file.
        // We need to capture 100% of the data from the original search results, so we can't use the summary object.
        //    Plan: Send one email per vendor and include 1 to many POs in each email. 
        //          Include a single label file for the combined items. 
        //    FIX: The above assumes a 1-1 relationship between item and vendor. 

        let labelsFullDataByVendorName = FCLib.createNestedDictFromObjArray(
            soShipLabelSearchResults.data,
            [labelSsVendorNameHeader],
        );

        for (let vendorName of Object.keys(labelsFullDataByVendorName)) {
            let vendorId = vendorInfo[vendorName];

            let vendorLabelSearchResultsFileId = FCLib.writeFileToFileCabinet(
                'json',
                `labelSearchResults_${vendorId}.json`,
                JSON.stringify(labelsFullDataByVendorName[vendorName]),
                sessionFolderId,
            );

            labelJsonFileIds[vendorId] = vendorLabelSearchResultsFileId;
        }

        var persistentParams = {
            [ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL]: poIdsSelected,
            [ThisAppLib.Settings.Ui.Parameters.LABEL_JSON_FILE_IDS]: labelJsonFileIds,
        };

        FCLib.addPersistentParamsField(assistant, persistentParams);

    }


    function writeResult(context, assistant) {
        var persistentParams = FCLib.getPersistentParams(context);

        // let poIdsSelected = persistentParams[ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL].split(',');
        // let labelJsonFileIds = JSON.parse(persistentParams[ThisAppLib.Settings.Ui.Parameters.LABEL_JSON_FILE_IDS]);

        let poIdsSelected = persistentParams[ThisAppLib.Settings.Ui.Parameters.SELECT_PO_IDS_FINAL];
        let labelJsonFileIds = persistentParams[ThisAppLib.Settings.Ui.Parameters.LABEL_JSON_FILE_IDS];

        let outHtml = '';


        let debugHtml = `POs submitted for sending: ${poIdsSelected}<br><br>`;
        debugHtml += `Label JSON file IDs: ${JSON.stringify(labelJsonFileIds)}<br><br>`;

        // (As of 2023.03.28) Simple logic, to be improved later:
        //   If we've gotten here, we can assume: 
        //      - Single PO selected (initial PO field is a SELECT, not MULTISELECT)
        //      - PO has been confirmed (otherwise, we would have gone back to the PO selection screen)
        //      - PO has been confirmed to have the same item quantities as the JIT labels (otherwise, we would have gone back to the PO selection screen)

        // Get script ID info from Bulk Email library
        let bulkEmailMrScriptId = FCBulkEmailProcessLib.Ids.Scripts.FC_BULK_EMAIL_JIT_POS_MR;
        let bulkEmailMrDeploymentId = FCBulkEmailProcessLib.Ids.Deployments.FC_BULK_EMAIL_JIT_POS_MR;

        // Get parameter names from Bulk Email library
        let paramPoExternalIds = FCBulkEmailProcessLib.Ids.Parameters.POS_TO_EMAIL_EXTERNAL_IDS;
        let paramPoInternalIds = FCBulkEmailProcessLib.Ids.Parameters.POS_TO_EMAIL_INTERNAL_IDS;
        let paramShippingLabelJsonIds = FCBulkEmailProcessLib.Ids.Parameters.SHIPPING_LABEL_JSON_FILE_IDS;
        let paramSessionOutputFolderId = FCBulkEmailProcessLib.Ids.Parameters.SESSION_OUTPUT_FOLDER_ID;


        let jitPoSendTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: bulkEmailMrScriptId,
            deploymentId: bulkEmailMrDeploymentId,
            params: {
                [paramPoInternalIds]: JSON.stringify(poIdsSelected),
                [paramShippingLabelJsonIds]: JSON.stringify(labelJsonFileIds),
            }
        });

        let jitPoSendTaskId = jitPoSendTask.submit();

        // Write confirmation message to page
        outHtml += `
            <h1>JIT Email Sending Triggered</h1>
            <p>POs have been sent to JIT vendors. PO IDs: ${poIdsSelected}</p>
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
                    let lookupVal = queryRow[fieldDef.UnsentPoQuerySource.fieldid];
                    if ((lookupVal !== null) && (lookupVal !== undefined) && (lookupVal != '')) {
                        fieldVal = lookupVal;

                        if ('TypeFunc' in fieldDef) { fieldVal = fieldDef.TypeFunc(fieldVal); }

                    }
                }

                formattedRow[fieldLabel] = fieldVal;

                // if ((fieldVal !== null) && (fieldVal !== undefined) && (fieldVal != '')) {
                //     if ('TypeFunc' in fieldDef) { fieldVal = fieldDef.TypeFunc(fieldVal); }

                //     formattedRow[fieldLabel] = fieldVal;
                //     // sublist.setSublistValue({
                //     //     id: fieldId,
                //     //     line: i,
                //     //     value: fieldVal,
                //     // });
                // }
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

