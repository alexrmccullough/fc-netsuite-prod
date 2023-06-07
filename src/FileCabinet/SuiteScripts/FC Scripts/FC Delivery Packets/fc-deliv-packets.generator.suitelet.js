/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */


var
    // ui,
    // runtime,
    render,
    xml,
    config,
    dayjs,
    FCLib,
    ThisAppLib;


define([
    // 'N/ui/serverWidget',
    // 'N/runtime',
    'N/render',
    'N/xml',
    'N/config',
    '../Libraries/dayjs.min',
    '../Libraries/fc-main.library.module',
    './fc-deliv-packets.library-general.module'
], main);

function main(
    // serverWidgetModule,
    // runtimeModule,
    renderModule,
    xmlModule,
    configModule,
    dayjsModule,
    fcLibModule,
    thisAppLibModule
) {
    // ui = serverWidgetModule;
    // runtime = runtimeModule;
    render = renderModule;
    xml = xmlModule;
    config = configModule;
    dayjs = dayjsModule;
    FCLib = fcLibModule;
    ThisAppLib = thisAppLibModule;

    return {
        onRequest: function (context) {
            if (context.request.method === 'GET') {
                let params = context.request.parameters;
                let startDate = dayjs(params[ThisAppLib.SuiteletParams.START_SHIP_DATE]).format('MM/DD/YYYY');
                let endDate = dayjs(params[ThisAppLib.SuiteletParams.END_SHIP_DATE]).format('MM/DD/YYYY');

                const sqlTransactionQuery = ThisAppLib.Queries.QUERY_TRANSACTIONS.BuildQuery(startDate, endDate);
                let transactionResults = FCLib.sqlSelectAllRows(sqlTransactionQuery);

                const sqlInvoiceLineQuery = ThisAppLib.Queries.QUERY_INVOICE_LINES.BuildQuery(startDate, endDate);
                let invoiceLineResults = FCLib.sqlSelectAllRows(sqlInvoiceLineQuery);

                const sqlTicketLineQuery = ThisAppLib.Queries.QUERY_TICKET_LINES.BuildQuery(startDate, endDate);
                let ticketLineResults = FCLib.sqlSelectAllRows(sqlTicketLineQuery);


                // Convert all null values in query results to blank strings ('')
                let resultSets = [
                    transactionResults,
                    invoiceLineResults,
                    ticketLineResults
                ];

                resultSets.forEach((resultSet) => {
                    resultSet.forEach((row) => {
                        for (const [key, value] of Object.entries(row)) {
                            if (value === null) {
                                row[key] = '';
                            }
                        }
                    });
                });

                // Build a list of objects with unique shipment ids 
                //  shipment > 
                //    invoices[]
                //    shipmentLines[]
                let shipmentMap = new Map();
                for (const tranLine of transactionResults) {
                    const shipId = tranLine.uniqueshipmentid;
                    if (!shipmentMap.has(shipId)) {
                        shipmentMap.set(shipId, {
                            invoices: [],
                            invoiceLines: [],
                            ticketLines: [],
                        });
                    }

                    let value = shipmentMap.get(shipId);
                    value.invoices.push(tranLine);
                    value.customername = tranLine.customername;
                    value.shipdate = tranLine.shipdate;
                    value.shipaddress = tranLine.shipaddress;
                }

                for (const shipLine of invoiceLineResults) {
                    const shipId = shipLine.uniqueshipmentid;
                    if (!shipmentMap.has(shipId)) {
                        shipmentMap.set(shipId, {
                            invoices: [],
                            invoiceLines: [],
                            ticketLines: [],
                        });
                    }

                    shipmentMap.get(shipId).invoiceLines.push(shipLine);
                }

                for (const ticketLine of ticketLineResults) {
                    const shipId = ticketLine.uniqueshipmentid;
                    if (!shipmentMap.has(shipId)) {
                        shipmentMap.set(shipId, {
                            invoices: [],
                            invoiceLines: [],
                            ticketLines: [],
                        });
                    }

                    shipmentMap.get(shipId).ticketLines.push(ticketLine);
                }

                // Convert the map to an array
                let shipments = [];
                for (const [key, value] of shipmentMap) {
                    shipments.push(
                        { uniqueshipmentid: key, ...value }
                    );
                }


                // Get company logoUrl from config
                const fcConfig = config.load({
                    type: config.Type.COMPANY_INFORMATION
                });

                const logoId = fcConfig.getValue('formlogo');
                const companyName = fcConfig.getValue('companyname');
                const companyAddress = fcConfig.getValue('mainaddress_text');

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
                        companyName: companyName,
                        companyAddress: companyAddress,
                        shipments: shipments
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