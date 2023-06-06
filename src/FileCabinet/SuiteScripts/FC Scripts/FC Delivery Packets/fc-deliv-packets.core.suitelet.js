/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */


var
    ui,
    runtime,
    render,
    xml,
    config,
    dayjs,
    FCLib,
    ThisAppLib;


define([
    'N/ui/serverWidget',
    'N/runtime',
    'N/render',
    'N/xml',
    'N/config',
    '../Libraries/dayjs.min',
    '../Libraries/fc-main.library.module',
    './fc-deliv-packets.library.module'
], main);

function main(
    serverWidgetModule,
    runtimeModule,
    renderModule,
    xmlModule,
    configModule,
    dayjsModule,
    fcLibModule,
    thisAppLibModule
) {
    ui = serverWidgetModule;
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
                const testStartDate = dayjs('2023/06/01').format('MM/DD/YYYY');
                const testEndDate = dayjs('2023/06/05').format('MM/DD/YYYY');

                const sqlShipmentQuery = ThisAppLib.Queries.QUERY_SHIPMENTS.BuildQuery(testStartDate, testEndDate);
                let shipmentResults = FCLib.sqlSelectAllRows(sqlShipmentQuery);

                const sqlShipmentLineQuery = ThisAppLib.Queries.QUERY_SHIPMENT_LINES.BuildQuery(testStartDate, testEndDate);
                let shipmentLineResults = FCLib.sqlSelectAllRows(sqlShipmentLineQuery);

                // Get company logoUrl from config
                const logoId = config.load({
                    type: config.Type.COMPANY_INFORMATION
                }).getValue('formlogo');

                const logoUrl = file.load({
                    id: logoId
                }).url;


                // context.response.write(JSON.stringify(shipmentLineResults));
                // return;
                
                // Initiate a TemplateRenderer and feed it our query data
                let templateRenderer = render.create();
                const ftlTemplate = file.load({
                    id: './template.deliverypacket1.xml'
                }).getContents();

                templateRenderer.templateContent = ftlTemplate;
                templateRenderer.addCustomDataSource({
                    format: render.DataSource.OBJECT,
                    alias: 'data',
                    data: {
                        logoUrl: logoUrl,
                        shipments: shipmentResults,
                        shipmentLines: shipmentLineResults,
                    }
                });

                // templateRenderer.addCustomDataSource({
                //     format: render.DataSource.OBJECT,
                //     alias: 'shipmentLines',
                //     data: {
                //         shipmentLineResults: shipmentLineResults
                //     }
                // });

                // let pdfString = templateRenderer.renderAsString();
                // context.response.write(xml.escape(pdfString));

                let printPdf = templateRenderer.renderAsPdf();
                context.response.writePage(printPdf);



           }
        }
    }
}