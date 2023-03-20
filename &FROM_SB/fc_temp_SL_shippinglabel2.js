// const filepath_scripttemplate_main = "./resources/fc_shippinglabel_scripttemplate1_main.xml";
// const filepath_scripttemplate_label = "./resources/fc_shippinglabel_scripttemplate1_label.xml";

const filepath_scripttemplate_main = "./resources/fc_shippinglabel_scripttemplate2_main.xml";
const filepath_scripttemplate_label = "./resources/fc_shippinglabel_scripttemplate2_label.xml";

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/record', 'N/redirect', 'N/render', 'N/xml', 'N/search', 'N/file'],
    function (ui, runtime, record, redirect, render, xml, search, file) {
        function ShippingLabels(context) {

            let request = context.request;
            let remainingUsage = runtime.getCurrentScript().getRemainingUsage();
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
                shipping_form.addSubmitButton({ label: 'Print' });
                shipping_form.addResetButton({ label: 'Cancel' });

                context.response.writePage(shipping_form);

            } else {  // POST -- creating label file
                let request = context.request;
                let getFromDate = request.parameters.custpage_from_date;
                let getToDate = request.parameters.custpage_to_date;

                // DO: Wrap this in try/catch
                let xmlMainTemplate;
                let xmlLabelTemplate;

                let xmlMainTemplateFile = file.load({
                    id: filepath_scripttemplate_main
                });

                if (xmlMainTemplateFile.size < 10485760) {
                    xmlMainTemplate = xmlMainTemplateFile.getContents();
                }
                let xmlLabelTemplateFile = file.load({
                    id: filepath_scripttemplate_label
                });

                if (xmlLabelTemplateFile.size < 10485760) {
                    xmlLabelTemplate = xmlLabelTemplateFile.getContents();
                }

                // AM: Transition this search to loading a saved search
                let salesorderSearchObj = search.create({
                    type: "salesorder",
                    filters:
                        [
                            ["type","anyof","SalesOrd"], 
                            "AND", 
                            ["mainline","is","F"], 
                            "AND", 
                            ["status","anyof","SalesOrd:D","SalesOrd:E","SalesOrd:B"], 
                            "AND", 
                            ["item.type","anyof","InvtPart","Group","Kit"], 
                            "AND", 
                            ["shipping","is","F"], 
                            "AND", 
                            ["taxline","is","F"],
                            "AND",
                            ["shipdate", "within", getFromDate, getToDate]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "shipdate", label: "Ship Date" }),
                            search.createColumn({ name: "quantity", label: "Quantity" }),
                            search.createColumn({
                                name: "displayname",
                                join: "item",
                                label: "Item Display Name"
                            }),
                            search.createColumn({ name: "tranid", label: "Document Number" }),
                            search.createColumn({ name: "entity", label: "Customer Name" }),
                            search.createColumn({ name: "custbody_rd_so_route", label: "Route" }),
                            search.createColumn({
                                name: "itemid",
                                join: "item",
                                label: "Item ID"
                            }),
                            search.createColumn({
                                name: "custitem_fc_brand",
                                join: "item",
                                label: "Item Brand"
                            }),
                            search.createColumn({
                                name: "custitem_fc_product_stub",
                                join: "item",
                                label: "Product Stub"
                            }),
                            search.createColumn({
                                name: "custitem_fc_mastercase",
                                join: "item",
                                label: "Master Case"
                            }),
                            search.createColumn({
                                name: "custitem_fc_qtypershippinglabel",
                                join: "item",
                                label: "Qty per Shipping Label"
                            }),
                            search.createColumn({
                                name: "lineuniquekey", 
                                label: "Line Unique Key"
                            }),
                            // search.createColumn({
                            //     name: "serialnumber",
                            //     sort: search.Sort.ASC,
                            //     label: "Transaction Serial/Lot Number"
                            //  }),
                            //  search.createColumn({
                            //     name: "serialnumberquantity",
                            //     sort: search.Sort.ASC,
                            //     label: "Transaction Serial/Lot Number Quantity"
                            //  }),
                             search.createColumn({
                                name: "quantity",
                                join: "inventoryDetail",
                                label: "Quantity"
                             }),
                             search.createColumn({
                                name: "inventorynumber",
                                join: "inventoryDetail",
                                label: " Number"
                             })

                        ]
                });


                // let pagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });
                let searchResultsRaw = salesorderSearchObj.run().getRange({
                    start: 0,
                    end: 1000
                });
                let searchResults = searchResultsRaw.map(function(result){
                    return {
                        customerName: result.getText({ name: "entity" }),
                        shipDate: result.getValue({ name: "shipdate" }),
                        routeName: result.getText({ name: "custbody_rd_so_route" }),
                        soDocNumber: result.getValue({ name: "tranid", label: "SO#" }),
                        itemId: result.getValue({ name: "itemid", join: "item" }),
                        itemDisplayName: result.getValue({ name: "displayname", join: "item" }),
                        lineQty: parseFloat(result.getValue({ name: "quantity" })),
                        itemBrand: result.getText({ name: "custitem_fc_brand", join: "item" }),
                        itemStub: result.getValue({ name: "custitem_fc_product_stub", join: "item" }),
                        itemMasterCase: result.getValue({ name: "custitem_fc_mastercase", join: "item" }),
                        itemQtyPerShippingLabel: parseFloat(result.getValue({ name: "custitem_fc_qtypershippinglabel", join: "item" }) || 1),
                        lineUniqueKey: result.getValue({ name: "lineuniquekey" }),
                        // curLotNum: result.getValue({ name: "serialnumber" }),
                        // curLotQty: result.getValue({ name: "serialnumberquantity" })
                        curLotNum: result.getText({ name: "inventorynumber", join: "inventoryDetail" }),

                        // This line is important. 
                        // If the Lot Num field is null/empty, assign the line's total lineQty to curLotQty. 
                        // Treats a line with no Lot # assigned as its own blank Lot. 
                        // NOTE: This assumes that the saved search does NOT return a separate row for the unassigned 
                        //   quantity of a line with a mix of assigned/unassigned lots within the line.  
                        curLotQty: 
                            parseFloat(result.getValue({ name: "inventorynumber", join: "inventoryDetail" }) ? 
                                result.getValue({ name: "quantity", join: "inventoryDetail" }) || 0 :
                                result.getValue({ name: "quantity" }) || 0)
                    };
                });

                let lineLotsVsQuantities = {};
                for (const result of searchResults) {
                    if (!(result.lineUniqueKey in lineLotsVsQuantities)) {
                        lineLotsVsQuantities[result.lineUniqueKey] = {
                            remainingLineQty: result.lineQty,
                            remainingLineQtyLotted: 0
                        }
                    }

                    lineLotsVsQuantities[result.lineUniqueKey].remainingLineQtyLotted += result.curLotQty;
                }

                let resultCount = searchResults.length;
                let xmlFinal = "";
                let labelCounter = 1;
                let resultIdx = 0;

                let extras = [];                

                while (resultIdx < resultCount || extras.length){
                    let result = {};
                    if (extras.length){
                        result = extras.pop();
                    } else {
                        result = searchResults[resultIdx];
                        resultIdx += 1;
                    }

                    // if (!result.itemQtyPerShippingLabel || result.itemQtyPerShippingLabel <= 0) {
                    //     itemQtyPerShippingLabel = 1;
                    // }


                    // FIX: This will probably fail if we have more than one partial-qty item
                    let lineLabelCount = Math.ceil(result.curLotQty / result.itemQtyPerShippingLabel);
                    let lotQtyRemaining = result.curLotQty;

                    for (let k = 0; k < lineLabelCount; k++) {  // individual label
                        let thisLabelQty = Math.min(lotQtyRemaining, result.itemQtyPerShippingLabel);

                        // Start new table if completed chunk of 10 labels.
                        // One main table per page. 
                        if ((labelCounter - 1) % 10 == 0) {
                            xmlFinal += `<table class="maintable">`;
                        }

                        // Start tr row if writing label to first column
                        if ((labelCounter - 1) % 2 == 0) {
                            xmlFinal += '<tr>';
                        }

                        // TEMP: Calculate lot number
                        // let thisLotNum = "TempLotNum1"

                        let labelFields = {
                            '<!--ENTITYNAME-->': result.customerName,
                            '<!--SHIPDATE-->': result.shipDate,
                            '<!--ROUTENAME-->': result.routeName,
                            '<!--ITEMID-->': result.itemId,
                            '<!--ORDERID-->': result.soDocNumber,
                            //'<!--ITEMDISPLAYNAME-->': result.itemDisplayName,
                            '<!--LABELQTY-->': thisLabelQty,
                            '<!--CURLABEL-->': k + 1,
                            '<!--LABELCTFORITEM-->': lineLabelCount,
                            '<!--LOTNUM-->': result.curLotNum,
                            '<!--ITEMBRAND-->': result.itemBrand,
                            '<!--ITEMSTUB-->': result.itemStub,
                            '<!--ITEMMASTERCASE-->': result.itemMasterCase
                        }

                        const replRegex = new RegExp(Object.keys(labelFields).join('|'), 'g');
                        xmlFinal += `
                            <td>
                            `;
                        xmlFinal += xmlLabelTemplate.replace(
                            replRegex, (matched) => labelFields[matched]
                        );
                        xmlFinal += `
                            </td>
                            `;
                        
                        // If we have more data to process, end <table> and <row> gracefully
                        if (k + 1 < lineLabelCount || resultIdx < resultCount || extras.length) {
                            if (labelCounter % 10 == 0) {
                                // DO: End table AND page break
                                xmlFinal += `
                                </tr>
                                </table>
                                <pbr></pbr>
                                `;
                            } else if (labelCounter % 2 == 0) { // Otherwise, end tr row if wrote label to second column
                                xmlFinal += `</tr>`;
                            }
                        }

                        lotQtyRemaining -= result.itemQtyPerShippingLabel;
                        labelCounter += 1;
                    }


                    lineLotsVsQuantities[result.lineUniqueKey].remainingLineQty -= result.curLotQty;
                    lineLotsVsQuantities[result.lineUniqueKey].remainingLineQtyLotted -= result.curLotQty;

                    // resultIdx += 1;

                    // If all lotted quantity has been labeled and still lineQty > 0 for the line, then we have unlotted quantity to label 
                    if (
                        lineLotsVsQuantities[result.lineUniqueKey].remainingLineQtyLotted <= 0 && 
                        lineLotsVsQuantities[result.lineUniqueKey].remainingLineQty > 0
                    ){
                        let newLine = {...result};
                        newLine.curLotNum = "---";
                        newLine.curLotQty = lineLotsVsQuantities[result.lineUniqueKey].remainingLineQty;
                        extras.push(newLine);
                    }

                }

                xmlFinal += `
                    </tr>
                    </table>
                    `;
                xmlFinal = xmlMainTemplate.replace('<!--BODY_XML-->', xmlFinal);


                // //creating CSV file
                // var fileObj = file.create({
                //     name: 'fclabelsxml.txt',
                //     fileType: file.Type.PLAINTEXT,
                //     contents: xmlFinal
                // });  
                // context.response.writeFile({
                //     file:fileObj,
                //     isInline:false
                // });
                // return; 

                remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                context.response.renderPdf(xmlFinal);

            }

        }
        return {
            onRequest: ShippingLabels
        }
    });
