var fcLibModulePath = '../Libraries/FC_MainLibrary.js';

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
                InternalId: 2136,
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
            FileId: 27457,
            Placeholders: {
                Body: '<!--@@BODY_XML@@-->',
            }
        },
        XMLTemplate2x4ZebraMain: {
            LabelRowsPerPage: 1,
            LabelColsPerPage: 1,
            Path: './fc-shipping-labels.generate-pdf.template2x4zebra.main.xml',
            FileId: 27456,
            Placeholders: {
                Body: '<!--@@BODY_XML@@-->',
            },
        },
        XMLTemplate2x4Label: {
            Path: './fc-shipping-labels.generate-pdf.template_general.label.xml',
            FileId: 27455,
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


    function runLotNumberedShippingLabelSearch({
        soShipStartDate = null,
        soShipEndDate = null,
        vendorInternalIds = [],            // Preferred vendor / primary vendor -- need to add this to search? 
        customerInternalIds = [],
    } = {}) {

        soShipStartDate = soShipStartDate ? new Date(soShipStartDate) : null;
        soShipEndDate = soShipEndDate ? new Date(soShipEndDate) : null;

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


        // Run search on date filter
        let searchResultsRaw = FCLib.runSearch(
            exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Id,
            filters
        );

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
