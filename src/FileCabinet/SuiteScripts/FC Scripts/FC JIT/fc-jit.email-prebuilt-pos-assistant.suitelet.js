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
    FCJITlib,
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
    FCJITlib = jitPoLibModule;
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
            FCJITlib.Settings.Ui.Main.DEFAULT_PO_DUE_DATE_DAYS_FROM_TODAY
        );

        var capturePODeliveryDueDate = assistant.addField({
            id: FCJITlib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: FCJITlib.Settings.Ui.Fields.CAPTURE_PO_DELIVERY_DUE_DATE_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });

        capturePODeliveryDueDate.isMandatory = true;
        capturePODeliveryDueDate.defaultValue = poDueDate;

        var captureSosStartDate = assistant.addField({
            id: FCJITlib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: FCJITlib.Settings.Ui.Fields.CAPTURE_SOS_START_DATE_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });

        // Set default value to today
        // captureSosStartDate.defaultValue = today;

        var captureSosEndDate = assistant.addField({
            id: FCJITlib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID,
            type: serverWidget.FieldType.DATE,
            label: FCJITlib.Settings.Ui.Fields.CAPTURE_SOS_END_DATE_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });

        // Add a checkbox to switch on/off Subtract Future JIT SOs from Remaining JIT Qty
        var sendAllPosByDefault = assistant.addField({
            id: FCJITlib.Settings.Ui.Parameters.ENABLE_SEND_ALL_POS_BY_DEFAULT_ID,
            type: serverWidget.FieldType.CHECKBOX,
            label: FCJITlib.Settings.Ui.Fields.ENABLE_SEND_ALL_POS_BY_DEFAULT_LABEL,
            // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
        });
        sendAllPosByDefault.defaultValue = 'T';

    }

    function writeStep2InitialEdit(context, assistant) {
        // Get date parameters
        var persistentParams = {
            [FCJITlib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID]: context.request.parameters[FCJITlib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            [FCJITlib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID]: context.request.parameters[FCJITlib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID],
            [FCJITlib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID]: context.request.parameters[FCJITlib.Settings.Ui.Parameters.CAPTURE_PO_DELIVERY_DUE_DATE_ID],
        };
        // var soStartDate = context.request.parameters[FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID];
        // var soEndDate = context.request.parameters[FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID];
        var sendAllPosByDefault = context.request.parameters[FCJITlib.Settings.Ui.Parameters.ENABLE_SEND_ALL_POS_BY_DEFAULT_ID];


        var jitSOItemQueryResults = runFutureSOItemQuery(
            ['vendorentityid'],
            persistentParams[FCJITlib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID],
            persistentParams[FCJITlib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID]
        );

        // Build HTML tables to display the results
        var displayFieldLookup = FCJITlib.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1;
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


        FCJITlib.addPersistentParamsField(assistant, persistentParams);

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
        debugPOHtml += '<pre>' + JSON.stringify(displayFieldLookup, null, 2) + '</pre>\n\n';
        debugPOHtml += '<pre>' + JSON.stringify(displayFieldIds, null, 2) + '</pre>\n\n';
        debugPODataField.defaultValue = debugPOHtml;

        // Write the results to the context response
        // context.response.writePage(assistant);
    }

    function writeStep3FinalReview(context, assistant) {
        var allParams = JSON.stringify(context.request.parameters);
        var persistentParams = getPersistentParams(context);



    function writeResult(context, assistant) {
        var persistentParams = getPersistentParams(context);


    }

    function writeCancel(context, assistant) {

    }


    function createSessionSubfolder(context, date = new Date()) {
        const curDateTimeStr = FCLib.getStandardDateTimeString1(date);
        // const curDateTime = new Date();
        // const curDateTimeStr = curDateTime.toISOString().replace(/:/g, '-');
        var resultsFolderName = FCJITlib.Settings.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
        var resultsFolderObj = FCLib.createFolderInFileCabinet(resultsFolderName, FCJITlib.Ids.Folders.RESULTS);

        return {
            sessionResultsFolderObj: resultsFolderObj,
        };
    }

  