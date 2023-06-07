/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */


var
    ui,
    url,
    redirect,
    runtime,
    render,
    xml,
    config,
    dayjs,
    FCLib,
    ThisAppLib;


define([
    'N/ui/serverWidget',
    'N/url',
    'N/redirect',
    'N/runtime',
    'N/render',
    'N/xml',
    'N/config',
    '../Libraries/dayjs.min',
    '../Libraries/fc-main.library.module',
    './fc-deliv-packets.library-general.module'
], main);

function main(
    serverWidgetModule,
    urlModule,
    redirectModule,
    runtimeModule,
    renderModule,
    xmlModule,
    configModule,
    dayjsModule,
    fcLibModule,
    thisAppLibModule
) {
    ui = serverWidgetModule;
    url = urlModule;
    redirect = redirectModule;
    runtime = runtimeModule;
    render = renderModule;
    xml = xmlModule;
    config = configModule;
    dayjs = dayjsModule;
    FCLib = fcLibModule;
    ThisAppLib = thisAppLibModule;

    return {
        onRequest: function (context) {
            if (context.request.method === 'GET') {
                let form = ui.createForm({
                    title: 'Delivery Packets'
                });

                let startDateField = form.addField({
                    id: ThisAppLib.SuiteletParams.START_SHIP_DATE,
                    type: ui.FieldType.DATE,
                    label: 'Start Date'
                });

                let endDateField = form.addField({
                    id: ThisAppLib.SuiteletParams.END_SHIP_DATE,
                    type: ui.FieldType.DATE,
                    label: 'End Date'
                });

                form.addSubmitButton({
                    label: 'Generate Packets',
                });

                // Attach client script to form
                form.clientScriptModulePath = './fc-deliv-packets.core.client.js';

                context.response.writePage(form);
            }

            else {      // POST
                const startDateRaw = context.request.parameters[ThisAppLib.SuiteletParams.START_SHIP_DATE];
                const endDateRaw = context.request.parameters[ThisAppLib.SuiteletParams.END_SHIP_DATE];
                const startDate = dayjs(startDateRaw).format('MM/DD/YYYY');
                const endDate = dayjs(endDateRaw).format('MM/DD/YYYY');

                log.debug("Suitelet is posting.")
                var params = {
                    [ThisAppLib.SuiteletParams.START_SHIP_DATE]: startDate,
                    [ThisAppLib.SuiteletParams.END_SHIP_DATE]: endDate,
                    [ThisAppLib.SuiteletParams.SUBMITTED]: 'T'
                };
                var suiteletURL = url.resolveScript({
                    scriptId: ThisAppLib.Scripts.THISAPP_MAIN_SUITELET.ScriptId,
                    deploymentId: ThisAppLib.Scripts.THISAPP_MAIN_SUITELET.DeployId,
                    params: params
                });
                redirect.redirect({ url: suiteletURL });

            }


        }
    }
}