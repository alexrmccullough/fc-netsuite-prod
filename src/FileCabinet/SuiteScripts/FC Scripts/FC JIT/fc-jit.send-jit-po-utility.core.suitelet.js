/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var modulePathJitPoUtilityLibrary = './fc-jit.send-jit-po-utility.library.module.js';



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
    FCJITPoLib,
    Papa;
// assistant, 
// stepSelectOptions;


define(['N/file', 'N/https', 'N/log', 'N/ui/message', 'N/query', 'N/record', 'N/render', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/FC_MainLibrary', modulePathJitPoUtilityLibrary, '../Libraries/papaparse.min.js'], main);


function main(fileModule, httpsModule, logModule, messageModule, queryModule, recordModule, renderModule, runtimeModule, serverWidgetModule, urlModule, fcLibModule, jitPoLibModule, papaparseModule) {
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
    FCJITPoLib = jitPoLibModule;
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
            FCJITPoLib.Settings.Ui.Main.DEFAULT_PO_DUE_DATE_DAYS_FROM_TODAY
        );

        var capturePODeliveryDueDate = assistant.addField({
            id: FCJITPoLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: FCJITPoLib.Settings.Ui.Fields.CAPTURE_PO_DELIVERY_DUE_DATE_LABEL,
            // container: FCJITPoLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });

        capturePODeliveryDueDate.isMandatory = true;
        capturePODeliveryDueDate.defaultValue = poDueDate;

        var captureSosStartDate = assistant.addField({
            id: FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: FCJITPoLib.Settings.Ui.Fields.CAPTURE_SOS_START_DATE_LABEL,
            // container: FCJITPoLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });

        // Set default value to today
        // captureSosStartDate.defaultValue = today;

        var captureSosEndDate = assistant.addField({
            id: FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: FCJITPoLib.Settings.Ui.Fields.CAPTURE_SOS_END_DATE_LABEL,
            // container: FCJITPoLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });

        // Add a checkbox to switch on/off Subtract Future JIT SOs from Remaining JIT Qty
        var sendAllPosByDefault = assistant.addField({
            id: FCJITPoLib.Settings.Ui.Parameters.ENABLE_SEND_ALL_POS_BY_DEFAULT_ID,
            type: serverWidget.FieldType.CHECKBOX,
            label: FCJITPoLib.Settings.Ui.Fields.ENABLE_SEND_ALL_POS_BY_DEFAULT_LABEL,
            // container: FCJITPoLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });
        sendAllPosByDefault.defaultValue = 'T';

    }

    function writeStep2InitialEdit(context, assistant) {
        // Get date parameters
        var persistentParams = {
            [FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID]: context.request.parameters[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            [FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID]: context.request.parameters[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID],
            [FCJITPoLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID]: context.request.parameters[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID],
        };
        // var soStartDate = context.request.parameters[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID];
        // var soEndDate = context.request.parameters[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID];
        var sendAllPosByDefault = context.request.parameters[FCJITPoLib.Settings.Ui.Parameters.ENABLE_SEND_ALL_POS_BY_DEFAULT_ID];


        var jitSOItemQueryResults = runFutureSOItemQuery(
            ['vendorentityid'],
            persistentParams[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            persistentParams[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID]
        );

        // Build HTML tables to display the results
        var displayFieldLookup = FCJITPoLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1;
        var displayFieldIds = Object.keys(displayFieldLookup);

        // var draftPOHtml = '';
        if (jitSOItemQueryResults) {
            // let keys = Object.keys(jitSOItemQueryResults).sort();
            let vendorEntityIds = Object.keys(jitSOItemQueryResults);

            // draftPOHtml += '<pre>Keys:' + vendorEntityIds + '</pre>\n';

            for (const vendorEntityId of vendorEntityIds) {
                let vendorHtml = '';
                // draftPOHtml += '<pre>Vendor in table-building loop:' + vendorEntityId + '</pre>\n';

                const vendorId = jitSOItemQueryResults[vendorEntityId][0].vendorid;    //FIX: Need to get these variables to settings

                // Build checkbox to enable/disable PO creation + sending for this vendor
                let checkboxId = `custparam_cb_sendpo_${vendorId}`;
                let checked = sendAllPosByDefault ? 'checked' : '';
                let checkboxField = `<input type="checkbox" name="${checkboxId}" ${checked} />`;

                // Build long text memo field for this PO
                let memoId = `custparam_cb_memo_${vendorId}`;
                let memoField = `<input type="text" name="${memoId}" placeholder="Include a memo to the vendor" />`;

                // Build specifications for final item qty textbox to inject into table
                let itemQtyInputSpecs = {
                    htmlElem: 'input',
                    type: 'number',
                    // targetColumn: 'totalqty',
                    defaultValueField: 'totalqty',
                    idPrefixPart1Str: 'custparam_num_finalqty',
                    idPrefixPart2Str: vendorId,
                    idUniqueSuffixPart1Field: 'itemid',
                };

                let thisHTMLTable = FCLib.convertObjToHTMLTableStylized({
                    fields: displayFieldIds,
                    data: jitSOItemQueryResults[vendorEntityId],
                    specialElems: {
                        'totalqty': itemQtyInputSpecs
                    },
                });

                vendorHtml = checkboxField + memoField + thisHTMLTable;

                // Build a Field Group to hold the data specific to this vendor
                let fieldGroupId = `custpage_fg_${vendorId}`;
                let fieldGroupLabel = `Vendor: ${vendorEntityId}`;
                let fieldGroup = assistant.addFieldGroup({
                    id: fieldGroupId,
                    label: fieldGroupLabel
                });

                // Build an inlinehtml field to hold the html, and assign it to the field group
                let fieldId = `custpage_html_${vendorId}`;
                let fieldLabel = `Vendor: ${vendorId}`;
                let field = assistant.addField({
                    id: fieldId,
                    type: serverWidget.FieldType.INLINEHTML,
                    label: fieldLabel,
                    container: fieldGroupId
                });
                field.defaultValue = vendorHtml;

            }
        }


        addPersistentParamsField(assistant, persistentParams);

        // // Add a hidden field to hold persistentParams
        // let hiddenPersistentParamsField = assistant.addField({
        //     id: FCJITPoLib.Settings.Ui.Parameters.HIDDEN_PERSISTENT_PARAMS_ID,
        //     type: serverWidget.FieldType.LONGTEXT,
        //     label: FCJITPoLib.Settings.Ui.Fields.HIDDEN_PERSISTENT_PARAMS_LABEL,
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
        debugPOHtml += '<pre>' + JSON.stringify(displayFieldLookup, null, 2) + '</pre>\n\n';
        debugPOHtml += '<pre>' + JSON.stringify(displayFieldIds, null, 2) + '</pre>\n\n';
        debugPODataField.defaultValue = debugPOHtml;

        // Write the results to the context response
        // context.response.writePage(assistant);
    }

    function writeStep3FinalReview(context, assistant) {
        var allParams = JSON.stringify(context.request.parameters);
        var persistentParams = getPersistentParams(context);


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
            persistentParams[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            persistentParams[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID],
            persistentParams[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID],
        );


        // Build lookup data for parameters
        let finalItemQuantities = {};
        let vendorsToInclude = {};
        let vendorsToExclude = {};

        for (const [paramName, paramVal] of Object.entries(context.request.parameters)) {
            if (paramName.startsWith('custparam_num_finalqty')) {
                // Get the vendor id and item id from the param name
                let vendorId = paramName.split('_')[3];
                let itemId = paramName.split('_')[4];

                if (!finalItemQuantities[vendorId]) { finalItemQuantities[vendorId] = {}; }
                finalItemQuantities[vendorId][itemId] = paramVal;
            }
            else if (paramName.startsWith('custparam_cb_sendpo')) {
                let vendorId = paramName.split('_')[3];

                if (paramVal == 'on' || paramVal == 'T' || paramVal == 'true') {
                    vendorsToInclude[vendorId] = true;
                }
                else {
                    vendorsToExclude[vendorId] = true;
                }
            }
            else if (paramName.startsWith('custparam_cb_memo')) {
                let vendorId = paramName.split('_')[3];

                vendorMemos[vendorId] = paramVal;
            }
        }

        // FIX: Update this logic to present a nice table
        let newOutputFields = {
            finalQty: 'Final Item Qty',
            lotNumber: 'Receipt Lot Number',
            memo: 'PO Memo',
            poExternalId: 'PO External ID',
            poSequenceNumber: 'PO Sequence Counter',
            receiveByDate: 'Receive By Date'
        }
        let ouputFieldsFromOrigQuery = [
            // 'vendorid',
            'vendorentityid',
            'itemid',
            'itemdisplayname',
        ];

        let outputFields = [
            ...Object.values(newOutputFields),
            ...ouputFieldsFromOrigQuery
        ];

        var poDataAccepted = {
            fields: outputFields,
            data: []
        };

        var poDataRejected = {
            fields: outputFields,
            data: []
        };


        let preformattedPODeliveryDate_1 = FCLib.getStandardDateString1(
            persistentParams[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID]
        );

        // Create a lot number for these JIT POs. Lot number is based on PO delivery date
        let lotPrefix = `JIT${preformattedPODeliveryDate_1}`;
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
                // Get all values from jitSOItemQueryResults[vendorId][itemId] using array of keys specified in outputFieldsFromOrigQuery
                let row = {
                    [newOutputFields.finalQty]: finalItemQty,
                    [newOutputFields.lotNumber]: lotNumber,
                    [newOutputFields.memo]: vendorMemos[vendorId],
                    [newOutputFields.poExternalId]: poExternalId,
                    [newOutputFields.poSequenceNumber]: poSequenceCounter,
                    // FIX: Do I need to format this date somehow?
                    [newOutputFields.receiveByDate]: persistentParams[FCJITPoLib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID],

                    //NOTE/FIX?: Assuming that the query is structured such that vendorId > itemId is always unique
                    ...FCLib.pickFromObj(jitSOItemQueryResults[vendorId][itemId][0], ouputFieldsFromOrigQuery)
                };

                // If the final item qty is > 0 AND the vendor is included, add to accepted POs
                if (finalItemQty > 0 && vendorsToInclude[vendorId]) {
                    poDataAccepted.data.push(row);
                } else {
                    poDataRejected.data.push(row);
                };

            }
            poSequenceCounter++;

        }

        // Sort the accepted and rejected data by item id
        poDataAccepted.data = FCLib.sortArrayOfObjsByKey(poDataAccepted.data, 'itemid');
        poDataRejected.data = FCLib.sortArrayOfObjsByKey(poDataRejected.data, 'itemid');


        // Write PO accepted + rejected data to JSON files in _TEMPCACHE to pass to next stage
        // FIX: First create a timestamped session folder in the _TEMPCACHE directory to store all these jsons


        const poAcceptedCacheJsonFilename = FCLib.generateTimestampedFilename(
            FCJITPoLib.Settings.JIT_PO_ACCEPTEDPOS_TEMPJSON_FILENAME_PREFIX,
            '.json',
            new Date()
        );

        const poRejectedCacheJsonFilename = FCLib.generateTimestampedFilename(
            FCJITPoLib.Settings.JIT_PO_REJECTEDPOS_TEMPJSON_FILENAME_PREFIX,
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
        persistentParams[FCJITPoLib.Settings.Ui.Parameters.JIT_PO_ACCEPTEDPOS_TEMPJSON_FILE_ID] = poAcceptedCacheFileId;
        persistentParams[FCJITPoLib.Settings.Ui.Parameters.JIT_PO_REJECTEDPOS_TEMPJSON_FILE_ID] = poRejectedCacheFileId;


        // Build display of final include/exclude summary, along with changes from the original? 
        // Build a field group for POs accepted + POs rejected
        var poAcceptedFieldGroup = assistant.addFieldGroup({
            id: FCJITPoLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_ID,
            label: FCJITPoLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_LABEL
        });

        var poRejectedFieldGroup = assistant.addFieldGroup({
            id: FCJITPoLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_REJECTED_FIELD_GROUP_ID,
            label: FCJITPoLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_REJECTED_FIELD_GROUP_LABEL
        });


        // Add a field to display the POs accepted
        var posAcceptedDataField = assistant.addField({
            id: FCJITPoLib.Settings.Ui.Fields.FINALREVIEW_POS_ACCEPTED_FIELD_ID,
            type: serverWidget.FieldType.INLINEHTML,
            label: FCJITPoLib.Settings.Ui.Fields.FINALREVIEW_POS_ACCEPTED_FIELD_LABEL,
            container: FCJITPoLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_ID,
        });

        posAcceptedDataField.updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
        });
        posAcceptedDataField.updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTCOL
        });

        // Add a field to display the POs rejected
        var posRejectedDataField = assistant.addField({
            id: FCJITPoLib.Settings.Ui.Fields.FINALREVIEW_POS_REJECTED_FIELD_ID,
            type: serverWidget.FieldType.INLINEHTML,
            label: FCJITPoLib.Settings.Ui.Fields.FINALREVIEW_POS_REJECTED_FIELD_LABEL,
            container: FCJITPoLib.Settings.Ui.FieldGroups.FINALREVIEW_POS_REJECTED_FIELD_GROUP_ID,
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


        addPersistentParamsField(assistant, persistentParams);

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
        var persistentParams = getPersistentParams(context);

        // Read in the accepted/rejected PO data from the cache JSON files
        let acceptedPoFileObj = file.load({
            id: persistentParams[FCJITPoLib.Settings.Ui.Parameters.JIT_PO_ACCEPTEDPOS_TEMPJSON_FILE_ID]
        });
        let rejectedPoFileObj = file.load({
            id: persistentParams[FCJITPoLib.Settings.Ui.Parameters.JIT_PO_REJECTEDPOS_TEMPJSON_FILE_ID]
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
        let sessionFolderObj = createSessionSubfolder(context);

        // Create CSV file of accepted POs > session folder
        let poAcceptedCsvFilename =
            FCJITPoLib.Settings.JIT_PO_ACCEPTEDPOS_CSV_FILENAME_PREFIX +
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
            sessionFolderObj
        );

        // Create CSV file of rejected POs > session folder
        let poRejectedCsvFilename =
            FCJITPoLib.Settings.JIT_PO_REJECTEDPOS_CSV_FILENAME_PREFIX +
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
            sessionFolderObj
        );

        return;

        // Initiate n/task CSV Import using accepted POs CSV file
        let csvImportTask = task.create({
            taskType: task.TaskType.CSV_IMPORT,
        });
        csvImportTask.mappingId = FCJITPoLib.Ids.CSVImportMappingsJIT_PO_IMPORT_ASSISTANT_CSVIMPORT;
        csvImportTask.importFile = f.load({ id: acceptedPoCsvFileId });

        if (false) { // FIX: Test whether any of the POs were marked as To Send
            // Set dependent task: send POs (MR script) using list of POs marked To Send from persistentParams
            let poSendTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: FCJITPoLib.Ids.Scripts.EMAIL_JIT_POS,
                deploymentId: FCJITPoLib.Ids.Deployments.EMAIL_JIT_POS,
            });

            csvImportTask.addInboundDependency(poSendTask);
        }

        csvImportTask.submit();

    }

    function writeCancel(context, assistant) {

    }


    function createSessionSubfolder(context, date = new Date()) {
        const curDateTimeStr = FCLib.getStandardDateTimeString1(date);
        // const curDateTime = new Date();
        // const curDateTimeStr = curDateTime.toISOString().replace(/:/g, '-');
        var resultsFolderName = FCJITPoLib.Settings.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
        var resultsFolderObj = FCLib.createFolderInFileCabinet(resultsFolderName, FCJITPoLib.Ids.Folders.RESULTS);

        return {
            sessionResultsFolderObj: resultsFolderObj,
        };
    }

    function runFutureSOItemQuery(nestingKeys, soStartDate = null, soEndDate = null) {
        // Run query to get JIT items on future SOs within the date range specified
        let queryText = FCJITPoLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.Query;
        let extraFilters = '';

        // Replace the date parameters in the query
        if (soStartDate) {
            let startFilter = FCJITPoLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.Filters.soStartDate;
            extraFilters += startFilter.replace('@@SO_START_DATE@@', soStartDate) + '\n';
        }

        if (soEndDate) {
            let endFilter = FCJITPoLib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.Filters.soEndDate;
            extraFilters += endFilter.replace('@@SO_END_DATE@@', soEndDate) + '\n';
        }

        // Add the filters to the query
        queryText = queryText.replace('@@EXTRA_FILTERS@@', extraFilters);

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
        let validSuffixes = FCJITPoLib.Settings.PurchaseOrder.VALID_PO_SUFFIXES;

        // Get first valid suffix not present in existing suffixes set
        let nextSuffix = validSuffixes.find(suffix => !existingSuffixes.has(suffix));

        return `${lotPrefix}${nextSuffix}`;
    }

    function runConflictingLotNumberQuery(nestingKeys, lotPrefix = '*') {
        let queryText = FCJITPoLib.Queries.GET_POTENTIAL_CONFLICTING_LOT_NUMBERS.Query;
        let lotPrefixParam = FCJITPoLib.Queries.GET_POTENTIAL_CONFLICTING_LOT_NUMBERS.Parameters.LotPrefix;
        queryText = queryText.replace(lotPrefixParam, lotPrefix);
        let queryResults = FCLib.sqlSelectAllRowsIntoNestedDict(
            queryText,
            nestingKeys
        );
        return queryResults;
    }

    function addPersistentParamsField(assistant, params) {
        // Add a hidden field to hold persistentParams
        let hiddenPersistentParamsField = assistant.addField({
            id: FCJITPoLib.Settings.Ui.Parameters.HIDDEN_PERSISTENT_PARAMS_ID,
            type: serverWidget.FieldType.LONGTEXT,
            label: FCJITPoLib.Settings.Ui.Fields.HIDDEN_PERSISTENT_PARAMS_LABEL,
        });
        hiddenPersistentParamsField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        hiddenPersistentParamsField.defaultValue = JSON.stringify(params);
    }

    function getPersistentParams(context) {
        return JSON.parse(
            context.request.parameters[FCJITPoLib.Settings.Ui.Parameters.HIDDEN_PERSISTENT_PARAMS_ID]
        );
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