/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

var modulePathShippingLabelLibrary = './fc-shipping-labels.library.module.js';

var
    runtime,
    record,
    render,
    xml,
    search,
    file,
    FCShipLabelLib;


define(['N/runtime', 'N/record', 'N/render', 'N/xml', 'N/search', 'N/file', modulePathShippingLabelLibrary], main);

function main(runtimeModule, recordModule, renderModule, xmlModule, searchModule, fileModule, FCShipLabelLibModule) {
    runtime = runtimeModule;
    record = recordModule;
    render = renderModule;
    xml = xmlModule;
    search = searchModule;
    file = fileModule;
    FCShipLabelLib = FCShipLabelLibModule;

    if (context.request.method === 'GET') {
    }
    else {   // POST
    }
    return {
        onRequest: generateShippingLabels
    }

}


function generateShippingLabels(context, printFormat = FCShipLabelLib.LabelFormatting.PrintFormat.PDF_AVERY_8X11) {
    // TRY/CATCH
    try {
        if (!(printFormat in FCShipLabelLib.LabelFormatting.PrintFormat)) {
            throw new Error(
                `Invalid print format:  + ${printFormat}
                 Valid formats are: ${Object.values(FCShipLabelLib.LabelFormatting.PrintFormat).join(', ')}`
            );
        }

        // let request = context.request;
        let getFromDate = request.parameters.custpage_from_date;
        let getToDate = request.parameters.custpage_to_date;


        let searchResults = FCShipLabelLib.runLotNumberedShippingLabelSearch({
            soShipStartDate: getFromDate,
            soShipEndDate: getToDate,
            // vendorInternalIds = [],            // Preferred vendor / primary vendor -- need to add this to search? 
            // customerInternalIds = [],
        });

        let lineLotsVsQuantities = {};
        for (const result of searchResults) {
            let lineUniqueKey = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.TransLineUniqueKey];
            let lineQty = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.LineQty];
            let curLotQty = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.CurLotQty];

            if (!(lineUniqueKey in lineLotsVsQuantities)) {
                lineLotsVsQuantities[lineUniqueKey] = {
                    remainingLineQty: lineQty,
                    remainingLineQtyLotted: 0
                }
            }

            lineLotsVsQuantities[lineUniqueKey].remainingLineQtyLotted += curLotQty;
        }

        let resultCount = searchResults.length;
        let xmlFinal = "";
        let labelCounter = 1;
        let resultIdx = 0;

        let extras = [];

        while (resultIdx < resultCount || extras.length) {
            let result = {};
            if (extras.length) {
                result = extras.pop();
            } else {
                result = searchResults[resultIdx];
                resultIdx += 1;
            }

            let soShipDate = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.SOShipDate];
            let soLineQuantity = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.soLineQuantity];
            let lineUniqueDBKey = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.TransLineUniqueKey];
            let soNumber = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.SONumber];
            let customer = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.Customer];
            let route = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.Route];
            let itemId = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.ItemId];
            let itemName = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.ItemName];
            let brand = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.Brand];
            let productStub = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.ProductStub];
            let masterCase = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.MasterCase];
            let qtyPerLabel = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.QtyPerLabel];
            let lotNumber = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.LotNumber];
            let lotQuantity = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.LotQuantity];
            let curLotQty = result[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldNames.CurLotQty];


            if (!qtyPerLabel || qtyPerLabel <= 0) {
                qtyPerLabel = 1;
            }

            // Start generating labels
            // We can generate labels in two formats:
            //   1) 8x11 Avery sheet 5163 PDF > regular printer
            //   2) 2x4 single label/sheet PDF > Zebra printer
            // Depending on the type chosen, we will load the appropriate XML and handle logic differently

            let xmlMainTemplate = printFormat.TemplateMain;
            let xmlLabelTemplate = printFormat.TemplateLabel;
            let rowsPerPage = xmlMainTemplate.LabelRowsPerPage;
            let colsPerPage = xmlMainTemplate.LabelColsPerPage;
            let labelCountPerPage = rowsPerPage * colsPerPage;

            // FIX: This will probably fail if we have more than one partial-qty item
            let lineLabelCount = Math.ceil(curLotQty / qtyPerLabel);
            let lotQtyRemaining = curLotQty;
            let labelTemplateSettings = FCShipLabelLib.Resources.XMLTemplate2x4Label;

            for (let k = 0; k < lineLabelCount; k++) {  // individual label
                let thisLabelQty = Math.min(lotQtyRemaining, result.qtyPerLabel);
                let labelFields = {
                    [labelTemplateSettings.Placeholders.Customer]: customer,
                    [labelTemplateSettings.Placeholders.SOShipDate]: soShipDate,
                    [labelTemplateSettings.Placeholders.Route]: route,
                    [labelTemplateSettings.Placeholders.ItemId]: itemId,
                    [labelTemplateSettings.Placeholders.SONumber]: soNumber,
                    [labelTemplateSettings.Placeholders.LabelQty]: thisLabelQty,
                    [labelTemplateSettings.Placeholders.CurLabel]: k + 1,
                    [labelTemplateSettings.Placeholders.LineLabelCt]: lineLabelCount,
                    [labelTemplateSettings.Placeholders.LotNumber]: lotNumber,
                    [labelTemplateSettings.Placeholders.Brand]: brand,
                    [labelTemplateSettings.Placeholders.ProductStub]: productStub,
                    [labelTemplateSettings.Placeholders.MasterCase]: masterCase,
                    [labelTemplateSettings.Placeholders.ItemDisplayName]: itemName
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

                let labelXml = xmlLabelTemplate.replace(
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
            xmlFinal = xmlMainTemplate.replace(xmlMainTemplate.Placeholders.Body, xmlFinal);
        }

    } catch (e) {
        log.error({ title: 'Error in generateShippingLabels', details: e });
        throw e;
    }

    remainingUsage = runtime.getCurrentScript().getRemainingUsage();

    // FIX: Write pdf to file cabinet
    // Need to input destination folder and have default if not specified
    try {

        context.response.renderPdf(xmlFinal);

    } catch (e) {
        log.error({ title: 'Error in renderPdf', details: e });
        throw e;
    }

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
//     };
