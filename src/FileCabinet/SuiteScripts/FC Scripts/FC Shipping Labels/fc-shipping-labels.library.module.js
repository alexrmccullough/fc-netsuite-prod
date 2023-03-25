var fcLibModulePath = 'SuiteScripts/FC Scripts/Libraries/FC_MainLibrary.js';

var query,
    task,
    runtime,
    email,
    FCLib;


define(['N/query', 'N/task', 'N/runtime', 'N/email', 'N/search', fcLibModulePath], main);

function main(queryModule, taskModule, runtimeModule, emailModule, fcLibModule) {
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;
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
                FieldToValueMap: {
                    'shipdate': { getType: 'value', recast: null },
                    'quantity': { getType: 'value', recast: parseFloat },
                    'lineuniquekey': { getType: 'value', recast: null },
                    'tranid': { getType: 'value', recast: null },
                    'entity': { getType: 'text', recast: null },
                    'custbody_rd_so_route': { getType: 'text', recast: null },
                    'item.itemid': { getType: 'value', recast: null },
                    'item.displayname': { getType: 'value', recast: null },
                    'item.custitem_fc_brand': { getType: 'text', recast: null },
                    'item.custitem_fc_product_stub': { getType: 'value', recast: null },
                    'item.custitem_fc_mastercase': { getType: 'value', recast: null },
                    'item.custitem_fc_qtypershippinglabel': { getType: 'value', recast: parseFloat },
                    'inventoryDetail.quantity': { getType: 'value', recast: null },
                    'inventoryDetail.inventorynumber': { getType: 'text', recast: null },
                },
                Filters: {
                    SOShipDate: 'shipdate',
                },
                InternalFieldName: {
                    SOShipDate: 'shipdate',
                    soLineQuantity: 'quantity',
                    TransLineUniqueKey: 'lineuniquekey',
                    SONumber: 'tranid',
                    Customer: 'entity',
                    Route: 'custbody_rd_so_route',
                    ItemId: 'item.itemid',
                    ItemName: 'item.displayname',
                    Brand: 'item.custitem_fc_brand',
                    ProductStub: 'item.custitem_fc_product_stub',
                    MasterCase: 'item.custitem_fc_mastercase',
                    QtyPerLabel: 'item.custitem_fc_qtypershippinglabel',
                    LotNumber: 'inventoryDetail.inventorynumber',
                    LotQuantity: 'inventoryDetail.quantity',
                    CurLotQty: 'curlotqty'
                },
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
            FileId: -1,
            Placeholders: {
                Body: '<!--@@BODY_XML@@-->',
            } 
        },
        XMLTemplate2x4ZebraMain: {
            LabelRowsPerPage: 1,
            LabelColsPerPage: 1,
            Path: './fc-shipping-labels.generate-pdf.template2x4zebra.main.xml',
            FileId: -1,
            Placeholders: {
                Body: '<!--@@BODY_XML@@-->',
            }
        },
        XMLTemplate2x4Label: {
            Path: './fc-shipping-labels.generate-pdf.template_general.label.xml',
            FileId: -1,
            Placeholders: {
                Customer: '<!--@@ENTITYNAME@@-->',
                SOShipDate: '<!--@@SHIPDATE@@-->',
                Route: '<!--@@ROUTENAME@@-->',
                ItemId: '<!--@@ITEMID@@-->',
                SONumber: '<!--@@ORDERID@@-->',
                ItemDisplayName: '<!--@@ITEMDISPLAYNAME@@-->',
                LabelQty: '<!--@@LABELQTY@@-->',
                CurLabel: '<!--@@CURLABEL@@-->',
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

        soShipStartDate = new Date(startDate);
        soShipEndDate = new Date(endDate);

        // Build filters
        let filters = [];

        if (soShipStartDate && soShipEndDate) {
            filters.push(
                search.createFilter({
                    name: Resources.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.SOShipDate,
                    operator: search.Operator.WITHIN,
                    values: [soShipStartDate, soShipEndDate]
                }));
        } else if (soShipStartDate) {
            filters.push(
                search.createFilter({
                    name: Resources.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.SOShipDate,
                    operator: search.Operator.ONORAFTER,
                    values: [soShipStartDate]
                }));
        } else if (soShipEndDate) {
            filters.push(
                search.createFilter({
                    name: Resources.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.SOShipDate,
                    operator: search.Operator.ONORBEFORE,
                    values: [soShipEndDate]
                }));
        }

        if (vendorIds.length > 0) {
            filters.push(
                search.createFilter({
                    name: Resources.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.PreferredVendor,
                    operator: search.Operator.ANYOF,
                    values: vendorInternalIds
                }));
        }

        if (customerIds.length > 0) {
            filters.push(
                search.createFilter({
                    name: Resources.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Filters.Customer,
                    operator: search.Operator.ANYOF,
                    values: customerInternalIds
                }));
        }


        // Run search on date filter
        let searchResultsRaw = FCLib.runSavedSearchToMappedRows(
            Resources.Searches.SHIPPING_LABEL_SS_MAIN_IDS.Id,
            filters
        );

        const searchColFieldToValueMap = Resources.Searches.SHIPPING_LABEL_SS_MAIN_IDS.FieldToValueMap;
        const searchColFieldNames = Object.keys(searchColFieldToValueMap);

        // Validate that the search results have all the expected columns

        //Filter out the column names that are in the search results
        const searchResultRawColNames = Object.keys(searchResultsRaw.columns);

        let searchColFieldNamesMissing = searchColFieldNames.filter(function (searchColName) {
            return !searchResultRawColNames.columns.hasOwnProperty(searchColName);
        });

        // FIX: Add Try/Catch block
        if (searchColFieldNamesMissing.length > 0) {
            throw new Error('The following columns are missing from the search results: ' + searchColFieldNamesMissing.join(', '));
        }

        // Next, simplify the data structure to choose only the value || text, depending on the field
        let searchResultData = {};

        // Prepare special case column names
        const curLotQtyColName = exports.Searches.SHIPPING_LABEL_SS_MAIN_IDS.InternalFieldName.CurLotQty;

        for (let i = 0; i < searchResultsRaw.data.length; i++) {
            let rawRow = searchResultsRaw.data[i];
            let row = {};

            // Add all the simplified row values to the row object 
            for (let j = 0; j < searchColFieldNames.length; j++) {
                let colName = searchColFieldNames[j];
                let value = rawRow[colName][searchColFieldToValueMap[colName].getType];      // e.g. row['itemid']['value']

                let recast = searchColFieldToValueMap[colName].recast;
                if (recast) {
                    value = recast(value);
                }

                row[colName] = value;
            }

            // Special case: If the Lot Num field is null/empty, assign the line's total lineQty to curLotQty.
            // Treats a line with no Lot # assigned as its own blank Lot.
            // NOTE: This assumes that the saved search does NOT return a separate row for the unassigned
            //   quantity of a line with a mix of assigned/unassigned lots within the line.
            if (row['inventoryDetail.inventorynumber'] && row['inventoryDetail.inventorynumber'] > 0) {
                row[curLotQtyColName] = row['inventoryDetail.inventorynumber'];
            } else {
                row[curLotQtyColName] = row['quantity'];
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
        searchResultsRaw.columns[curLotQtyColName] = {
            label: 'Line Lot Qty Generic',
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
