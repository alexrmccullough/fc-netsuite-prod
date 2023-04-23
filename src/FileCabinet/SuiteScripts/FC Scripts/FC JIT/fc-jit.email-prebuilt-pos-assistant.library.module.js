var FCLib;
var FCClientLib;


define([
    '../Libraries/fc-main.library.module',
    '../Libraries/fc-client.library.module',
], main);

function main(fcLibModule, fcClientLibModule) {
    FCLib = fcLibModule;
    FCClientLib = fcClientLibModule;

    var exports = {
        Queries: {
            GET_BASIC_UNSENT_PO_INFO: {
                Query: `
                    SELECT 
                        Transaction.id AS pointernalid,
                        Transaction.entity as vendorid,
                        Vendor.companyName as vendorname,
                        Transaction.tranDisplayName as podisplayname,
                        Transaction.dueDate as duedate,
                        Transaction.externalid as poexternalid,
                        Transaction.tranDate as transactiondate,
                        SUM(TransactionLine.rate * TransactionLine.quantity) AS totalamount

                    FROM
                        Transaction
                    
                    LEFT OUTER JOIN Vendor ON Transaction.entity = Vendor.id
                    LEFT OUTER JOIN TransactionLine ON TransactionLine.transaction = Transaction.id
                    LEFT OUTER JOIN Message ON Message.transaction = Transaction.id
                    
                    WHERE
                        Transaction.type = 'PurchOrd'
                        AND Vendor.custentity_fc_zen_soft_com_vendor = 'T'
                        @@PO_ID_FILTER_1@@
                        @@JIT_PO_UNSENT_FILTER_1@@

                        GROUP BY 
                        Transaction.id,
                        Transaction.entity,
                        Vendor.companyName,
                        Transaction.tranDisplayName,
                        Transaction.dueDate,
                        Transaction.externalid,
                        Transaction.tranDate

                        ORDER BY
                            Transaction.tranDisplayName
                        
                        
                `,
                BuildQuery: function (filterJitByUnsent = true, poIds = null) {
                    let thisQuery = this.Query;
                    const poIdsStr = poIds ? poIds.join(',') : '';

                    let filterStrJitByUnsent = filterJitByUnsent ? this.Filters.JITPOUnsentOnly : '';
                    let filterStrPoIds = poIds ?
                        this.Filters.POIDS.replace('@@PO_IDS@@', poIdsStr) :
                        '';

                    thisQuery = thisQuery.replace('@@PO_ID_FILTER_1@@', filterStrPoIds);
                    thisQuery = thisQuery.replace('@@JIT_PO_UNSENT_FILTER_1@@', filterStrJitByUnsent);
                    return thisQuery;
                },
                Filters: {
                    POIDS: 'AND (Transaction.id IN (@@PO_IDS@@))',
                    JITPOUnsentOnly: `
                        AND Vendor.custentity_fc_zen_soft_com_vendor = 'T'
                        AND NOT EXISTS (
                            SELECT 
                                Message.id	
                            FROM
                                Message
                                WHERE
                                Message.transaction = Transaction.id AND Message.Emailed = 'T'
                        )`,
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
    };

    var Ids = {
        Folders: {
            MAIN: {
                GetId: function () { return FCLib.getEnvSpecificFolderId(this.Sandbox, this.Prod); },
                Sandbox: 8541,
                Prod: '??',
            },
            SESSION_RESULTS: {
                GetId: function () { return FCLib.getEnvSpecificFolderId(this.Sandbox, this.Prod); },
                Sandbox: 8620,
                Prod: '??',
            },
        },
        CSVImportMappings: {
            JIT_PO_IMPORT_ASSISTANT_CSVIMPORT: -1
        },
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
                                DefaultState: 'checked',
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
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.podisplayname.fieldid];
                                    return rawValue ? rawValue : '';
                                },
                            },
                            TransactionDate: {
                                Label: 'Created Date',
                                GetTableElem: function (thisRow) {
                                    const rawValue = thisRow[exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.transactiondate.fieldid];
                                    return rawValue ? rawValue : '';
                                },
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
                                    return rawValue ? rawValue : '';
                                },
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

