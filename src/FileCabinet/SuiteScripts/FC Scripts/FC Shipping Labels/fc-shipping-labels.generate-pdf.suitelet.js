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

                let labelXml = generateShippingLabelXml(
                    context,
                    'PDF_AVERY_8X11',
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



function generateShippingLabelXml(
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



        let searchParams = {};
        if (getFromDate) { searchParams.soShipStartDate = getFromDate; }
        if (getToDate) { searchParams.soShipEndDate = getToDate; }
        if (vendorInternalIds && vendorInternalIds.length) { searchParams.vendorInternalIds = vendorInternalIds; }
        if (customerInternalIds && customerInternalIds.length) { searchParams.customerInternalIds = customerInternalIds; }

        let searchResults = FCShipLabelLib.runLotNumberedShippingLabelSearch(searchParams);
        let requiredFields = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields;
        let addedFields = FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.AddedFields;


        let lineLotsVsQuantities = {};
        for (const result of searchResults.data) {
            let lineUniqueKey = result[requiredFields.TransLineUniqueKey.nsSsFieldId];
            let lineQty = result[requiredFields.SOLineQuantity.nsSsFieldId];
            let curLotQty = result[addedFields.CurLotQty.fieldId];

            if (!(lineUniqueKey in lineLotsVsQuantities)) {
                lineLotsVsQuantities[lineUniqueKey] = {
                    remainingLineQty: lineQty,
                    remainingLineQtyLotted: 0
                }
            }

            lineLotsVsQuantities[lineUniqueKey].remainingLineQtyLotted += curLotQty;
        }

        let resultCount = searchResults.data.length;
        let labelCounter = 1;
        let resultIdx = 0;

        let extras = [];

        // Start generating labels
        // We can generate labels in two formats:
        //   1) 8x11 Avery sheet 5163 PDF > regular printer
        //   2) 2x4 single label/sheet PDF > Zebra printer

        // Load in the xml for the main PDF body and the label
        xmlMainTemplateInfo.Xml = FCLib.getTextFileContents(xmlMainTemplateInfo.FileId);
        xmlLabelTemplateInfo.Xml = FCLib.getTextFileContents(xmlLabelTemplateInfo.FileId);

        let rowsPerPage = xmlMainTemplateInfo.LabelRowsPerPage;
        let colsPerPage = xmlMainTemplateInfo.LabelColsPerPage;
        let labelCountPerPage = rowsPerPage * colsPerPage;


        while (resultIdx < resultCount || extras.length) {
            let result = {};
            if (extras.length) {
                result = extras.pop();
            } else {
                result = searchResults.data[resultIdx];
                resultIdx += 1;
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
            let lineLabelCount = Math.ceil(curLotQty / qtyPerLabel);
            let lotQtyRemaining = curLotQty;

            for (let k = 0; k < lineLabelCount; k++) {  // individual label
                let thisLabelQty = Math.min(lotQtyRemaining, result.qtyPerLabel);

                let labelFields = {
                    [xmlLabelTemplateInfo.Placeholders.Customer]: customer,
                    [xmlLabelTemplateInfo.Placeholders.SOShipDate]: soShipDate,
                    [xmlLabelTemplateInfo.Placeholders.Route]: route,
                    [xmlLabelTemplateInfo.Placeholders.ItemId]: itemId,
                    [xmlLabelTemplateInfo.Placeholders.SONumber]: soNumber,
                    [xmlLabelTemplateInfo.Placeholders.LabelQty]: thisLabelQty,
                    [xmlLabelTemplateInfo.Placeholders.CurLabel]: k + 1,
                    [xmlLabelTemplateInfo.Placeholders.LineLabelCt]: lineLabelCount,
                    [xmlLabelTemplateInfo.Placeholders.LotNumber]: lotNumber,
                    [xmlLabelTemplateInfo.Placeholders.Brand]: brand,
                    [xmlLabelTemplateInfo.Placeholders.ProductStub]: productStub,
                    [xmlLabelTemplateInfo.Placeholders.MasterCase]: masterCase,
                    [xmlLabelTemplateInfo.Placeholders.ItemDisplayName]: itemName
                };
                const replRegex = new RegExp(Object.keys(labelFields).join('|'), 'g');


                // Start new table if completed chunk of 10 labels.
                // One main table per page. 
                // if ((labelCounter - 1) % 10 == 0) {
                if ((labelCounter - 1) % labelCountPerPage == 0) {
                    xmlFinal += '<table class="maintable">';
                }

                // Start tr row if writing label to first column
                // if ((labelCounter - 1) % 2 == 0) {
                if ((labelCounter - 1) % colsPerPage == 0) {
                    xmlFinal += '<tr>';
                }

                let labelXml = xmlLabelTemplateInfo.Xml.replace(
                    replRegex, (matched) => labelFields[matched]
                );

                xmlFinal += '\n<td>' + labelXml + '\n</td>';

                // If we have more data to process, end <table> and <row> gracefully
                if (k + 1 < lineLabelCount || resultIdx < resultCount || extras.length) {
                    if (labelCounter % labelCountPerPage == 0) {
                        // DO: End table AND page break
                        xmlFinal += '</tr></table><pbr></pbr>';

                    } else if (labelCounter % colsPerPage == 0) { // Otherwise, end tr row if wrote label to second column
                        xmlFinal += '</tr>';
                    }
                }

                lotQtyRemaining -= qtyPerLabel;
                labelCounter += 1;
            }

            lineLotsVsQuantities[lineUniqueDBKey].remainingLineQty -= curLotQty;
            lineLotsVsQuantities[lineUniqueDBKey].remainingLineQtyLotted -= curLotQty;

            // resultIdx += 1;

            // If all lotted quantity has been labeled and still lineQty > 0 for the line, then we have unlotted quantity to label 
            if (
                lineLotsVsQuantities[lineUniqueDBKey].remainingLineQtyLotted <= 0 &&
                lineLotsVsQuantities[lineUniqueDBKey].remainingLineQty > 0
            ) {
                let newLine = { ...result };
                newLine.curLotNum = FCShipLabelLib.LabelFormatting.BLANK_LOT_STRING;
                newLine.curLotQty = lineLotsVsQuantities[lineUniqueDBKey].remainingLineQty;
                extras.push(newLine);
            }

        }

        xmlFinal += '\n</tr>\n</table>\n';


    } catch (e) {
        log.error({ title: 'Error in generateShippingLabels', details: e });
        throw e;
    }

    xmlFinal = xmlMainTemplateInfo.Xml.replace(xmlMainTemplateInfo.Placeholders.Body, xmlFinal);
    remainingUsage = runtime.getCurrentScript().getRemainingUsage();

    // FIX: Write pdf to file cabinet
    // Need to input destination folder and have default if not specified

    //context.response.renderPdf(xmlFinal);
    return xmlFinal;


}








// OLD SEARCH DEFINITION


// let salesorderSearchObj = search.create({
//     type: "salesorder",
//     filters:
//         [
//             ["type", "anyof", "SalesOrd"],
//             "AND",
//             ["mainline", "is", "F"],
//             "AND",
//             ["status", "anyof", "SalesOrd:D", "SalesOrd:E", "SalesOrd:B"],
//             "AND",
//             ["item.type", "anyof", "InvtPart", "Group", "Kit"],
//             "AND",
//             ["shipping", "is", "F"],
//             "AND",
//             ["taxline", "is", "F"],
//             "AND",
//             ["shipdate", "within", getFromDate, getToDate]
//         ],
//     columns:
//         [
//             search.createColumn({ name: "shipdate", label: "Ship Date" }),
//             search.createColumn({ name: "quantity", label: "Quantity" }),
//             search.createColumn({
//                 name: "displayname",
//                 join: "item",
//                 label: "Item Display Name"
//             }),
//             search.createColumn({ name: "tranid", label: "Document Number" }),
//             search.createColumn({ name: "entity", label: "Customer Name" }),
//             search.createColumn({ name: "custbody_rd_so_route", label: "Route" }),
//             search.createColumn({
//                 name: "itemid",
//                 join: "item",
//                 label: "Item ID"
//             }),
//             search.createColumn({
//                 name: "custitem_fc_brand",
//                 join: "item",
//                 label: "Item Brand"
//             }),
//             search.createColumn({
//                 name: "custitem_fc_product_stub",
//                 join: "item",
//                 label: "Product Stub"
//             }),
//             search.createColumn({
//                 name: "custitem_fc_mastercase",
//                 join: "item",
//                 label: "Master Case"
//             }),
//             search.createColumn({
//                 name: "custitem_fc_qtypershippinglabel",
//                 join: "item",
//                 label: "Qty per Shipping Label"
//             }),
//             search.createColumn({
//                 name: "lineuniquekey",
//                 label: "Line Unique Key"
//             }),
//             // search.createColumn({
//             //     name: "serialnumber",
//             //     sort: search.Sort.ASC,
//             //     label: "Transaction Serial/Lot Number"
//             //  }),
//             //  search.createColumn({
//             //     name: "serialnumberquantity",
//             //     sort: search.Sort.ASC,
//             //     label: "Transaction Serial/Lot Number Quantity"
//             //  }),
//             search.createColumn({
//                 name: "quantity",
//                 join: "inventoryDetail",
//                 label: "Quantity"
//             }),
//             search.createColumn({
//                 name: "inventorynumber",
//                 join: "inventoryDetail",
//                 label: " Number"
//             })

//         ]
// });


// // let pagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });
// let searchResultsRaw = salesorderSearchObj.run().getRange({
//     start: 0,
//     end: 1000
// });
// let searchResults = searchResultsRaw.map(function (result) {
//     return {
//         customerName: result.getText({ name: "entity" }),
//         shipDate: result.getValue({ name: "shipdate" }),
//         routeName: result.getText({ name: "custbody_rd_so_route" }),
//         soDocNumber: result.getValue({ name: "tranid", label: "SO#" }),
//         itemId: result.getValue({ name: "itemid", join: "item" }),
//         itemDisplayName: result.getValue({ name: "displayname", join: "item" }),
//         lineQty: parseFloat(result.getValue({ name: "quantity" })),
//         itemBrand: result.getText({ name: "custitem_fc_brand", join: "item" }),
//         itemStub: result.getValue({ name: "custitem_fc_product_stub", join: "item" }),
//         itemMasterCase: result.getValue({ name: "custitem_fc_mastercase", join: "item" }),
//         qtyPerLabel: parseFloat(result.getValue({ name: "custitem_fc_qtypershippinglabel", join: "item" }) || 1),
//         lineUniqueKey: result.getValue({ name: "lineuniquekey" }),
//         // curLotNum: result.getValue({ name: "serialnumber" }),
//         // curLotQty: result.getValue({ name: "serialnumberquantity" })
//         curLotNum: result.getText({ name: "inventorynumber", join: "inventoryDetail" }),

//         // This line is important.
//         // If the Lot Num field is null/empty, assign the line's total lineQty to curLotQty.
//         // Treats a line with no Lot # assigned as its own blank Lot.
//         // NOTE: This assumes that the saved search does NOT return a separate row for the unassigned
//         //   quantity of a line with a mix of assigned/unassigned lots within the line.
//         curLotQty:
//             parseFloat(result.getValue({ name: "inventorynumber", join: "inventoryDetail" }) ?
//                 result.getValue({ name: "quantity", join: "inventoryDetail" }) || 0 :
//                 result.getValue({ name: "quantity" }) || 0)
