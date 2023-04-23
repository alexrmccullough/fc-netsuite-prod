/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

var modulePathShippingLabelLibrary = './fc-shipping-labels.library.module';

var
    ui,
    runtime,
    record,
    render,
    xml,
    search,
    file,
    FCShipLabelLib;


define(['N/ui/serverWidget', 'N/runtime', 'N/record', 'N/render', 'N/xml', 'N/search', 'N/file', modulePathShippingLabelLibrary], main);

function main(serverWidgetModule, runtimeModule, recordModule, renderModule, xmlModule, searchModule, fileModule, FCShipLabelLibModule) {
    ui = serverWidgetModule;
    runtime = runtimeModule;
    record = recordModule;
    render = renderModule;
    xml = xmlModule;
    search = searchModule;
    file = fileModule;
    FCShipLabelLib = FCShipLabelLibModule;


    return {
        onRequest: function (context) {
            if (context.request.method === 'GET') {
                let shipping_form = ui.createForm({ title: 'Print Shipping Labels' });
                let from_Date = shipping_form.addField({
                    id: 'custpage_from_date',
                    type: ui.FieldType.DATE,
                    label: 'From Date'
                });
                let to_Date = shipping_form.addField({
                    id: 'custpage_to_date',
                    type: ui.FieldType.DATE,
                    label: 'To Date'
                });
                let vendor = shipping_form.addField({
                    id: 'custpage_vendor',
                    type: ui.FieldType.TEXT,
                    label: 'Vendor'
                });
                let vendor2 = shipping_form.addField({
                    id: 'custpage_vendor2',
                    type: ui.FieldType.MULTISELECT,
                    label: 'Vendor2',
                    source: 'vendor'
                });

                let labelFormat = shipping_form.addField({
                    id: 'custpage_label_format',
                    type: ui.FieldType.SELECT,
                    label: 'Label Format',
                });

                labelFormat.addSelectOption({ value: 'PDF_AVERY_8X11', text: 'Avery 8x11 - 10/sheet' });
                labelFormat.addSelectOption({ value: 'PDF_ZEBRA_2X4', text: 'Zebra 2x4 - singles' });


                vendor2.updateDisplaySize({
                    height: 15,
                    width: 400
                });

                shipping_form.addSubmitButton({ label: 'Print' });
                shipping_form.addResetButton({ label: 'Cancel' });

                context.response.writePage(shipping_form);
            }

            else {   // POST
                let parameters = context.request.parameters;

                let vendorIds = parameters.custpage_vendor2 ?
                    parameters.custpage_vendor2.split('\u0005').map((id) => parseInt(id)) :
                    null;

                // let xmlMainTemplateInfo = FCShipLabelLib.LabelFormatting.PrintFormat.PDF_AVERY_8X11;
                let labelXml = FCShipLabelLib.generateShippingLabelXml(
                    // 'PDF_AVERY_8X11',
                    // 'PDF_ZEBRA_2X4',
                    parameters.custpage_label_format,
                    parameters.custpage_from_date,
                    parameters.custpage_to_date,
                    vendorIds,
                    null
                );

                let debugHtml = '';

                // Add paramters to debug
                debugHtml += `<h3>Parameters</h3><pre>${JSON.stringify(parameters, null, 4)}</pre>`;
                debugHtml += `<h3>Vendor IDs</h3><pre>${JSON.stringify(vendorIds, null, 4)}</pre>`;

                // labelXml = labelXml.replace(/</g, '&#60;').replace(/>/g, '&#62;');
                // debugHtml += `<h3>Label XML</h3><pre>${labelXml}</pre>`;
                // context.response.write(labelXml);
                // context.response.write(debugHtml);

                context.response.renderPdf(labelXml);
                return;
            }

        }
    }

}







