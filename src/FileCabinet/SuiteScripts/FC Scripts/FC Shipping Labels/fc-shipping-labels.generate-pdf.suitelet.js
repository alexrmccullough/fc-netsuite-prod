/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

var modulePathShippingLabelLibrary = './fc-shipping-labels.library.module.js';

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
                let labelXml = generateShippingLabelBodyXml(
                    context,
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



function generateShippingLabelBodyXml(
    context,
    printFormat = 'PDF_AVERY_8X11',
    getFromDate = null,
    getToDate = null,
    vendorInternalIds = [],
    customerInternalIds = [],
) {

    var xmlFinal = "";
    var xmlMainTemplateInfo;
    var xmlLabelTemplateInfo;



    // TRY/CATCH
    try {
        if (!(printFormat in FCShipLabelLib.LabelFormatting.PrintFormat)) {
            throw new Error(
                `Invalid print format:  + ${printFormat}
                 Valid formats are: ${Object.values(FCShipLabelLib.LabelFormatting.PrintFormat).join(', ')}`
            );
        }
        printFormat = FCShipLabelLib.LabelFormatting.PrintFormat[printFormat];
        // Depending on the type chosen, we will load the appropriate XML and handle logic differently
        xmlMainTemplateInfo = printFormat.TemplateMain;
        xmlLabelTemplateInfo = printFormat.TemplateLabel;

        // We can generate labels in two formats:
        //   1) 8x11 Avery sheet 5163 PDF > regular printer
        //   2) 2x4 single label/sheet PDF > Zebra printer

        // Load in the xml for the main PDF body and the label
        xmlMainTemplateInfo.Xml = FCLib.getTextFileContents(xmlMainTemplateInfo.FileId);
        xmlLabelTemplateInfo.Xml = FCLib.getTextFileContents(xmlLabelTemplateInfo.FileId);


        const labelPlaceholders = [
            [xmlLabelTemplateInfo.Placeholders.Customer],
            [xmlLabelTemplateInfo.Placeholders.SOShipDate],
            [xmlLabelTemplateInfo.Placeholders.Route],
            [xmlLabelTemplateInfo.Placeholders.ItemId],
            [xmlLabelTemplateInfo.Placeholders.SONumber],
            [xmlLabelTemplateInfo.Placeholders.LabelQty],
            [xmlLabelTemplateInfo.Placeholders.LabelPos],
            [xmlLabelTemplateInfo.Placeholders.LineLabelCt],
            [xmlLabelTemplateInfo.Placeholders.LotNumber],
            [xmlLabelTemplateInfo.Placeholders.Brand],
            [xmlLabelTemplateInfo.Placeholders.ProductStub],
            [xmlLabelTemplateInfo.Placeholders.MasterCase],
            [xmlLabelTemplateInfo.Placeholders.ItemDisplayName],
        ];
        const labelPlaceholdersReplRegex = new RegExp(labelPlaceholders.join('|'), 'g');


        let searchParams = {};
        if (getFromDate) { searchParams.soShipStartDate = getFromDate; }
        if (getToDate) { searchParams.soShipEndDate = getToDate; }
        if (vendorInternalIds && vendorInternalIds.length) { searchParams.vendorInternalIds = vendorInternalIds; }
        if (customerInternalIds && customerInternalIds.length) { searchParams.customerInternalIds = customerInternalIds; }

        let searchResults = FCShipLabelLib.runLotNumberedShippingLabelSearch(searchParams);

        // If we have no results, return an empty string
        if (!searchResults || !searchResults.data || !searchResults.data.length) {
            return xmlInjectBodyIntoTemplate(
                xmlMainTemplateInfo,
                '<h3>No results found!</h3>'
            );
        }

        let requiredFields = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields;
        let addedFields = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.AddedFields;



        let rowsPerPage = xmlMainTemplateInfo.LabelRowsPerPage;
        let colsPerPage = xmlMainTemplateInfo.LabelColsPerPage;
        let labelCountPerPage = rowsPerPage * colsPerPage;

        let resultCount = searchResults.data.length;
        let labelCounter = 0;
        let resultIdx = 0;

        let extras = [];


        while ((resultIdx < resultCount) || extras.length > 0) {
            let result = {};
            let quantityRemaining = 0;
            let inExtras = false;


            if (extras.length > 0) {
                result = extras.pop();
                inExtras = true;
            } else {
                result = searchResults.data[resultIdx];
                inExtras = false;
            }


            let soShipDate = result[requiredFields.SOShipDate.nsSsFieldId];
            let soLineQuantity = result[requiredFields.SOLineQuantity.nsSsFieldId];
            let lineUniqueDBKey = result[requiredFields.TransLineUniqueKey.nsSsFieldId];
            let soNumber = result[requiredFields.SONumber.nsSsFieldId];
            let customer = result[requiredFields.Customer.nsSsFieldId];
            let route = result[requiredFields.Route.nsSsFieldId];
            let itemId = result[requiredFields.ItemId.nsSsFieldId];
            let itemName = result[requiredFields.ItemName.nsSsFieldId];
            let brand = result[requiredFields.Brand.nsSsFieldId];
            let productStub = result[requiredFields.ProductStub.nsSsFieldId];
            let masterCase = result[requiredFields.MasterCase.nsSsFieldId];
            let qtyPerLabel = result[requiredFields.QtyPerLabel.nsSsFieldId];
            let lotNumber = result[requiredFields.LotNumber.nsSsFieldId];
            let lotQuantity = result[requiredFields.LotQuantity.nsSsFieldId];
            let preferredVendor = result[requiredFields.PreferredVendor.nsSsFieldId];
            let curLotQty = result[addedFields.CurLotQty.fieldId];


            if (!qtyPerLabel || qtyPerLabel <= 0) {
                qtyPerLabel = 1;
            }

            // FIX: This will probably fail if we have more than one partial-qty item
            if (lotNumber) {
                quantityRemaining = lotQuantity;
            } else {
                quantityRemaining = soLineQuantity;
            }

            let lineLabelCount = Math.ceil(quantityRemaining / qtyPerLabel);
            let hasUnlottedRemainder = false;


            for (let i = 1; i <= lineLabelCount; i++) {  // individual label
                labelCounter += 1;
                let thisLabelQty = Math.min(quantityRemaining, qtyPerLabel);

                xmlFinal += xmlOpenTable(
                    labelCounter,
                    labelCountPerPage
                );

                xmlFinal += xmlOpenRow(
                    labelCounter,
                    colsPerPage
                );

                // Write the label div
                let labelFieldValues = {
                    [xmlLabelTemplateInfo.Placeholders.Customer]: customer,
                    [xmlLabelTemplateInfo.Placeholders.SOShipDate]: soShipDate,
                    [xmlLabelTemplateInfo.Placeholders.Route]: route,
                    [xmlLabelTemplateInfo.Placeholders.ItemId]: itemId,
                    [xmlLabelTemplateInfo.Placeholders.SONumber]: soNumber,
                    [xmlLabelTemplateInfo.Placeholders.LabelQty]: thisLabelQty,
                    [xmlLabelTemplateInfo.Placeholders.LabelPos]: i,
                    [xmlLabelTemplateInfo.Placeholders.LineLabelCt]: lineLabelCount,
                    [xmlLabelTemplateInfo.Placeholders.LotNumber]: lotNumber,
                    [xmlLabelTemplateInfo.Placeholders.Brand]: brand,
                    [xmlLabelTemplateInfo.Placeholders.ProductStub]: productStub,
                    [xmlLabelTemplateInfo.Placeholders.MasterCase]: masterCase,
                    [xmlLabelTemplateInfo.Placeholders.ItemDisplayName]: itemName,
                };

                let labelXml = xmlLabelTemplateInfo.Xml.replace(
                    labelPlaceholdersReplRegex, (matched) => labelFieldValues[matched]
                );

                xmlFinal += '\n<td>' + labelXml + '\n</td>';


                // Close row + table, if needed
                let isLastResult = (resultIdx === (resultCount - 1));
                let isLastLabelOfResult = (i >= lineLabelCount);
                hasUnlottedRemainder =
                    !inExtras &&
                    (result[requiredFields.IsLastLotOfLine.nsSsFieldId] === 'True') &&
                    (result[requiredFields.TotalUnlottedQtyInLine.nsSsFieldId] > 0);


                // // DEBUG: write all fields in plain text for debugging
                // xmlFinal += '\n<td>';
                // xmlFinal += `<p>quantityRemaining: ${quantityRemaining}</p>`;
                // xmlFinal += `<p>thisLabelQty: ${thisLabelQty}</p>`
                // xmlFinal += `<p>resultCount: ${resultCount}</p>`;
                // xmlFinal += `<p>labelCounter: ${labelCounter}</p>`;
                // xmlFinal += `<p>resultIdx: ${resultIdx}</p>`;
                // xmlFinal += `<p>extras.length: ${extras.length}</p>`;
                // xmlFinal += `<p>lineLabelCount: ${lineLabelCount}</p>`;
                // xmlFinal += `<p>isLastResult: ${isLastResult}</p>`;
                // xmlFinal += `<p>isLastLabelOfResult: ${isLastLabelOfResult}</p>`;
                // xmlFinal += `<p>hasUnlottedRemainder: ${hasUnlottedRemainder}</p>`;
                // xmlFinal += `<p>inExtras: ${inExtras}</p>`;
                // xmlFinal += `<p>resultObj: ${JSON.stringify(result)}</p>`;
                // xmlFinal += '\n</td>';


                xmlFinal += xmlCloseRow({
                    labelCounter: labelCounter,
                    colsPerPage: colsPerPage,
                    isLastResult: isLastResult,
                    isLastLabelOfResult: isLastLabelOfResult,
                    hasUnlottedRemainder: hasUnlottedRemainder
                });

                xmlFinal += xmlCloseTable({
                    labelCounter: labelCounter,
                    labelsPerPage: labelCountPerPage,
                    isLastResult: isLastResult,
                    isLastLabelOfResult: isLastLabelOfResult,
                    hasUnlottedRemainder: hasUnlottedRemainder
                })

                quantityRemaining -= qtyPerLabel;
                // labelCounter += 1;
            }

            if (hasUnlottedRemainder) {
                let newLine = { ...result };
                newLine.h
                newLine[requiredFields.LotNumber.nsSsFieldId] = FCShipLabelLib.LabelFormatting.BLANK_LOT_STRING;
                newLine[addedFields.CurLotQty.fieldId] = result[requiredFields.TotalUnlottedQtyInLine.nsSsFieldId];
                extras.push(newLine);
            }

            resultIdx += 1;

        }

    } catch (e) {
        log.error({ title: 'Error in generateShippingLabels', details: e });
        throw e;
    }

    xmlFinal = xmlInjectBodyIntoTemplate(xmlMainTemplateInfo, xmlFinal);

    return xmlFinal;
}


function xmlInjectBodyIntoTemplate(xmlTemplateInfo, xmlBody) {
    return xmlTemplateInfo.Xml.replace(xmlTemplateInfo.Placeholders.Body, xmlBody);
}

function xmlOpenRow(labelCounter, colsPerPage) {
    if ((labelCounter - 1) % colsPerPage == 0) {
        return `<tr>`;
    }
    return '';
}

function xmlCloseRow({
    labelCounter = 0,
    colsPerPage = 0,
    isLastResult = true,
    isLastLabelOfResult = true,
    hasUnlottedRemainder = false
} = {}) {
    if ((labelCounter % colsPerPage == 0) || (isLastResult && isLastLabelOfResult && !hasUnlottedRemainder)) {
        return `</tr>`;
    }
    return '';
}

function xmlOpenTable(labelCounter, labelsPerPage) {
    if (((labelCounter - 1) % labelsPerPage) == 0) {
        return `<table class="maintable">`
    }
    return '';
}

function xmlCloseTable({
    labelCounter = 0,
    labelsPerPage = 0,
    isLastResult = true,
    isLastLabelOfResult = true,
    hasUnlottedRemainder = false
} = {}) {

    let retXml = '';

    if (isLastResult && isLastLabelOfResult && !hasUnlottedRemainder) {
        retXml = `</table>`;
    } else if (labelCounter % labelsPerPage == 0) {
        retXml = `</table><pbr></pbr>`;
    }

    return retXml;
}



