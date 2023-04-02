var query,
    task,
    runtime,
    email,
    ui,
    format;


define(['N/query', 'N/task', 'N/runtime', 'N/email', 'N/ui/serverWidget', 'N/format', 'N/record'], main);

function main(queryModule, taskModule, runtimeModule, emailModule, serverWidgetModule, formatModule) {
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;
    ui = serverWidgetModule;
    format = formatModule;

    var exports = {
        Queries: {
            GET_BASIC_UNSENT_PO_INFO: {
                BuildQueryFunction: buildQueryBasicUnsentJitPo,
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
                Filters: {
                    POIDS: {
                        ParamPlaceholder: '@@PO_IDS@@',
                        QueryLinePlaceholders: {
                            '@@PO_ID_FILTER_1@@': 'AND (Transaction.id IN (@@PO_IDS@@))',
                            // '@@PO_ID_FILTER_2@@': 'WHERE (InventoryAssignment.transaction = @@PO_ID@@)',
                        },
                    },
                    JITPOUnsentOnly: {
                        QueryLinePlaceholders: {
                            '@@JIT_PO_UNSENT_FILTER_1@@':
                                `AND Vendor.custentity_fc_zen_soft_com_vendor = 'T'
                                AND NOT EXISTS (
                                    SELECT 
                                        Message.id	
                                    FROM
                                        Message
                                        WHERE
                                        Message.transaction = Transaction.id AND Message.Emailed = 'T'
                                )
                                `
                        }
                    }
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
                BuildQueryFunction: buildQueryGetItemInfoFromPos,
                Query: `
                    SELECT TransactionLine.uniquekey AS tranlineuniquekey,
                        TransactionLine.item AS itemid,
                        Transaction.entity AS vendorid,
                        Transaction.tranDisplayName as podisplayname,
                        Vendor.companyName as vendorname,
                        ABS(SUM(TransactionLine.quantity)) AS itemquantity
                    FROM TransactionLine
                    LEFT OUTER JOIN Transaction ON Transaction.id = TransactionLine.transaction
                    LEFT OUTER JOIN Vendor ON Transaction.entity = Vendor.id
                    LEFT OUTER JOIN Item ON Item.id = TransactionLine.item
                    WHERE 
                        TransactionLine.mainline = 'F'
                        AND Item.custitem_soft_comit = 'T'
                        @@PO_ID_FILTER_1@@
                    GROUP BY TransactionLine.uniquekey,
                        TransactionLine.item,
                        Transaction.entity,
                        Transaction.tranDisplayName,
                        Vendor.companyName

                `,
                Filters: {
                    POIDs: {
                        ParamPlaceholder: '@@PO_IDS@@',
                        QueryLinePlaceholders: {
                            '@@PO_ID_FILTER_1@@': 'AND (Transaction.id IN (@@PO_IDS@@))',
                            // '@@PO_ID_FILTER_2@@': 'WHERE (InventoryAssignment.transaction = @@PO_ID@@)',
                        },

                    }
                },

                FieldSet1: {
                    itemid: {
                        fieldid: 'itemid',
                        label: 'Item ID',
                    },
                    itemquantity: {
                        fieldid: 'itemquantity',
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
                    podisplayname: {
                        fieldid: 'podisplayname',
                        label: 'PO Name',
                    },
                },
                Parameters: {

                }
            }
        }
    };

    var Ids = {
        Folders: {
            MAIN: 8541,
            SESSION_RESULTS: 8620,
        },
        CSVImportMappings: {
            JIT_PO_IMPORT_ASSISTANT_CSVIMPORT: -1
        }
    };

    var Settings = {
        SESSION_RESULTS_FOLDER_NAME_PREFIX: 'Email_Prebuilt_JIT_POs_',

        Ui: {
            Main: {
                DEFAULT_PO_DUE_DATE_DAYS_FROM_TODAY: 1,
            },
            Fields: {
                CAPTURE_SOS_START_DATE_LABEL: 'From SO Delivery Date',
                CAPTURE_SOS_END_DATE_LABEL: 'To SO Delivery Date',
                ENABLE_SEND_ALL_POS_BY_DEFAULT_LABEL: 'Enable Send All POs by Default?',
                HIDDEN_PERSISTENT_PARAMS_LABEL: 'Hidden Persistent Parameters',
                FINALREVIEW_POS_ACCEPTED_FIELD_ID: 'custpage_finalreview_pos_accepted',
                FINALREVIEW_POS_ACCEPTED_FIELD_LABEL: 'POs to Accept',
                FINALREVIEW_POS_REJECTED_FIELD_ID: 'custpage_finalreview_pos_rejected',
                FINALREVIEW_POS_REJECTED_FIELD_LABEL: 'POs to Reject',
                CAPTURE_PO_DELIVERY_DUE_DATE_LABEL: 'PO Delivery Due Date',
                SELECT_PO_IDS_FINAL_LABEL: 'Select PO IDs',
            },
            FieldGroups: {
                FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_ID: 'custpage_finalreview_pos_accepted_group',
                FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_LABEL: 'POs to Accept',
                FINALREVIEW_POS_REJECTED_FIELD_GROUP_ID: 'custpage_finalreview_pos_rejected_group',
                FINALREVIEW_POS_REJECTED_FIELD_GROUP_LABEL: 'POs to Reject',
            },
            Parameters: {
                INPUT_PREBUILT_PO_IDS: 'custpage_input_prebuilt_po_ids',
                SELECT_PO_ID_CHECKBOX_ID: {
                    prefix: 'custpage_selectpo_cb_',
                    build: (poId) => { return 'custpage_selectpo_cb_' + poId; },
                    looksLike: (val) => { return val.startsWith('custpage_selectpo_cb_'); },
                },
                LABEL_JSON_FILE_IDS: 'custpage_label_json_file_ids',
                SELECT_PO_IDS_FINAL: 'custpage_select_po_ids_final',
                CAPTURE_SOS_START_DATE_ID: 'custpage_capture_sos_start_date',
                CAPTURE_SOS_END_DATE_ID: 'custpage_capture_sos_end_date',
                // ENABLE_SEND_ALL_POS_BY_DEFAULT_ID: 'custpage_enable_send_all_pos_by_default',
                HIDDEN_PERSISTENT_PARAMS_ID: 'custpage_hidden_persistent_params',
                JIT_PO_ACCEPTEDPOS_TEMPJSON_FILE_ID: 'custpage_jit_po_acceptedpos_tempjson_file',
                JIT_PO_REJECTEDPOS_TEMPJSON_FILE_ID: 'custpage_jit_po_rejectedpos_tempjson_file',
                POS_TO_EMAIL_EXTERNAL_IDS: 'custpage_pos_to_email_external_ids',
            },
            FieldDataFormat: {
                PO_MULTISELECT_PO_FIELDS: ['tranduedate', 'vendorname', 'tranid', 'trandisplayname'],
            },
            Sublists: {
                SELECT_POS: {
                    Id: 'custpage_select_po_sublist',
                    Label: 'Select POs',
                    Fields: {
                        Select: {
                            Type: ui.FieldType.CHECKBOX,
                            Label: 'Select',
                            Id: 'custpage_select_po_sublist_field_select',
                            DefaultValue: 'checked',
                            DisplayType: serverWidget.FieldDisplayType.NORMAL,
                        },
                        PoInternalId: {
                            Type: ui.FieldType.TEXT,
                            Label: 'PO Internal ID',
                            Id: 'custpage_select_po_sublist_field_po_internal_id',
                            UnsentPoQuerySource: exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.pointernalid,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        PoExternalId: {
                            Type: ui.FieldType.TEXT,
                            Label: 'PO External ID',
                            Id: 'custpage_select_po_sublist_field_po_external_id',
                            UnsentPoQuerySource: exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.poexternalid,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        PoDisplayName: {
                            Type: ui.FieldType.TEXT,
                            Label: 'PO #',
                            Id: 'custpage_select_po_sublist_field_po_displayname',
                            UnsentPoQuerySource: exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.podisplayname,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        TransactionDate: {
                            Type: ui.FieldType.DATETIMETZ,
                            Label: 'Created Date',
                            Id: 'custpage_select_po_sublist_field_created_date',
                            UnsentPoQuerySource: exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.transactiondate,
                            TypeFunc: (val) => { 
                                return format.format({
                                    value: new Date(val),
                                    type: format.Type.DATETIMETZ
                                });
                            },
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        DueDate: {
                            Type: ui.FieldType.DATETIMETZ,
                            Label: 'Due Date',
                            Id: 'custpage_select_po_sublist_field_due_date',
                            UnsentPoQuerySource: exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.duedate,
                            TypeFunc: (val) => { 
                                return format.format({
                                    value: new Date(val),
                                    type: format.Type.DATETIMETZ
                                });
                            },
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        VendorName: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Vendor Name',
                            Id: 'custpage_select_po_sublist_field_vendor_name',
                            UnsentPoQuerySource: exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.vendorname,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        TotalAmount: {
                            Type: ui.FieldType.CURRENCY,
                            Label: 'Total Amount',
                            Id: 'custpage_select_po_sublist_field_total_amount',
                            UnsentPoQuerySource: exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.totalamount,
                            TypeFunc: (val) => { return parseFloat(val) },
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        }

                    },
                },
            },
        },
    };

    var TempFields = {
    }

    function buildQueryBasicUnsentJitPo({
        filterJitUnsent = true,
        poIds = null
    } = {}) {
        let sqlQuery = exports.Queries.GET_BASIC_UNSENT_PO_INFO.Query;

        // filterJitUnsent = false;

        // Prepare filter varialbes
        // First, filter query by specific PO IDs
        let doFilterByPoIds = poIds !== null && poIds.length > 0;
        let poIdsStr = poIds === null ? '' : poIds.join(',');

        // Second, filter query by JIT PO Unsent Only
        let doFilterByJitPoUnsentOnly = filterJitUnsent;

        // Build the filter strings and insert into query
        for (let queryPlaceholder in exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.POIDS.QueryLinePlaceholders) {
            let filterText = '';

            if (doFilterByPoIds) {
                filterText = exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.POIDS.QueryLinePlaceholders[queryPlaceholder].replace(
                    exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.POIDS.ParamPlaceholder,
                    poIdsStr
                );
            }
            sqlQuery = sqlQuery.replace(
                queryPlaceholder,
                filterText
            );
        }

        // Replace JIT PO Unsent Only
        for (let queryPlaceholder in exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.JITPOUnsentOnly.QueryLinePlaceholders) {
            let filterText = '';

            if (doFilterByJitPoUnsentOnly) {
                filterText = exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.JITPOUnsentOnly.QueryLinePlaceholders[queryPlaceholder];
            }

            sqlQuery = sqlQuery.replace(
                queryPlaceholder,
                filterText
            );
        }

        return sqlQuery;
    }

    function buildQueryGetItemInfoFromPos(poIds = []) {
        let sqlQuery = exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.Query;
        let poIdsStr = poIds.join(',');

        for (let queryPlaceholder in exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.Filters.POIDs.QueryLinePlaceholders) {
            let filterText = exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.Filters.POIDs.QueryLinePlaceholders[queryPlaceholder].replace(
                exports.Queries.GET_SUMMARIZED_ITEM_INFO_FROM_PO.Filters.POIDs.ParamPlaceholder,
                poIdsStr
            );
            sqlQuery = sqlQuery.replace(
                queryPlaceholder,
                filterText
            );
        }

        return sqlQuery;

    }

    function createSessionSubfolder(context, date = new Date()) {
        const curDateTimeStr = FCLib.getStandardDateTimeString1(date);
        // const curDateTime = new Date();
        // const curDateTimeStr = curDateTime.toISOString().replace(/:/g, '-');
        var resultsFolderName = Settings.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
        var resultsFolderId = FCLib.createFolderInFileCabinet(resultsFolderName, exports.Ids.Folders.SESSION_RESULTS);

        return resultsFolderId;
    }



    exports.Ids = Ids;
    exports.Settings = Settings;
    exports.TempFields = TempFields;
    exports.buildQueryBasicUnsentJitPo = buildQueryBasicUnsentJitPo;
    exports.buildQueryGetItemInfoFromPos = buildQueryGetItemInfoFromPos;
    exports.createSessionSubfolder = createSessionSubfolder;


    return exports;
}

