const filepath_scripttemplate1_main = "./resources/fc_shippinglabel_scripttemplate1_main.xml";
const filepath_scripttemplate1_label = "./resources/fc_shippinglabel_scripttemplate1_label.xml";

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
                    id: filepath_scripttemplate1_main
                });

                if (xmlMainTemplateFile.size < 10485760) {
                    xmlMainTemplate = xmlMainTemplateFile.getContents();
                }
                let xmlLabelTemplateFile = file.load({
                    id: filepath_scripttemplate1_label
                });

                if (xmlLabelTemplateFile.size < 10485760) {
                    xmlLabelTemplate = xmlLabelTemplateFile.getContents();
                }

                // AM: Transition this search to loading a saved search
                let salesorderSearchObj = search.create({
                    type: "salesorder",
                    filters:
                        [
                            ["type", "anyof", "SalesOrd"],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["status", "anyof", "SalesOrd:D", "SalesOrd:E", "SalesOrd:B"],
                            "AND",
                            ["item.type", "anyof", "InvtPart", "Group", "Kit"],
                            "AND",
                            ["trandate", "within", getFromDate, getToDate]
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
                            })
                        ]
                });


                let pagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });
                let resultCount = pagedData.count;
                let labelCounter = 1;
                let resultCounter = 0;

                xmlFinal = "";

                for (let p = 0; p < pagedData.pageRanges.length; p++) {
                    let currentPage = pagedData.fetch(p);

                    currentPage.data.forEach(function (thisResult) {
                        let customerName = thisResult.getText({ name: "entity" });
                        let shipDate = thisResult.getValue({ name: "shipdate" });
                        let routeName = thisResult.getText({ name: "custbody_rd_so_route" });
                        let soDocNumber = thisResult.getValue({ name: "tranid", label: "SO#" });
                        let itemId = thisResult.getValue({ name: "itemid", join: "item" });
                        let itemDisplayName = thisResult.getValue({ name: "displayname", join: "item" });
                        let itemQty = thisResult.getValue({ name: "quantity" });
                        let itemBrand = thisResult.getText({ name: "custitem_fc_brand", join: "item" });
                        let itemStub = thisResult.getValue({ name: "custitem_fc_product_stub", join: "item" });
                        let itemMasterCase = thisResult.getValue({ name: "custitem_fc_mastercase", join: "item" });
                        let itemQtyPerShippingLabel = thisResult.getValue({ name: "custitem_fc_qtypershippinglabel", join: "item" });

                        if (itemQtyPerShippingLabel == '' || itemQtyPerShippingLabel == null || itemQtyPerShippingLabel <= 0) {
                            itemQtyPerShippingLabel = 1;
                        }

                        let lineLabelCount = Math.ceil(itemQty / itemQtyPerShippingLabel);
                        let itemQtyRemaining = itemQty;

                        for (let k = 0; k < lineLabelCount; k++) {  // individual label
                            let thislabelQty = Math.min(itemQtyRemaining, itemQtyPerShippingLabel);

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
                            let thisLotNum = "TempLotNum1"

                            let labelFields = {
                                '<!--ENTITYNAME-->': customerName,
                                '<!--SHIPDATE-->': shipDate,
                                '<!--ROUTENAME-->': routeName,
                                '<!--ITEMID-->': itemId,
                                '<!--ORDERID-->': soDocNumber,
                                '<!--ITEMDISPLAYNAME-->': itemDisplayName,
                                '<!--LABELQTY-->': thislabelQty,
                                '<!--CURLABEL-->': k + 1,
                                '<!--LABELCTFORITEM-->': lineLabelCount,
                                '<!--LOTNUM-->': thisLotNum

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
                            
                            if (k < lineLabelCount - 1 || resultCounter < resultCount - 1) {
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

                            itemQtyRemaining -= itemQtyPerShippingLabel;
                            labelCounter += 1;
                        }

                        resultCounter += 1;
                    });

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
        }
        return {
            onRequest: ShippingLabels
        }
    });
