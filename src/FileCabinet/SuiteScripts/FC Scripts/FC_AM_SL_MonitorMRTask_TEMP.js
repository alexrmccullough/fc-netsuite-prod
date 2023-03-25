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
    MRTaskStatus


define([
    'N/file',
    'N/https',
    'N/log',
    'N/ui/message',
    'N/query',
    'N/record',
    'N/render',
    'N/runtime',
    'N/ui/serverWidget',
    'N/url',
    './Libraries/FC_MainLibrary',
    './Libraries/netsuite-task-status-master/src/task-status/task_status_sl.ts'
], main);


function main(fileModule, httpsModule, logModule, messageModule, queryModule, recordModule, renderModule, runtimeModule, serverWidgetModule, urlModule, fcLibModule, mrTaskStatusModule) {

    file = fileModule;
    https = httpsModule;
    log = logModule;
    page = messageModule;
    query = queryModule;
    record = recordModule;
    render = renderModule;
    runtime = runtimeModule;
    serverWidget = serverWidgetModule;
    url = urlModule;
    FCLib = fcLibModule;
    MRTaskStatus = mrTaskStatusModule;

    function onRequest(context) {
        var taskId = context.request.parameters.taskId;
        var mapStageName = context.request.parameters.mapStageName;
        var reduceStageName = context.request.parameters.reduceStageName;

        var form = serverWidget.createForm({
            title: 'Task Status'
            });


        // var taskId = 'MAP_REDUCE_TASK_ID';
        var embeddedSuitelet = url.resolveScript({
            scriptId: 'customscript_task_status_sl',
            deploymentId: 'customdeploy_task_status_sl',
            params: {
                taskId: taskId,
                // SuiteAnswers 68858
                ifrmcntnr: 'T',
                // rename the stages
                map: mapStageName,
                reduce: reduceStageName,
                summarize: 'none'
            }
        });

        // add an ad hoc field to the form to contain the widget
        var statusFld = form.addField({
            id: 'custpage_status_container',
            label: 'a',
            type: serverWidget.FieldType.INLINEHTML
        });
        statusFld.defaultValue = '<iframe src="' + embeddedSuitelet + '" style="border:0;width:100%;height:200px;"></iframe>';
        
        // Write the form to the response
        context.response.writePage(form);

    }

    return {
        onRequest: onRequest
    };
}

