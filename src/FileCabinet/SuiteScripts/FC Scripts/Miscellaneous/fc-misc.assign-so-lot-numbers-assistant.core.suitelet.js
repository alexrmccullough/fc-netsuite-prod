/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

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


define([
    'N/file',
    'N/log',
    'N/query',
    'N/render',
    'N/ui/serverWidget',
    '../Libraries/fc-main.library.module',
    './fc-misc.assign-so-lot-numbers-assistant.library.module',
    '../Libraries/papaparse.min'
], main);


function main(fileModule, logModule, queryModule, renderModule, serverWidgetModule, fcLibModule, fcJITUploadLibModule, papaparseModule) {
    file = fileModule;
    log = logModule;
    query = queryModule;
    render = renderModule;
    serverWidget = serverWidgetModule;
    FCLib = fcLibModule;
    ThisAppLib = fcJITUploadLibModule;
    Papa = papaparseModule;

    return {

        onRequest: function (context) {
            // scriptURL = url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, returnExternalURL: false });

            var assistant = serverWidget.createAssistant({
                title: 'Assign SO Lot Number Assistant',
                hideNavBar: false
            });

            var step1SelectSalesOrders = assistant.addStep({
                id: 'custpage_step_select_sos',
                label: 'Select Sales Orders',
            });

            // var step2ReviewCsvParse = assistant.addStep({
            //     id: 'custpage_step_review_items',
            //     label: 'Review Items',
            // });


            assistant.isNotOrdered = false;

            var steps = [
                null,
                step1SelectSalesOrders,
                // step2ReviewCsvParse,
                null
            ];

            var stepWriteFunc = [
                writeCancel,
                writeStep1SelectSalesOrders,
                // writeStep2ReviewCsvParse,
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



    function writeStep1SelectSalesOrders(context, assistant) {
        // Display table of sales orders with:
        //    so number, so id, customer, ship date, quantity, amount, 

        // Run query to get sales orders
        let sqlSoQuery = ThisAppLib.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.Query;
        let soQueryResults = FCLib.sqlSelectAllRows(sqlSoQuery);

        // Filter out results with no unassigned lots
        soQueryResults = soQueryResults.filter((so) =>
            so[ThisAppLib.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.FieldSet1.QtyRemainingToBeLotted.fieldid] > 0
        );

        let tableHtml = '';

        if (!soQueryResults || soQueryResults.length === 0) {
            tableHtml = '<p>No open SOs found with unassigned lots. </p>';
            log.debug({ title: 'No open SOs found with unassigned lots.', details: '' });
        }
        else {
            tableHtml = buildSoSelectList(soQueryResults);
        }

        // Build the Form field to hold the table
        let soTableField = assistant.addField({
            id: ThisAppLib.Settings.Ui.Step1.Fields.SO_TABLE_FIELD_ID,
            type: serverWidget.FieldType.INLINEHTML,
            label: ThisAppLib.Settings.Ui.Step1.Fields.SO_TABLE_FIELD_LABEL,
        });
        soTableField.defaultValue = tableHtml;


        function buildSoSelectList(soQueryResults) {
            let fieldDefs = ThisAppLib.Settings.Ui.Step1.Sublists.SO_TABLE.Fields;
            let formattedRows = FCLib.formatQueryRowsOnFieldDefs(fieldDefs, soQueryResults);
            let tableHeaders = Object.keys(fieldDefs).map((key) => fieldDefs[key].Label);

            let selectCheckboxInputSpecs = {
                htmlElem: 'checkbox',
                valueSourceField: fieldDefs.TranInternalId.Label,
                checkedSourceField: fieldDefs.Select.Label,
                fieldDisplayName: fieldDefs.Select.Label,
                idPrefixPart1Str: ThisAppLib.Settings.Ui.Step1.Parameters.SELECT_SO_CHECKBOX_ID.prefix,
                idPrefixPart2Str: '',
                idUniqueSuffixSourceField: fieldDefs.TranInternalId.Label,
            };

            tableHtml = FCLib.convertObjToHTMLTableStylized({
                fields: tableHeaders,
                data: formattedRows,
                specialElems: [selectCheckboxInputSpecs],
                hideFields: {
                    [fieldDefs.Select.Label]: true,
                },
            });

            return tableHtml;
        }
    }



    function writeStep2ReviewCsvParse(context, assistant) {
        let params = context.request.parameters;


    }



    function writeResult(context, assistant) {
        let params = context.request.parameters;

        // Get selected sales orders
        let soInternalIdsSelected = Object.entries(params).reduce(
            (matched, [paramName, value]) => {
                if (ThisAppLib.Settings.Ui.Step1.Parameters.SELECT_SO_CHECKBOX_ID.looksLike(paramName)) {
                    return [...matched, value];
                }
                return matched;
            }, []
        );

        // Write the selected sales orders to a JSON file to pass to the MR script that will 
        //    apply the lot assignments. 
        let soJsonFileId = FCLib.writeFileToFileCabinet(
            'json',
            ThisAppLib.MRSettings.SELECTED_SO_JSON_FILE.BuildName(),
            JSON.stringify(soInternalIdsSelected),
            ThisAppLib.MRSettings.SELECTED_SO_JSON_FILE.OutFolderId()
        );


        // Run the MR script to apply the lot assignments
        let mrScriptTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: ThisAppLib.MRSettings.SCRIPT_ID,
            deploymentId: ThisAppLib.MRSettings.DEPLOYMENT_ID,
            params: {
                [ThisAppLib.MRSettings.Parameters.SELECTED_SO_JSON_FILE_ID]: soJsonFileId,
            }
        });

        let mrScriptTaskId = mrScriptTask.submit();



        return `<p>Lot assignments are being applied to the selected sales orders. </p>`;

    }

    function writeCancel(context) {
        return;
    }

}
