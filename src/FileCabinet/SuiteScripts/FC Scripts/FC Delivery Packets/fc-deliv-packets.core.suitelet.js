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
    FCLibGeneral,
    ThisAppLib;

var multiselectDelimiter;


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
    '../Libraries/fc-general.library.module',
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
    fcLibGeneralModule,
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
    FCLibGeneral = fcLibGeneralModule;
    ThisAppLib = thisAppLibModule;
    multiselectDelimiter = FCLibGeneral.Misc.FORM_MULTISELECT_DELIMITER;

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

                let customerSelectField = form.addField({
                    id: ThisAppLib.SuiteletParams.CUSTOMER_SELECT,
                    type: ui.FieldType.MULTISELECT,
                    label: 'Customer',
                    source: 'customer'
                });
                // Make customerSelectField hidden for now
                // customerSelectField.updateDisplayType({
                //     displayType: ui.FieldDisplayType.HIDDEN
                // });

                let routeSelectField = form.addField({
                    id: ThisAppLib.SuiteletParams.ROUTE_SELECT,
                    type: ui.FieldType.MULTISELECT,
                    label: 'Route',
                    source: 'CUSTOMRECORD_RD_ROUTE'
                });
                // Make routeSelectField hidden for now
                // routeSelectField.updateDisplayType({
                //     displayType: ui.FieldDisplayType.HIDDEN
                // });

                startDateField.updateLayoutType({layoutType: ui.FieldLayoutType.STARTROW});
                endDateField.updateLayoutType({layoutType: ui.FieldLayoutType.MIDROW});
                customerSelectField.updateLayoutType({layoutType: ui.FieldLayoutType.MIDROW});
                routeSelectField.updateLayoutType({layoutType: ui.FieldLayoutType.ENDROW});

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
                const customerSelect = context.request.parameters[ThisAppLib.SuiteletParams.CUSTOMER_SELECT];
                const routeSelect = context.request.parameters[ThisAppLib.SuiteletParams.ROUTE_SELECT];

                let params = {
                    [ThisAppLib.SuiteletParams.SUBMITTED]: 'T'
                };

                if (startDateRaw) {
                    params[ThisAppLib.SuiteletParams.START_SHIP_DATE] = dayjs(startDateRaw).format('MM/DD/YYYY');
                }
                if (endDateRaw) {
                    params[ThisAppLib.SuiteletParams.END_SHIP_DATE] = dayjs(endDateRaw).format('MM/DD/YYYY');
                }
                if (customerSelect) {
                    params[ThisAppLib.SuiteletParams.CUSTOMER_SELECT] = 
                        JSON.stringify(customerSelect.split(multiselectDelimiter));
                }
                if (routeSelect) {
                    params[ThisAppLib.SuiteletParams.ROUTE_SELECT] = 
                        JSON.stringify(routeSelect.split(multiselectDelimiter));
                }
                
                log.debug("Suitelet is posting.");

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