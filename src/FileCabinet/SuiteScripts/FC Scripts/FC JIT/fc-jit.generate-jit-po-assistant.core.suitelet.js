/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var modulePathJitPoUtilityLibrary = './fc-jit.generate-jit-po-assistant.library.module.js';



var
    file,
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


define(['N/file', 'N/log', 'N/query', 'N/record', 'N/render', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/fc-main.library.module.js', modulePathJitPoUtilityLibrary, '../Libraries/papaparse.min.js'], main);


function main(fileModule, logModule, queryModule, recordModule, renderModule, runtimeModule, serverWidgetModule, urlModule, fcLibModule, jitPoLibModule, papaparseModule) {
    file = fileModule;
    log = logModule;
    query = queryModule;
    record = recordModule;
    render = renderModule;
    runtime = runtimeModule;
    serverWidget = serverWidgetModule;
    url = urlModule;
    FCLib = fcLibModule;
    ThisAppLib = jitPoLibModule;
    Papa = papaparseModule;

    return {

        onRequest: function (context) {
            scriptURL = url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, returnExternalURL: false });

            var assistant = serverWidget.createAssistant({
                title: 'JIT PO Creation Assistant',
                hideNavBar: false
            });

            var stepSelectOptions = assistant.addStep({
                id: 'custpage_step_select_options',
                label: 'Select Options',
            });

            var stepInitialEdit = assistant.addStep({
                id: 'custpage_step_initial_edit',
                label: 'Initial Edit',
            });

            var stepFinalReview = assistant.addStep({
                id: 'custpage_step_final_review',
                label: 'Final Review'
            });

            assistant.isNotOrdered = false;

            var steps = [
                null,
                stepSelectOptions,
                stepInitialEdit,
                stepFinalReview,
                null
            ];

            var stepWriteFunc = [
                writeCancel,
                writeStep1SelectOptions,
                writeStep2InitialEdit,
                writeStep3FinalReview,
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
        var allParams = JSON.stringify(context.request.parameters);

        // Get current date
        var today = new Date();
        var poDueDate = FCLib.addDaysToDate(
            today,
            ThisAppLib.Settings.Ui.Main.DEFAULT_PO_DUE_DATE_DAYS_FROM_TODAY
        );

        var capturePODeliveryDueDate = assistant.addField({
            id: ThisAppLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: ThisAppLib.Settings.Ui.Fields.CAPTURE_PO_DELIVERY_DUE_DATE_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });

        capturePODeliveryDueDate.isMandatory = true;
        capturePODeliveryDueDate.defaultValue = poDueDate;

        var captureSosStartDate = assistant.addField({
            id: ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: ThisAppLib.Settings.Ui.Fields.CAPTURE_SOS_START_DATE_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });

        // Set default value to today
        // captureSosStartDate.defaultValue = today;

        var captureSosEndDate = assistant.addField({
            id: ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: ThisAppLib.Settings.Ui.Fields.CAPTURE_SOS_END_DATE_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });

        // Add a checkbox to switch on/off Subtract Future JIT SOs from Remaining JIT Qty
        var sendAllPosByDefault = assistant.addField({
            id: ThisAppLib.Settings.Ui.Parameters.ENABLE_SEND_ALL_POS_BY_DEFAULT_ID,
            type: serverWidget.FieldType.CHECKBOX,
            label: ThisAppLib.Settings.Ui.Fields.ENABLE_SEND_ALL_POS_BY_DEFAULT_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });
        sendAllPosByDefault.defaultValue = 'T';

    }

    function writeStep2InitialEdit(context, assistant) {
        // Get date parameters
        var persistentParams = {
            [ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID]: context.request.parameters[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            [ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID]: context.request.parameters[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID],
            [ThisAppLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID]: context.request.parameters[ThisAppLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID],
        };
        // var soStartDate = context.request.parameters[FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID];
        // var soEndDate = context.request.parameters[FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID];
        var sendAllPosByDefault = context.request.parameters[ThisAppLib.Settings.Ui.Parameters.ENABLE_SEND_ALL_POS_BY_DEFAULT_ID];
        

        var jitSOItemQueryResults = runFutureSOItemQuery(
            ['vendorentityid'],
            persistentParams[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            persistentParams[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID]
        );

        // DEBUG: Add a text field to the assistant to display query text
        var queryText = assistant.addField({
            id: 'custpage_query_text',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Query Text',
        });
        // queryText.defaultValue = '<pre>' + jitSOItemQueryResults + '</pre>\n';
        // return;


        // Build HTML tables to display the results
        var queryFieldLookup = ThisAppLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1;
        var queryFieldIds = Object.keys(queryFieldLookup);
        var displayHeaderLookup = Object.keys(queryFieldLookup).reduce(
            (acc, key) => {
                acc[key] = queryFieldLookup[key].display;
                return acc;
            }, {});

        // var draftPOHtml = '';
        if (jitSOItemQueryResults) {
            // let keys = Object.keys(jitSOItemQueryResults).sort();
            let vendorEntityIds = Object.keys(jitSOItemQueryResults);

            // draftPOHtml += '<pre>Keys:' + vendorEntityIds + '</pre>\n';

            for (const vendorEntityId of vendorEntityIds) {
                let vendorHtml = '';
                // draftPOHtml += '<pre>Vendor in table-building loop:' + vendorEntityId + '</pre>\n';

                const vendorId = jitSOItemQueryResults[vendorEntityId][0].vendorid;    //FIX: Need to get these variables to settings

                // Build checkbox to enable/disable PO creation 
                let poCreateCheckboxId = ThisAppLib.Settings.Ui.DynamicParameters.CREATE_PO_CHECKBOX_ID.build(vendorId);
                let poCreateChecked = 'checked';
                let poCreateCheckboxField = `
                    <input type="checkbox" id="${poCreateCheckboxId}" name="${poCreateCheckboxId}" ${poCreateChecked} />
                    <label for="${poCreateCheckboxId}">Create PO?</label>
                    `;

                // Build checkbox to enable/disable PO emailing
                let poEmailCheckboxId = ThisAppLib.Settings.Ui.DynamicParameters.EMAIL_PO_CHECKBOX_ID.build(vendorId);
                let poEmailChecked = sendAllPosByDefault ? 'checked' : '';
                let poEmailCheckboxField = `
                    <input type="checkbox" name="${poEmailCheckboxId}" ${poEmailChecked} />
                    <label for="${poEmailCheckboxId}">Email PO After Created?</label>
                    `;

                // Build long text memo field for this PO
                let memoId = ThisAppLib.Settings.Ui.DynamicParameters.PO_MEMO_FIELD_ID.build(vendorId);
                let memoField = `<input type="text" name="${memoId}" placeholder="Include a memo to the vendor" />`;

                // Build specifications for final item qty textbox to inject into table
                let itemQtyInputSpecs = {
                    htmlElem: 'input',
                    type: 'number',
                    valueSourceField: 'totalbackordered',
                    fieldDisplayName: 'Final PO Qty',
                    idPrefixPart1Str: ThisAppLib.Settings.Ui.DynamicParameters.ITEM_FINAL_QTY_FIELD_ID.build('', ''),
                    idPrefixPart2Str: vendorId,
                    idUniqueSuffixSourceField: 'itemid',
                };

                let thisHTMLTable = FCLib.convertObjToHTMLTableStylized({
                    fields: queryFieldIds,
                    data: jitSOItemQueryResults[vendorEntityId],
                    specialElems: [
                        itemQtyInputSpecs
                    ],
                    headerNameMap: displayHeaderLookup,          // FIX: We don't need this + fields, just a single lookup object
                });

                // Put it all together into a chunk of html representing this vendor
                vendorHtml = `${poCreateCheckboxField}<br>${poEmailCheckboxField}<br>${memoField}<br>${thisHTMLTable}`;

                // Build a Field Group to hold the data specific to this vendor
                let fieldGroupId = `custpage_fg_${vendorId}`;
                let fieldGroupLabel = `Vendor: ${vendorEntityId}`;
                let fieldGroup = assistant.addFieldGroup({
                    id: fieldGroupId,
                    label: fieldGroupLabel
                });

                // Build an inlinehtml field to hold the html, and assign it to the field group
                let fieldId = `custpage_html_${vendorId}`;
                let fieldLabel = `Vendor: ${vendorEntityId}`;
                let field = assistant.addField({
                    id: fieldId,
                    type: serverWidget.FieldType.INLINEHTML,
                    label: fieldLabel,
                    container: fieldGroupId
                });
                field.defaultValue = vendorHtml;

            }
        }


        // Add a hidden field to hold persistentParams to be passed to next step
        FCLib.addPersistentParamsField(assistant, persistentParams);

        // // Add a hidden field to hold persistentParams
        // let hiddenPersistentParamsField = assistant.addField({
        //     id: FCJITLib.Settings.Ui.Parameters.HIDDEN_PERSISTENT_PARAMS_ID,
        //     type: serverWidget.FieldType.LONGTEXT,
        //     label: FCJITLib.Settings.Ui.Fields.HIDDEN_PERSISTENT_PARAMS_LABEL,
        // });
        // hiddenPersistentParamsField.updateDisplayType({
        //     displayType: serverWidget.FieldDisplayType.HIDDEN
        // });

        // hiddenPersistentParamsField.defaultValue = JSON.stringify(persistentParams);


        // TEMP: Debug data field
        // Create a field group first
        let debugFieldGroup = assistant.addFieldGroup({
            id: 'custpage_fg_debug',
            label: 'Debug'
        });

        let debugPODataField = assistant.addField({
            id: `custpage_debugfield1`,
            type: serverWidget.FieldType.INLINEHTML,
            label: `Debug`,
            container: `custpage_fg_debug`
        });



        let debugPOHtml = '';
        // DEBUG: include parameters, query text, query results, display field lookup, display fields on separate lines
        debugPOHtml += '<pre>' + JSON.stringify(context.request.parameters, null, 2) + '</pre>\n\n';
        // debugPOHtml += '<pre>' + queryText + '</pre>\n\n';
        debugPOHtml += '<pre>' + JSON.stringify(jitSOItemQueryResults, null, 2) + '</pre>\n\n';
        debugPOHtml += '<pre>' + JSON.stringify(queryFieldLookup, null, 2) + '</pre>\n\n';
        debugPOHtml += '<pre>' + JSON.stringify(queryFieldIds, null, 2) + '</pre>\n\n';
        debugPODataField.defaultValue = debugPOHtml;

        // Write the results to the context response
        // context.response.writePage(assistant);
    }

    function writeStep3FinalReview(context, assistant) {
        var allParams = JSON.stringify(context.request.parameters);
        var persistentParams = FCLib.getPersistentParams(context);


        // Build dict of POs to create by examining all parameters:
        //   Vendor > 
        //     PO memo
        //     Item > Qty

        // var vendorFinalItemQty = {};
        var vendorMemos = {};

        // SCRAP
        // var originalQueryResults = JSON.parse(context.request.parameters.custparam_origquerydata);

        // INSTEAD
        // Rerun query to get up-to-date item data

        var jitSOItemQueryResults = runFutureSOItemQuery(
            ['vendorid', 'itemid'],
            persistentParams[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            persistentParams[ThisAppLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID],
            persistentParams[ThisAppLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID],
        );


        // Build lookup data for parameters
        let finalItemQuantities = {};
        let vendorsToInclude = {};
        let vendorsToExclude = {};
        let vendorsToEmail = {};

        let fieldPrefixItemQty = ThisAppLib.Settings.Ui.DynamicParameters.ITEM_FINAL_QTY_FIELD_ID.build('', '');
        let fieldPrefixCreatePO = ThisAppLib.Settings.Ui.DynamicParameters.CREATE_PO_CHECKBOX_ID.build('');
        let fieldPrefixEmailPO = ThisAppLib.Settings.Ui.DynamicParameters.EMAIL_PO_CHECKBOX_ID.build('');
        let fieldPrefixMemo = ThisAppLib.Settings.Ui.DynamicParameters.PO_MEMO_FIELD_ID.build('');

        for (const [paramName, paramVal] of Object.entries(context.request.parameters)) {
            if (paramName.startsWith(fieldPrefixItemQty)) {
                // Get the vendor id and item id from the param name
                let parsed = ThisAppLib.Settings.Ui.DynamicParameters.ITEM_FINAL_QTY_FIELD_ID.parse(paramName);
                let vendorId = parsed.vendorId;
                let itemId = parsed.itemId;

                if (!finalItemQuantities[vendorId]) { finalItemQuantities[vendorId] = {}; }
                finalItemQuantities[vendorId][itemId] = paramVal;
            }
            else if (paramName.startsWith(fieldPrefixCreatePO)) {
                let vendorId = ThisAppLib.Settings.Ui.DynamicParameters.CREATE_PO_CHECKBOX_ID.parse(paramName)[1];

                if (paramVal == 'on' || FCLib.looksLikeYes(paramVal)) {
                    vendorsToInclude[vendorId] = true;
                }
                else {
                    vendorsToExclude[vendorId] = false;
                }
            }
            else if (paramName.startsWith(fieldPrefixEmailPO)) {
                let vendorId = ThisAppLib.Settings.Ui.DynamicParameters.EMAIL_PO_CHECKBOX_ID.parse(paramName)[1];

                if (paramVal === 'on' || FCLib.looksLikeYes(paramVal)) {
                    vendorsToEmail[vendorId] = true;
                }
                else {
                    vendorsToEmail[vendorId] = false;
                }
            }
            else if (paramName.startsWith(fieldPrefixMemo)) {
                let vendorId = ThisAppLib.Settings.Ui.DynamicParameters.PO_MEMO_FIELD_ID.parse(paramName)[1];

                vendorMemos[vendorId] = paramVal;
            }
        }

        // FIX: Update this logic to present a nice table
        let newOutputFields = ThisAppLib.Settings.PoImportCsv.NewOutputFields;

        let tempFieldSet1Keys = Object.keys(ThisAppLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1);

        let ouputFieldsFromOrigQuery = Object.keys(ThisAppLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1).reduce(
            (acc, key) => {
                let fieldInfo = ThisAppLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1[key];
                // if (ThisAppLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1[fieldid].includeInCsv)
                if (fieldInfo.includeInCsv)
                    acc[key] = fieldInfo.display;
                return acc;
            },
            {}
        );

        //     // 'vendorid',
        //     'vendorentityid',
        //     'itemid',
        //     'itemdisplayname',
        // ];

        let outputFieldHeaders = [
            ...Object.values(newOutputFields),
            ...Object.values(ouputFieldsFromOrigQuery)
        ];

        var poDataAccepted = {
            fields: outputFieldHeaders,
            data: []
        };

        var poDataRejected = {
            fields: outputFieldHeaders,
            data: []
        };


        let preformattedPODeliveryDate_1 = FCLib.getStandardDateString1(
            persistentParams[ThisAppLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID]
        );

        // Create a lot number for these JIT POs. Lot number is based on PO delivery date
        let lotPrefix = ThisAppLib.Settings.PurchaseOrder.GENERATE_LOT_NUMBER(preformattedPODeliveryDate_1);
        let lotNumber = getNextAvailableLotNumber(lotPrefix);
        let poSequenceCounter = 1;

        // Build PO data for display
        //    Accepted POs/items
        //        Vendor
        //    Rejected POs/items
        //        Vendor   
        for (let vendorId in finalItemQuantities) {
            let poExternalId = generatePOExternalId({
                vendorId: vendorId,
                preformattedDate: preformattedPODeliveryDate_1,
            });

            for (let itemId in finalItemQuantities[vendorId]) {
                let finalItemQty = finalItemQuantities[vendorId][itemId];

                // Build the row of data fields
                // Two parts: 
                //    1) Our "new" fields
                //    2) Fields from the original query that we opted to include in the output (set in library file)

                // First, build a key/value pair for each of our new fields
                let newFieldValues = {
                    [newOutputFields.finalQty]: finalItemQty,
                    [newOutputFields.lotNumber]: lotNumber,
                    [newOutputFields.lotQuantity]: finalItemQty,
                    [newOutputFields.memo]: vendorMemos[vendorId],
                    [newOutputFields.poExternalId]: poExternalId,
                    [newOutputFields.poSequenceNumber]: poSequenceCounter,
                    // FIX: Do I need to format this date somehow?
                    [newOutputFields.receiveByDate]: persistentParams[ThisAppLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID],
                    // [newOutputFields.emailOnceCreated]: vendorsToEmail[vendorId] ? 'Yes' : 'No',
                };

                //NOTE/FIX?: Assuming that the query is structured such that vendorId > itemId is always unique
                let origFieldValues = Object.keys(ouputFieldsFromOrigQuery).reduce(
                    (acc, key) => {
                        acc[ouputFieldsFromOrigQuery[key]] = jitSOItemQueryResults[vendorId][itemId][0][key];
                        return acc;
                    },
                    {}
                );


                let row = { ...newFieldValues, ...origFieldValues };

                // If the final item qty is > 0 AND the vendor is included, add to accepted POs
                // Otherwise, add to rejected POs
                if (finalItemQty > 0 && vendorsToInclude[vendorId]) {
                    poDataAccepted.data.push(row);
                } else {
                    poDataRejected.data.push(row);
                };

            }
            poSequenceCounter++;

        }

        // Sort the accepted and rejected data by item id
        poDataAccepted.data = FCLib.sortArrayOfObjsByKey(
            poDataAccepted.data,
            'itemid'
        );
        poDataRejected.data = FCLib.sortArrayOfObjsByKey(
            poDataRejected.data,
            'itemid'
        );


        // Write PO accepted + rejected data to JSON files in _TEMPCACHE to pass to next stage
        // FIX: First create a timestamped session folder in the _TEMPCACHE directory to store all these jsons


        const poAcceptedCacheJsonFilename = FCLib.generateTimestampedFilename(
            ThisAppLib.Settings.JIT_PO_ACCEPTEDPOS_TEMPJSON_FILENAME_PREFIX,
            '.json',
            new Date()
        );

        const poRejectedCacheJsonFilename = FCLib.generateTimestampedFilename(
            ThisAppLib.Settings.JIT_PO_REJECTEDPOS_TEMPJSON_FILENAME_PREFIX,
            '.json',
            new Date()
        );

        const poAcceptedCacheFileId = FCLib.writeFileToFileCabinet(
            'json',
            poAcceptedCacheJsonFilename,
            JSON.stringify(poDataAccepted),
            FCLib.Ids.Folders.MAIN_TEMP_CACHE_FOLDER
        );

        const poRejectedCacheFileId = FCLib.writeFileToFileCabinet(
            'json',
            poRejectedCacheJsonFilename,
            JSON.stringify(poDataRejected),
            FCLib.Ids.Folders.MAIN_TEMP_CACHE_FOLDER
        );

        // Add the file ids to the persistent params
        persistentParams[ThisAppLib.Settings.Ui.Parameters.JIT_PO_ACCEPTEDPOS_TEMPJSON_FILE_ID] = poAcceptedCacheFileId;
        persistentParams[ThisAppLib.Settings.Ui.Parameters.JIT_PO_REJECTEDPOS_TEMPJSON_FILE_ID] = poRejectedCacheFileId;


        // Build display of final include/exclude summary, along with changes from the original? 
        // Build a field group for POs accepted + POs rejected
        var poAcceptedFieldGroup = assistant.addFieldGroup({
            id: ThisAppLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_ID,
            label: ThisAppLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_LABEL
        });

        var poRejectedFieldGroup = assistant.addFieldGroup({
            id: ThisAppLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_REJECTED_FIELD_GROUP_ID,
            label: ThisAppLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_REJECTED_FIELD_GROUP_LABEL
        });


        // Add a field to display the POs accepted
        var posAcceptedDataField = assistant.addField({
            id: ThisAppLib.Settings.Ui.Fields.FINALREVIEW_POS_ACCEPTED_FIELD_ID,
            type: serverWidget.FieldType.INLINEHTML,
            label: ThisAppLib.Settings.Ui.Fields.FINALREVIEW_POS_ACCEPTED_FIELD_LABEL,
            container: ThisAppLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_ID,
        });

        posAcceptedDataField.updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
        });
        posAcceptedDataField.updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTCOL
        });

        // Add a field to display the POs rejected
        var posRejectedDataField = assistant.addField({
            id: ThisAppLib.Settings.Ui.Fields.FINALREVIEW_POS_REJECTED_FIELD_ID,
            type: serverWidget.FieldType.INLINEHTML,
            label: ThisAppLib.Settings.Ui.Fields.FINALREVIEW_POS_REJECTED_FIELD_LABEL,
            container: ThisAppLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_REJECTED_FIELD_GROUP_ID,
        });
        posRejectedDataField.updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
        });
        posRejectedDataField.updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTCOL
        });


        // FIX
        // Build HTML tables for the POs accepted and rejected
        var posAcceptedHtml = FCLib.convertObjToHTMLTableStylized({
            fields: poDataAccepted.fields,
            data: poDataAccepted.data,
        });
        var posRejectedHtml = FCLib.convertObjToHTMLTableStylized({
            fields: poDataRejected.fields,
            data: poDataRejected.data,
            headerBGColor: '#c23041',
        });

        // Add the Accepted and Rejected HTML to their respective fields
        posAcceptedDataField.defaultValue = posAcceptedHtml ? posAcceptedHtml : 'No POs accepted';
        posRejectedDataField.defaultValue = posRejectedHtml ? posRejectedHtml : 'No POs rejected';


        // Build a reverse lookup table for the CSV headers > NS field id, and pass it to next step
        //   The map/reduce script that builds the POs will use this to map the CSV headers to NS, just like
        //    in the CSV import tool.
        // let newFieldsReverseLookup = Object.keys(newOutputFields).reduce(
        //     (acc, key) => {
        //         acc[newOutputFields[key]] = key;
        //         return acc;
        //     },
        //     {}
        // );

        // let origFieldsReverseLookup = Object.keys(ouputFieldsFromOrigQuery).reduce(
        //     (acc, key) => {
        //         acc[ouputFieldsFromOrigQuery[key]] = key;
        //         return acc;
        //     }
        // )

        // persistentParams[ThisAppLib.Ids.Parameters.PO_CSV_HEADER_TO_NS_REVERSE_LOOKUP_JSON] =
        //     JSON.stringify(
        //         { ...newFieldsReverseLookup, ...origFieldsReverseLookup }
        //     );

        // Add the persistent params to the assistant
        FCLib.addPersistentParamsField(assistant, persistentParams);

        // Create debug output on all variables
        // Create debug field
        let debugOut = '<br><br>';

        var debugField = assistant.addField({
            id: 'custpage_debug',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Debug'
        });

        debugOut += '<pre>' + allParams + '</pre>\n\n';
        // Add persistent params to output
        debugOut += 'persistentParams';
        debugOut += '<pre>' + JSON.stringify(persistentParams, null, 2) + '</pre>\n\n';
        // Add query results to output
        debugOut += 'jitSOItemQueryResults';
        debugOut += '<pre>' + JSON.stringify(jitSOItemQueryResults, null, 2) + '</pre>\n\n';
        debugOut += '<br>OutputFieldsFromOrigQuery';
        debugOut += '<pre>' + JSON.stringify(ouputFieldsFromOrigQuery, null, 2) + '</pre>\n\n';
        debugOut += '<br>VendorMemos';
        debugOut += '<pre>' + JSON.stringify(vendorMemos, null, 2) + '</pre>\n\n';
        debugOut += '<br>Final Item Quantities';
        debugOut += '<pre>' + JSON.stringify(finalItemQuantities, null, 2) + '</pre>\n\n';
        debugOut += '<br>Accepted POs';
        debugOut += '<pre>' + JSON.stringify(poDataAccepted, null, 2) + '</pre>\n\n';
        debugOut += '<br>Rejected POs';
        debugOut += '<pre>' + JSON.stringify(poDataRejected, null, 2) + '</pre>\n\n';


        debugField.defaultValue = debugOut;
        // context.response.write(htmlOut + '<br><br>' + debugOut);
    }

    function writeResult(context, assistant) {
        var persistentParams = FCLib.getPersistentParams(context);

        // Read in the accepted/rejected PO data from the cache JSON files
        let acceptedPoFileObj = file.load({
            id: persistentParams[ThisAppLib.Settings.Ui.Parameters.JIT_PO_ACCEPTEDPOS_TEMPJSON_FILE_ID]
        });
        let rejectedPoFileObj = file.load({
            id: persistentParams[ThisAppLib.Settings.Ui.Parameters.JIT_PO_REJECTEDPOS_TEMPJSON_FILE_ID]
        });

        let acceptedPoData = JSON.parse(acceptedPoFileObj.getContents());
        let rejectedPoData = JSON.parse(rejectedPoFileObj.getContents());


        // // DEBUG: Write out accepted/rejected PO data to html
        // let htmlOut = '';
        // htmlOut += '<br>Accepted POs';
        // htmlOut += '<pre>' + JSON.stringify(acceptedPoData, null, 2) + '</pre>\n\n';
        // htmlOut += '<br>Rejected POs';
        // htmlOut += '<pre>' + JSON.stringify(rejectedPoData, null, 2) + '</pre>\n\n';
        // return htmlOut;

        // Create session folder to store accepted/rejected PO data
        let sessionFolderId = createSessionSubfolder(context);

        // Create CSV file of accepted POs > session folder
        const curDateTimeStr = FCLib.getStandardDateTimeString1(new Date());
        let poAcceptedCsvFilename =
            ThisAppLib.Settings.JIT_PO_ACCEPTEDPOS_CSV_FILENAME_PREFIX +
            curDateTimeStr +
            '.csv';

        let poAcceptedCsvContent = Papa.unparse({
            fields: acceptedPoData.fields,
            data: acceptedPoData.data,
            quotes: true,
        });

        var acceptedPoCsvFileId = FCLib.writeFileToFileCabinet(
            'csv',
            poAcceptedCsvFilename,
            poAcceptedCsvContent,
            sessionFolderId
        );

        // Create CSV file of rejected POs > session folder
        let poRejectedCsvFilename =
            ThisAppLib.Settings.JIT_PO_REJECTEDPOS_CSV_FILENAME_PREFIX +
            curDateTimeStr +
            '.csv';

        let poRejectedCsvContent = Papa.unparse({
            fields: rejectedPoData.fields,
            data: rejectedPoData.data,
            quotes: true,
        });

        var rejectedPoCsvFileId = FCLib.writeFileToFileCabinet(
            'csv',
            poRejectedCsvFilename,
            poRejectedCsvContent,
            sessionFolderId
        );

        let mrParams = {
            [ThisAppLib.Ids.Parameters.JIT_PO_IMPORT_CSV_FILEID]: acceptedPoCsvFileId,
            // [ThisAppLib.Ids.Parameters.PO_CSV_HEADER_TO_NS_REVERSE_LOOKUP_JSON]: csv,
            // 'custscript_csv_fileid': itemUpdateCSVId,
            // [FCUpdateJITAvailLib.Ids.Parameters.SUBTRACT_FUTURE_SOS_ON_UPDATE]: subtractFutureJITSOs
        };

        let mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: ThisAppLib.Ids.Scripts.JIT_CREATE_POS_HELPER_MAPREDUCE,
            deploymentId: ThisAppLib.Ids.Deployments.JIT_CREATE_POS_HELPER_MAPREDUCE,
            params: mrParams
        });

        // Submit the map/reduce task
        let mrTaskId = mrTask.submit();
        return mrTaskId;


        // var ssScriptTask = task.create({ 
        //     taskType: task.TaskType.SCHEDULED_SCRIPT,
        //     parameters: {
        //         [ThisAppLib.Ids.Parameters.JIT_PO_IMPORT_CSV_FILEID]: acceptedPoCsvFileId,
        //     }
        // }); 

        // ssScriptTask.scriptId = ThisAppLib.Ids.Scripts.JIT_PO_IMPORT_ASSISTANT_SCHEDULEDSCRIPT_HELPER_SCRIPTID;
        // ssScriptTask.deploymentId = ThisAppLib.Ids.Deployments.JIT_PO_IMPORT_ASSISTANT_SCHEDULEDSCRIPT_HELPER_DEPLOYMENTID;

        // // Initiate n/task CSV Import using accepted POs CSV file
        // let csvImportTask = task.create({
        //     taskType: task.TaskType.CSV_IMPORT,
        //     // FIX: Add pointer to CSV import
        // });
        // csvImportTask.mappingId = ThisAppLib.Ids.CSVImportMappings.JIT_PO_IMPORT_ASSISTANT_CSVIMPORT;
        // csvImportTask.importFile = f.load({ id: acceptedPoCsvFileId });

        // if (false) { // FIX: Test whether any of the POs were marked as To Send
        //     // Set dependent task: send POs (MR script) using list of POs marked To Send from persistentParams
        //     let poSendTask = task.create({
        //         taskType: task.TaskType.MAP_REDUCE,
        //         scriptId: ThisAppLib.Ids.Scripts.EMAIL_JIT_POS,
        //         deploymentId: ThisAppLib.Ids.Deployments.EMAIL_JIT_POS,
        //         parameters: {
        //             // FIX: Add in PO IDs to send
        //         }
        //     });

        //     csvImportTask.addInboundDependency(poSendTask);
        // }

        // csvImportTask.submit();

        // var scheduledScriptTaskId = ssScriptTask.submit();





        return '<h3>DEBUG: Launching CSV import to create new POs!</h3>';


    }

    function writeCancel(context, assistant) {
        return `You cancelled the JIT PO Import Assistant. Please revisit the URL to restart.`;
    }


    function createSessionSubfolder(context, date = new Date()) {
        const curDateTimeStr = FCLib.getStandardDateTimeString1(date);
        // const curDateTime = new Date();
        // const curDateTimeStr = curDateTime.toISOString().replace(/:/g, '-');
        var resultsFolderName = ThisAppLib.Settings.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
        try {
            var resultsFolderId = FCLib.createFolderInFileCabinet(resultsFolderName, ThisAppLib.Ids.Folders.RESULTS);
        }
        catch (e) {
            throw e;
        }

        return resultsFolderId;
    }

    function runFutureSOItemQuery(nestingKeys, soStartDate = null, soEndDate = null) {
        // Run query to get JIT items on future SOs within the date range specified
        let queryText = ThisAppLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.Query;
        let extraFilters = '';

        // Replace the date parameters in the query
        if (soStartDate) {
            let startFilter = ThisAppLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.Filters.soStartDate;
            extraFilters += startFilter.replace('@@SO_START_DATE@@', soStartDate) + '\n';
        }

        if (soEndDate) {
            let endFilter = ThisAppLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.Filters.soEndDate;
            extraFilters += endFilter.replace('@@SO_END_DATE@@', soEndDate) + '\n';
        }

        // Add the filters to the query
        // FIX: Get thsis replacement string into settings
        queryText = queryText.replace('@@EXTRA_FILTERS@@', extraFilters);

        // // DEBUG
        // return queryText;

        // Use sqlSelectAllRowsIntoDict to get the results
        let queryResults = FCLib.sqlSelectAllRowsIntoNestedDict(
            queryText,
            nestingKeys              // FIX: Replace with setting variable?
        );

        return queryResults;
    }

    function getNextAvailableLotNumber(lotPrefix) {
        let matchingLotsQuery = runConflictingLotNumberQuery(['lotsuffix']);
        let existingSuffixes = new Set(Object.keys(matchingLotsQuery));
        let validSuffixes = ThisAppLib.Settings.PurchaseOrder.VALID_PO_SUFFIXES;

        // Get first valid suffix not present in existing suffixes set
        let nextSuffix = validSuffixes.find(suffix => !existingSuffixes.has(suffix));

        return `${lotPrefix}${nextSuffix}`;
    }

    function runConflictingLotNumberQuery(nestingKeys, lotPrefix = '*') {
        let queryText = ThisAppLib.Queries.GET_POTENTIAL_CONFLICTING_LOT_NUMBERS.Query;
        let lotPrefixParam = ThisAppLib.Queries.GET_POTENTIAL_CONFLICTING_LOT_NUMBERS.Parameters.LotPrefix;
        queryText = queryText.replace(lotPrefixParam, lotPrefix);
        let queryResults = FCLib.sqlSelectAllRowsIntoNestedDict(
            queryText,
            nestingKeys
        );
        return queryResults;
    }


    function generatePOExternalId({
        vendorId = 'vendorid',
        deliveryDueDate = '1/1/2000',
        preformattedDate = null
    } = {}) {
        let randNum = FCLib.generateRandomNumberXDigits(4);
        let theDate = preformattedDate ? preformattedDate : FCLib.getStandardDateString1(deliveryDueDate);
        return `JITPO_${vendorId}_${theDate}_${randNum}`;
    }
}