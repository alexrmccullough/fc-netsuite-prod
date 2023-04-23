/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var log, 
    runtime,
    ui,
    url,
    FCLib;

define([
    'N/log',
    'N/runtime',
    'N/ui/serverWidget',
    'N/url',
    '../Libraries/fc-main.library.module',
], main);


function main(logModule, runtimeModule, uiModule, urlModule, fcLibModule) {
    log = logModule;
    runtime = runtimeModule;
    ui = uiModule;
    url = urlModule;
    FCLib = fcLibModule;

    return {

        onRequest: function (context) {
            if (context.request.method === 'GET') {//GET method means starting the assistant
                const params = context.request.parameters;
                const taskId = params['custscript_fc_am_mrtaskid'];

                let scriptObj = runtime.getCurrentScript();
                const mrId1 = scriptObj.getParameter({name: 'custscript_fc_am_mrtaskid'});

                log.debug({title: 'params', details: params});
                log.debug({title: 'taskId', details: taskId});
                log.debug({title: 'mrId1', details: mrId1});

                var form = ui.createForm({
                    title: 'MR Monitoring Assistant'
                });


                var monitorFrame = form.addField({
                    id: 'custpage_monitor_frame',
                    type: ui.FieldType.INLINEHTML,
                    label: 'MR Monitoring'
                });


                var monitoringSuitelet = url.resolveScript({
                    scriptId: 'customscript_fc_am_taskstatusmonitor',
                    deploymentId: 'customdeploy_fc_am_taskstatusmonitor',
                    params: {
                        taskId: mrId1,
                        // SuiteAnswers 68858
                        ifrmcntnr: 'T',
                        // rename the stages
                        map: 'Parsing Import Data',
                        reduce: 'Applying JIT Changes to Items',
                        summarize: 'Wrapping Up'
                    }
                });
                var myHtml = '';
                myHtml += 'Here is the monitor: <br>';

                myHtml +='<iframe src="' + monitoringSuitelet + '" style="border:0;width:100%;height:200px;"></iframe>';

                monitorFrame.defaultValue = myHtml;

                context.response.writePage(form);

            }

        }

    }
}