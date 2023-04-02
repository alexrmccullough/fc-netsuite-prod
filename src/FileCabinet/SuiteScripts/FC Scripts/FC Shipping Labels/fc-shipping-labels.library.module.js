var fcLibModulePath = '../Libraries/fc-main.library.module.js';

var query,
    task,
    runtime,
    email,
    FCLib;


define(['N/query', 'N/task', 'N/runtime', 'N/email', 'N/search', fcLibModulePath], main);

function main(queryModule, taskModule, runtimeModule, emailModule, searchModule, fcLibModule) {
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;
    search = searchModule;
    FCLib = fcLibModule;

    var exports = {
        Form: {
        },
        Sublists: {
        },
        Searches: {
            SHIPPING_LABEL_SS_MAIN_IDS: {
                Id: 'customsearch_fc_shippinglabel_mainstatic',
                // InternalId: 2136,
                Filters: {
                    SOShipDate: {
                        name: 'shipdate',
                        join: '',
                    },
                    PreferredVendor: {
                        name: 'vendor',
                        join: 'item',
                    },
                    Customer: {
                        name: 'entity',
                        join: ''
                    },
                    ItemIsJit: {
                        name: 'custitem_soft_comit',
                        join: 'item',
                    }

                },
                RequiredFields: {
                    SOShipDate: {
                        nsSsFieldId: 'shipdate',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    SOLineQuantity: {
                        nsSsFieldId: 'quantity',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    TransLineUniqueKey: {
                        nsSsFieldId: 'lineuniquekey',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    SONumber: {
                        nsSsFieldId: 'tranid',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    Customer: {
                        nsSsFieldId: 'entity',
                        nsSsTargetGetType: 'text',
                        recastValueFunc: null,
                    },
                    Route: {
                        nsSsFieldId: 'custbody_rd_so_route',
                        nsSsTargetGetType: 'text',
                        recastValueFunc: null,
                    },
                    ItemId: {
                        nsSsFieldId: 'item.itemid',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    ItemInternalId: {
                        nsSsFieldId: 'item.internalid',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    ItemName: {
                        nsSsFieldId: 'item.displayname',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    Brand: {
                        nsSsFieldId: 'item.custitem_fc_brand',
                        nsSsTargetGetType: 'text',
                        recastValueFunc: null,
                    },
                    ProductStub: {
                        nsSsFieldId: 'item.custitem_fc_product_stub',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    MasterCase: {
                        nsSsFieldId: 'item.custitem_fc_mastercase',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    QtyPerLabel: {
                        nsSsFieldId: 'item.custitem_fc_qtypershippinglabel',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    LotNumber: {
                        nsSsFieldId: 'inventoryDetail.inventorynumber',
                        nsSsTargetGetType: 'text',
                        recastValueFunc: null,
                    },
                    LotQuantity: {
                        nsSsFieldId: 'inventoryDetail.quantity',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                    },
                    PreferredVendor: {
                        nsSsFieldId: 'item.vendor',
                        nsSsTargetGetType: 'text',
                        recastValueFunc: null,
                    },
                    TotalLottedQtyInLine: {                 //FIX: UNUSED?
                        nsSsFieldId: 'formulanumeric',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                        displayName: 'Total Lotted Qty In Line',
                    },
                    TotalUnlottedQtyInLine: {
                        nsSsFieldId: 'formulanumeric_1',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                        displayName: 'Total Unlotted Qty In Line',
                    },
                    LottedQtyCompletedSoFar: {              // FIX: UNUSED?
                        nsSsFieldId: 'formulanumeric_2',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                        displayName: 'Lotted Qty Completed So Far',
                    },
                    IsLastLotOfLine: {
                        nsSsFieldId: 'formulatext',
                        nsSsTargetGetType: 'value',
                        recastValueFunc: null,
                        displayName: 'Is Last Lot of Line?',
                    }

                },
                AddedFields: {
                    CurLotQty: {
                        fieldId: 'temp.curlotqty',
                        outputLabel: 'Current Lot Qty',
                    },
                }
            }
        },
        Urls: {
        },
        Lookups: {
        },
        Queries: {
        },
    };


    var Resources = {
        XMLTemplate8x11Main: {
            LabelRowsPerPage: 5,
            LabelColsPerPage: 2,
            Path: './fc-shipping-labels.generate-pdf.template8x11.main.xml',
            // FileId: 27457,    // PROD
            FileId: 28770,
            Placeholders: {
                Body: '<!--@@BODY_XML@@-->',
            }
        },
        XMLTemplate2x4ZebraMain: {
            LabelRowsPerPage: 1,
            LabelColsPerPage: 1,
            Path: './fc-shipping-labels.generate-pdf.template2x4zebra.main.xml',
            // FileId: 27456,   // PROD
            FileId: 28769,
            Placeholders: {
                Body: '<!--@@BODY_XML@@-->',
            },
        },
        XMLTemplate2x4Label: {
            Path: './fc-shipping-labels.generate-pdf.template_general.label.xml',
            // FileId: 27455,     // PROD
            FileId: 28768,
            Placeholders: {
                Customer: '<!--@@ENTITYNAME@@-->',
                SOShipDate: '<!--@@SHIPDATE@@-->',
                Route: '<!--@@ROUTENAME@@-->',
                ItemId: '<!--@@ITEMID@@-->',
                SONumber: '<!--@@ORDERID@@-->',
                ItemDisplayName: '<!--@@ITEMDISPLAYNAME@@-->',
                LabelQty: '<!--@@LABELQTY@@-->',
                LabelPos: '<!--@@LABELPOS@@-->',
                LineLabelCt: '<!--@@LABELCTFORITEM@@-->',
                LotNumber: '<!--@@LOTNUM@@-->',
                Brand: '<!--@@ITEMBRAND@@-->',
                ProductStub: '<!--@@ITEMSTUB@@-->',
                MasterCase: '<!--@@ITEMMASTERCASE@@-->',
            }
        },
    };


    var LabelFormatting = {
        BLANK_LOT_STRING: '---',
        PrintFormat: {
            PDF_AVERY_8X11: {
                TemplateMain: Resources.XMLTemplate8x11Main,
                TemplateLabel: Resources.XMLTemplate2x4Label,
            },
            PDF_ZEBRA_2X4: {
                TemplateMain: Resources.XMLTemplate2x4ZebraMain,
                TemplateLabel: Resources.XMLTemplate2x4Label,
            }
        },

    };

    var Ids = {
        Scripts: {
        },
        Deployments: {
        },
        Searches: {
        },
        Fields: {
        },
        Sublists: {
        },
        Folders: {
        },
        Files: {
        },
        Parameters: {
        },
        CSVImportMappings: {
        }

    };


    var Settings = {

    };

    var TempFields = {
    };

    exports.Resources = Resources;
    exports.Ids = Ids;
    exports.Settings = Settings;
    exports.TempFields = TempFields;
    exports.LabelFormatting = LabelFormatting;


    function generateShippingLabelXml(
        printFormat = 'PDF_AVERY_8X11',
        getFromDate = null,
        getToDate = null,
        vendorInternalIds = [],
        customerInternalIds = [],
    ) {
        let searchParams = {};
        if (getFromDate) { searchParams.soShipStartDate = getFromDate; }
        if (getToDate) { searchParams.soShipEndDate = getToDate; }
        if (vendorInternalIds && vendorInternalIds.length) { searchParams.vendorInternalIds = vendorInternalIds; }
        if (customerInternalIds && customerInternalIds.length) { searchParams.customerInternalIds = customerInternalIds; }

        let searchResults = runLotNumberedShippingLabelSearch(searchParams);
        
        return generateShippingLabelXmlFromSearchResults(
            searchResults,
            printFormat
            );
    }
    exports.generateShippingLabelXml = generateShippingLabelXml;



    function generateShippingLabelXmlFromSearchResults(
        searchResults,
        printFormat = 'PDF_AVERY_8X11',
        // getFromDate = null,
        // getToDate = null,
        // vendorInternalIds = [],
        // customerInternalIds = [],
    ) {
    
        var xmlFinal = "";
        var xmlMainTemplateInfo;
        var xmlLabelTemplateInfo;
    
        // TRY/CATCH
        try {
            if (!(printFormat in exports.LabelFormatting.PrintFormat)) {
                throw new Error(
                    `Invalid print format:  + ${printFormat}
                     Valid formats are: ${Object.values(exports.LabelFormatting.PrintFormat).join(', ')}`
                );
            }
            printFormat = exports.LabelFormatting.PrintFormat[printFormat];
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
    
    
            // let searchParams = {};
            // if (getFromDate) { searchParams.soShipStartDate = getFromDate; }
            // if (getToDate) { searchParams.soShipEndDate = getToDate; }
            // if (vendorInternalIds && vendorInternalIds.length) { searchParams.vendorInternalIds = vendorInternalIds; }
            // if (customerInternalIds && customerInternalIds.length) { searchParams.customerInternalIds = customerInternalIds; }
    
            // let searchResults = runLotNumberedShippingLabelSearch(searchParams);
    
            // If we have no results, return an empty string
            if (!searchResults || !searchResults.data || !searchResults.data.length) {
                return xmlInjectBodyIntoTemplate(
                    xmlMainTemplateInfo,
                    '<h3>No results found!</h3>'
                );
            }
    
            let requiredFields = exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields;
            let addedFields = exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.AddedFields;
    
    
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
                if (inExtras) {
                    quantityRemaining = curLotQty;
                } else if (lotNumber) {
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
                        [xmlLabelTemplateInfo.Placeholders.LotNumber]: lotNumber ? lotNumber : FCShipLabelLib.LabelFormatting.BLANK_LOT_STRING,
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
                    newLine[requiredFields.LotNumber.nsSsFieldId] = '';
                    newLine[addedFields.CurLotQty.fieldId] = result[requiredFields.TotalUnlottedQtyInLine.nsSsFieldId];
                    extras.push(newLine);
                }
    
                if (!inExtras) {
                    resultIdx += 1;
                }
    
            }
    
        } catch (e) {
            log.error({ title: 'Error in generateShippingLabels', details: e });
            throw e;
        }
    
        xmlFinal = xmlInjectBodyIntoTemplate(xmlMainTemplateInfo, xmlFinal);
    
        return xmlFinal;
    }
    exports.generateShippingLabelXmlFromSearchResults = generateShippingLabelXmlFromSearchResults;

    
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


    function runLotNumberedShippingLabelSearch({
        soShipStartDate = null,
        soShipEndDate = null,
        vendorInternalIds = [],            // Preferred vendor / primary vendor -- need to add this to search? 
        customerInternalIds = [],
        itemIsJit = null,
    } = {}) {

        // Validate parameters
        soShipStartDate = soShipStartDate ? 
            FCLib.getStandardDisplayDateString1(new Date(soShipStartDate)) : 
            null;
        soShipEndDate = soShipEndDate ? 
            FCLib.getStandardDisplayDateString1(new Date(soShipEndDate)) : 
            null;
        if (itemIsJit !== null) {
            if (FCLib.looksLikeYes(itemIsJit)) {
                itemIsJit = 'T';
            } else if (FCLib.looksLikeNo(itemIsJit)) {
                itemIsJit = 'F';
            }
            else {
                throw new Error('Invalid value for itemIsJit parameter. Must be boolean or string "T" or "F".');
            }
        }


        // Build filters
        let filters = [];

        if (soShipStartDate && soShipEndDate) {
            filters.push(
                search.createFilter({
                    name: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.SOShipDate.name,
                    join: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.SOShipDate.join,
                    operator: search.Operator.WITHIN,
                    values: [soShipStartDate, soShipEndDate]
                }));
        } else if (soShipStartDate) {
            filters.push(
                search.createFilter({
                    name: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.SOShipDate.name,
                    join: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.SOShipDate.join,
                    operator: search.Operator.ONORAFTER,
                    values: [soShipStartDate]
                }));
        } else if (soShipEndDate) {
            filters.push(
                search.createFilter({
                    name: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.SOShipDate.name,
                    join: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.SOShipDate.join,
                    operator: search.Operator.ONORBEFORE,
                    values: [soShipEndDate]
                }));
        }

        if (vendorInternalIds && vendorInternalIds.length > 0) {
            filters.push(
                search.createFilter({
                    name: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.PreferredVendor.name,
                    join: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.PreferredVendor.join,
                    operator: search.Operator.ANYOF,
                    values: vendorInternalIds
                }));
        }

        if (customerInternalIds && customerInternalIds.length > 0) {
            filters.push(
                search.createFilter({
                    name: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.Customer.name,
                    join: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.Customer.join,
                    operator: search.Operator.ANYOF,
                    values: customerInternalIds
                }));
        }

        if (itemIsJit !== null) {
            filters.push(
                search.createFilter({
                    name: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.ItemIsJit.name,
                    join: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.ItemIsJit.join,
                    operator: search.Operator.IS,
                    values: [itemIsJit]
                }));
        }


        // Run search on date filter
        let searchResultsRaw = FCLib.runSearch(
            exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Id,
            filters
        );

        // If the search results are empty, return an empty results obj
        if (
            !searchResultsRaw ||
            !Object.keys(searchResultsRaw) ||
            Object.keys(searchResultsRaw).length === 0 ||
            !searchResultsRaw.rows ||
            searchResultsRaw.rows.length === 0
        ) {
            return {
                columns: [],
                data: [],
            };
        }

        // const searchColFieldToValueMap = exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.FieldToValueMap;
        const internalFieldInfo = exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields;
        const internalFieldIds = Object.keys(internalFieldInfo);
        const requiredSsFieldIds = internalFieldIds.map(function (id) {
            return internalFieldInfo[id].nsSsFieldId;
        });


        // Validate that the search results have all the expected columns
        //Filter out the column names that are in the search results
        const actualSsFieldIds = Object.keys(searchResultsRaw.columns);

        let searchColFieldNamesMissing = requiredSsFieldIds.filter(function (searchColName) {
            return !(actualSsFieldIds.includes(searchColName));
        });


        if (searchColFieldNamesMissing && searchColFieldNamesMissing.length > 0) {
            throw new Error('The following columns are missing from the search results: ' + searchColFieldNamesMissing.join(', '));
        }

        // Next, simplify the data structure to choose only the value || text, depending on the field
        let searchResultData = [];

        // Prepare special case column names
        const curLotQtySsFieldId = exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.AddedFields.CurLotQty.fieldId;

        for (let i = 0; i < searchResultsRaw.rows.length; i++) {
            let rawRow = searchResultsRaw.rows[i];
            let row = {};

            // Add all the simplified row values to the row object 
            for (const [ifKey, ifSettings] of Object.entries(internalFieldInfo)) {
                // let ssFieldId = internalField.nsSsFieldId;
                let value = rawRow[ifSettings.nsSsFieldId][ifSettings.nsSsTargetGetType];      // e.g. row['itemid']['value']
                let recast = ifSettings.recastValueFunc;
                if (recast) {
                    value = recast(value);
                }

                row[ifSettings.nsSsFieldId] = value;
            }


            // Special case: If the Lot Num field is null/empty, assign the line's total lineQty to curLotQty.
            // Treats a line with no Lot # assigned as its own blank Lot.
            // NOTE: This assumes that the saved search does NOT return a separate row for the unassigned
            //   quantity of a line with a mix of assigned/unassigned lots within the line.
            if (row[internalFieldInfo.LotNumber.nsSsFieldId]) {
                // if (row[internalFieldInfo.LotNumber.nsSsFieldId] && row[internalFieldInfo.LotNumber.nsSsFieldId] > 0) {
                row[curLotQtySsFieldId] = row[internalFieldInfo.LotQuantity.nsSsFieldId];
            } else {
                row[curLotQtySsFieldId] = row[internalFieldInfo.SOLineQuantity.nsSsFieldId];
            }

            searchResultData.push(row);
        }


        // Compreshension version of the above
        // The problem is that it's hard to add in the special case logic above
        // let searchResults = searchResultsRaw.data.map(function (searchResult) {
        //     return Object.keys(searchResult).reduce((rowData, colName) => {
        //         rowData[colName] = searchResult[colName][searchColFieldToValueMap[colName]];
        //         return rowData;
        //     }, {});
        // });

        // Add in the special case column names
        searchResultsRaw.columns[curLotQtySsFieldId] = {
            label: exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.AddedFields.CurLotQty.outputLabel,
        }

        return {
            columns: searchResultsRaw.columns,
            data: searchResultData
        }
    }
    exports.runLotNumberedShippingLabelSearch = runLotNumberedShippingLabelSearch;



    function getXMLTemplate8x11Main() {
        var file = fileModule.load({
            id: Resources.XMLTemplate8x11Main.FileId
        });

        return file.getContents();
    }
    exports.getXMLTemplate8x11Main = getXMLTemplate8x11Main;


    function getXMLTemplate8x11Label() {
        var file = fileModule.load({
            id: Resources.XMLTemplate8x11Label.FileId
        });

        return file.getContents();
    }
    exports.getXMLTemplate8x11Label = getXMLTemplate8x11Label;


    return exports;
}
