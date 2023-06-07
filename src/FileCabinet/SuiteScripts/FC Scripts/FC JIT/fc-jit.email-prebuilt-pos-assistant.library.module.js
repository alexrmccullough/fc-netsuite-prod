var FCLib;
var FCClientLib;
var search;
var dayjs;


define([
    'N/search',
    '../Libraries/dayjs.min',
    '../Libraries/fc-main.library.module',
    '../Libraries/fc-client.library.module',
], main);

function main(searchModule, dayjsModule, fcLibModule, fcClientLibModule) {
    search = searchModule;
    dayjs = dayjsModule;
    FCLib = fcLibModule;
    FCClientLib = fcClientLibModule;

    var exports = {
        Queries: {
            GET_BASIC_UNSENT_PO_INFO: {
                Query: `
                WITH SentMsg AS (
                    SELECT Message.transaction AS transactionid
                    FROM Message
                    WHERE Message.transaction IS NOT NULL
                        AND Message.Emailed = 'T'
                    GROUP BY 
                        Message.transaction
                )
                SELECT Transaction.id AS pointernalid,
                    Transaction.entity as vendorid,
                    Vendor.companyName as vendorname,
                    Transaction.tranDisplayName as podisplayname,
                    Transaction.tranId as poid,
                    Transaction.dueDate as duedate,
                    Transaction.externalid as poexternalid,
                    Transaction.tranDate as transactiondate,
                    Transaction.foreignTotal * -1 as totalamount,
                    NVL2(SentMsg.transactionid, 1, 0) AS transactionemailed,
                    Transaction.createddate,
                    REPLACE(BUILTIN.DF(Transaction.status), 'Purchase Order : ') AS status_desc
                FROM Transaction
                    LEFT OUTER JOIN Vendor ON Transaction.entity = Vendor.id
                    LEFT OUTER JOIN SentMsg ON Transaction.id = SentMsg.transactionid
                WHERE Transaction.type = 'PurchOrd'
                    AND Vendor.custentity_fc_zen_soft_com_vendor = 'T'
                    AND BUILTIN.CF(Transaction.status) IN ('PurchOrd:B', 'PurchOrd:D', 'PurchOrd:E', 'PurchOrd:F')
                ORDER BY Transaction.createddate DESC
                    `,
                BuildQuery: function (poIds = null) {
                    let thisQuery = this.Query;
                    const poIdsStr = poIds ? poIds.join(',') : '';

                    let filterStrPoIds = poIds ?
                        this.Filters.POIDS.replace('@@PO_IDS@@', poIdsStr) :
                        '';

                    thisQuery = thisQuery.replace('@@PO_ID_FILTER_1@@', filterStrPoIds);
                    return thisQuery;
                },
                Filters: {
                    POIDS: 'AND (Transaction.id IN (@@PO_IDS@@))',
                },
                FieldSet1: {
                    pointernalid: {
                        fieldid: 'pointernalid',
                        label: 'PO Internal ID',
                    },
                    poexternalid: {
                        fieldid: 'poexternalid',
                        label: 'PO External ID',
                    },
                    vendorid: {
                        fieldid: 'vendorid',
                        label: 'Vendor ID',
                    },
                    vendorname: {
                        fieldid: 'vendorname',
                        label: 'Vendor Name',
                    },
                    podisplayname: {
                        fieldid: 'podisplayname',
                        label: 'PO Name',
                    },
                    poid: {
                        fieldid: 'poid',
                        label: 'PO Name',
                    },
                    duedate: {
                        fieldid: 'duedate',
                        label: 'PO Due Date',
                    },
                    transactiondate: {
                        fieldid: 'transactiondate',
                        label: 'PO Transaction Date',
                    },
                    totalamount: {
                        fieldid: 'totalamount',
                        label: 'PO Total Amount',
                    },
                    transactionemailed: {
                        fieldid: 'transactionemailed',
                        label: 'PO Emailed',
                    },
                    status: {
                        fieldid: 'status_desc',
                        label: 'PO Status',
                    },
                    createddate: {
                        fieldid: 'createddate',
                        label: 'PO Created Date',
                    }
                },
            },

            GET_SUMMARIZED_ITEM_INFO_FROM_PO: {            /// Used in the Email JIT PO from PO Form script
                Query: `
                    WITH SummaryByPO AS (
                        SELECT Transaction.typeBasedDocumentNumber AS po_num,
                                TransactionLine.item AS iteminternalid,
                                Transaction.entity AS vendorid,
                                Vendor.companyName as vendorname,
                                Item.displayname as itemdisplayname,
                                Item.itemid as itemname,
                                Transaction.type,
                                ABS(SUM(TransactionLine.quantity)) AS itemquantity
                        FROM TransactionLine
                                LEFT OUTER JOIN Transaction ON Transaction.id = TransactionLine.transaction
                                LEFT OUTER JOIN Vendor ON Transaction.entity = Vendor.id
                                LEFT OUTER JOIN Item ON Item.id = TransactionLine.item
                        WHERE TransactionLine.mainline = 'F'
                                AND Transaction.type = 'PurchOrd'
                                AND Item.custitem_soft_comit = 'T'
                                @@PO_ID_FILTER_1@@
                        GROUP BY Transaction.typeBasedDocumentNumber,
                                TransactionLine.item,
                                Transaction.entity,
                                Vendor.companyName,
                                Item.displayname,
                                Item.itemid,
                                Transaction.type
                        )
                    SELECT 
                            iteminternalid,
                            itemname,
                            vendorid,
                            vendorname,
                            itemdisplayname,
                            SUM(itemquantity) as totalquantity,
                            LISTAGG ('(' || itemquantity || ') in ' || po_num, ', ') WITHIN GROUP (ORDER BY po_num) as qtyperpodisplay
                    
                    FROM 
                            SummaryByPO
                    GROUP BY 
                            iteminternalid,
                            itemname,
                            vendorid,
                            vendorname,
                            itemdisplayname

                    `,
                BuildQuery: function (poIds = null) {
                    const poIdsStr = poIds ? poIds.join(',') : '';
                    let filterStrPoIds = poIds ? this.Filters.POIDs.replace('@@PO_IDS@@', poIdsStr) : '';
                    let query = this.Query.replace('@@PO_ID_FILTER_1@@', filterStrPoIds);
                    return query;
                },
                Filters: {
                    POIDs: 'AND (Transaction.id IN (@@PO_IDS@@))',
                },

                FieldSet1: {
                    itemid: {
                        fieldid: 'iteminternalid',
                        label: 'Item ID',
                    },
                    itemname: {
                        fieldid: 'itemname',
                        label: 'Item Name',
                    },
                    itemdisplayname: {
                        fieldid: 'itemdisplayname',
                        label: 'Item Display Name',
                    },
                    itemquantity: {
                        fieldid: 'totalquantity',
                        label: 'Item Quantity',
                    },
                    vendorid: {
                        fieldid: 'vendorid',
                        label: 'Vendor Internal ID',
                    },
                    vendorname: {
                        fieldid: 'vendorname',
                        label: 'Vendor Name',
                    },
                    qtyperpodisplay: {
                        fieldid: 'qtyperpodisplay',
                        label: 'Quantities per Unique PO',
                    }

                },
            },
        },

        // SearchParameters: {
        //     SHIPPING_LABEL_SORT_COLUMN: search.createColumn({
        //         name: 'formulatext',
        //         formula: `{item.custitem_fc_brand} || '_' || {item.displayname} || '_' || {name}`,
        //         sort: search.Sort.ASC,
        //     }),
        // },
    };

    var Ids = {
        Folders: {
            MAIN: {
                GetId: function () { return FCLib.getEnvSpecificFileId(this.Sandbox, this.Prod); },
                Sandbox: 8138,
                Prod: 8138,
            },
            SESSION_RESULTS: {
                GetId: function () { return FCLib.getEnvSpecificFileId(this.Sandbox, this.Prod); },
                Sandbox: 9193,
                Prod: 9193,
            },
        },
        CSVImportMappings: {
            JIT_PO_IMPORT_ASSISTANT_CSVIMPORT: -1
        },
        Searches: {
            VENDOR_LABEL_SEARCH_ID: 'customsearch_fc_shippinglabel_jitvends',
        }
    };
    exports.Ids = Ids;


    var Settings = {
        SESSION_RESULTS_FOLDER_NAME_PREFIX: 'Email_Prebuilt_JIT_POs_',

        Ui: {
            Step1: {
                Fields: {
                    CAPTURE_SOS_START_DATE_LABEL: 'From SO Delivery Date',
                    CAPTURE_SOS_END_DATE_LABEL: 'To SO Delivery Date',
                },
                Parameters: {
                    CAPTURE_SOS_START_DATE_ID: 'custpage_capture_sos_start_date',
                    CAPTURE_SOS_END_DATE_ID: 'custpage_capture_sos_end_date',
                    INPUT_PREBUILT_PO_IDS: 'custpage_input_prebuilt_po_ids',
                    SELECT_PO_ID_CHECKBOX_ID: {
                        // prefix: FCClientLib.Ui.FC_CHECKBOX_PREFIX,
                        build: (poId) => { return FCClientLib.Ui.FC_CHECKBOX_PREFIX + poId; },
                        looksLike: (val) => { return val.startsWith(FCClientLib.Ui.FC_CHECKBOX_PREFIX); },
                    },
                },
                Sublists: {
                    UNSENT_POS_SELECT: {
                        Id: 'custpage_unsent_pos_select',
                        Label: 'Unsent JIT POs',
                        Fields: {
                            CB_Select: {
                                Label: 'Select',
                                DefaultState: '',
                                GetTableElem: function (thisRow) {
                                    const queryFields = exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1;
                                    const poId = thisRow[queryFields.pointernalid.fieldid];
                                    const name = exports.Settings.Ui.Step1.Parameters.SELECT_PO_ID_CHECKBOX_ID.build(poId);
                                    const id = name;
                                    const style = FCLib.Ui.CheckboxStyles.Style1;
                                    return `<input type="checkbox" name="${name}" id="${id}" value="${poId}" style="${style}" ${this.DefaultState}>`;
                                },
                            },
                            PoInternalId: {
                                Label: 'PO Internal ID',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.pointernalid.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            PoExternalId: {
                                Label: 'PO External ID',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.poexternalid.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            PoName: {
                                Label: 'PO Name',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.poid.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            TransactionDate: {
                                Label: 'PO Date',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.transactiondate.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            CreatedDate: {
                                Label: 'Created On',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.createddate.fieldid];
                                    return rawValue ? rawValue : '';
                                }
                            },
                            DueDate: {
                                Label: 'Due Date',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.duedate.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            VendorName: {
                                Label: 'Vendor Name',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.vendorname.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            TotalAmount: {
                                Label: 'Total Amount',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.totalamount.fieldid];
                                    return rawValue ? FCLib.Currencies.USD().format({number: rawValue}) : '';
                                },
                            },
                            PoEmailed: {
                                Label: 'PO Emailed?',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.transactionemailed.fieldid];
                                    return rawValue ? 'Already Emailed' : '';
                                },
                            },
                            Status: {
                                Label: 'Status',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.status.fieldid];
                                    return rawValue ? rawValue : '';
                                }
                            },
                        },
                    },
                }
            },

            Step2: {
                Parameters: {
                    LABEL_JSON_FILE_IDS: 'custpage_label_json_file_ids',
                    SELECT_PO_IDS_FINAL: 'custpage_select_po_ids_final',
                },
                Sublists: {
                    VENDOR_ITEM_DETAIL: {
                        Id: 'custpage_vendor_item_detail',
                        Label: 'Vendor Item Detail',
                        RowStyleFuncs: {
                            HIGHLIGHT_ROW_DISCREPANCIES: function (row) {
                                let qtyOnLabels = Number(row[
                                    this.Fields.QuantityOnLabels.Label
                                ]);
                                let qtyOnPos = Number(row[
                                    exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemquantity.fieldid
                                ]);
                                if (qtyOnLabels != qtyOnPos) {
                                    return 'background-color: #ffcccc;';
                                }
                                else { return ''; }
                            },
                        },
                        Fields: {
                            ItemId: {
                                Label: 'Item ID',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemid.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            ItemName: {
                                Label: 'Item Name',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemname.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            ItemDisplayName: {
                                Label: 'Item Display Name',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemdisplayname.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            VendorId: {
                                Label: 'Vendor ID',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorid.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            VendorName: {
                                Label: 'Vendor Name',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.vendorname.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            QuantityOnLabels: {
                                Label: 'Qty on Labels',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[this.Label];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            QuantityOnPos: {
                                Label: 'Qty on POs',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.itemquantity.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            QuantitiesPerPo: {
                                Label: 'Quantities per PO',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.FieldSet1.qtyperpodisplay.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                        },
                    },
                },

            },
        },


        Main: {
            DEFAULT_PO_DUE_DATE_DAYS_FROM_TODAY: 1,
        },
    };
    exports.Settings = Settings;


    function createSessionSubfolder(context, date = new Date()) {
        const curDateTimeStr = FCLib.getStandardDateTimeString1(date);
        var resultsFolderName = Settings.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
        var resultsFolderId = FCLib.createFolderInFileCabinet(resultsFolderName, exports.Ids.Folders.SESSION_RESULTS.GetId());
        return resultsFolderId;
    }
    exports.createSessionSubfolder = createSessionSubfolder;


    return exports;
}

