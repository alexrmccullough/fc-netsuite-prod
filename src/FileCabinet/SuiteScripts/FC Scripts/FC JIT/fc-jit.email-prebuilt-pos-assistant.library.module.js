var query,
    task,
    runtime,
    email;


define(['N/query', 'N/task', 'N/runtime', 'N/email'], main);

function main(queryModule, taskModule, runtimeModule, emailModule) {
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;

    var exports = {
        Form: {
        },
        Sublists: {
        },
        Searches: {
        },
        Urls: {
        },
        Lookups: {
        },
        Queries: {
            GET_BASIC_UNSENT_PO_INFO: {
                BuildQueryFunction: buildQueryGetBasicPOInfo,
                Query: `
                    SELECT 
                        Transaction.id AS tranid,
                        Transaction.entity as vendorid,
                        Vendor.companyName as vendorname,
                        Transaction.tranDisplayName as trandisplayname,
                        Transaction.dueDate as tranduedate,
                
                    FROM
                        Transaction
                    
                    LEFT OUTER JOIN Vendor ON Transaction.entity = Vendor.id
                    LEFT OUTER JOIN Message ON Message.transaction = Transaction.id
                    
                    WHERE
                        Transaction.type = 'PurchOrd'
                        '@@PO_ID_FILTER_1@@'
                        '@@JIT_PO_UNSENT_FILTER_1@@'
                        )
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
                            '@@JIT_PO_UNSENT_FILTER_1@@': `
                            AND Vendor.custentity_fc_zen_soft_com_vendor = 'T'
                            AND NOT EXISTS (
                                SELECT 
                                    Message.id	
                                FROM
                                    Message
                                    WHERE
                                    Message.transaction = Transaction.id AND Message.Emailed = 'T'
                            `
                        }
                    }
                },
                FieldSet1: {
                    tranid: {
                        fieldid: 'tranid',
                        label: 'PO Internal ID',
                    },
                    vendorid: {
                        fieldid: 'vendorid',
                        label: 'Vendor ID',
                    },
                    vendorname: {
                        fieldid: 'vendorname',
                        label: 'Vendor Name',
                    },
                    trandisplayname: {
                        fieldid: 'trandisplayname',
                        label: 'PO Name',
                    },
                    tranduedate: {
                        fieldid: 'tranduedate',
                        label: 'PO Due Date',
                    },
                },
            },

            GET_SUMMARIZED_ITEM_INFO_FROM_PO: {            /// Used in the Email JIT PO from PO Form script
                BuildQueryFunction: buildQueryGetItemInfoFromPO,
                Query: `
                    SELECT TransactionLine.uniquekey AS tranlineuniquekey,
                        -- Transaction.id AS tranid,
                        Item.id AS itemid,
                        ABS(SUM(TransactionLine.quantity)) AS itemquantity
                    FROM TransactionLine
                        JOIN Transaction ON Transaction.id = TransactionLine.transaction
                        LEFT OUTER JOIN Item ON Item.id = TransactionLine.item
                    WHERE TransactionLine.mainline = 'F'
                        -- AND Item.custitem_soft_comit = 'T'
                        @@PO_ID_FILTER_1@@
                    GROUP BY TransactionLine.uniquekey,
                        -- Transaction.id,
                        Item.id            
                `,
                Filters: {
                    POIDS: {
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
                },
                Parameters: {

                }
            }
        }
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
            MAIN: 9116,
            SESSION_RESULTS: FIX,
        },
        Files: {

        },
        Parameters: {
        },
        CSVImportMappings: {
            JIT_PO_IMPORT_ASSISTANT_CSVIMPORT: -1
        }

    };

    var Settings = {
        SESSION_RESULTS_FOLDER_NAME_PREFIX: 'Email_Prebuilt_JIT_POs_',

        PurchaseOrder: {
        },

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
            },
            FieldGroups: {
                FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_ID: 'custpage_finalreview_pos_accepted_group',
                FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_LABEL: 'POs to Accept',
                FINALREVIEW_POS_REJECTED_FIELD_GROUP_ID: 'custpage_finalreview_pos_rejected_group',
                FINALREVIEW_POS_REJECTED_FIELD_GROUP_LABEL: 'POs to Reject',
            },
            Buttons: {
            },
            Parameters: {
                INPUT_PREBUILT_PO_IDS: 'custpage_input_prebuilt_po_ids',
                LABEL_JSON_FILE_IDS: 'custpage_label_json_file_ids',
                SELECT_PO_IDS_FINAL: 'custpage_select_po_ids_final',
                CAPTURE_SOS_START_DATE_ID: 'custpage_capture_sos_start_date',
                CAPTURE_SOS_END_DATE_ID: 'custpage_capture_sos_end_date',
                ENABLE_SEND_ALL_POS_BY_DEFAULT_ID: 'custpage_enable_send_all_pos_by_default',
                HIDDEN_PERSISTENT_PARAMS_ID: 'custpage_hidden_persistent_params',
                JIT_PO_ACCEPTEDPOS_TEMPJSON_FILE_ID: 'custpage_jit_po_acceptedpos_tempjson_file',
                JIT_PO_REJECTEDPOS_TEMPJSON_FILE_ID: 'custpage_jit_po_rejectedpos_tempjson_file',
                POS_TO_EMAIL_EXTERNAL_IDS: 'custpage_pos_to_email_external_ids',
            },
            FieldDataFormat: {
                PO_MULTISELECT_PO_FIELDS: ['tranduedate', 'vendorname', 'tranid', 'trandisplayname'],
            }
        },
    };

    var TempFields = {
    }

    function buildQueryBasicUnsentJITPO({
        filterJitUnsent = true, 
        poIds = null
    } = {}) {
        let sqlQuery = exports.Queries.GET_BASIC_UNSENT_PO_INFO.Query;

        if (poIds !== null) {
            filterJitUnsent = false;
            poIdsStr = poIds.join(',');

            for (let queryPlaceholder in exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.POIDS.QueryLinePlaceholders) {
                let filterText = exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.POIDS.QueryLinePlaceholders[queryPlaceholder].replace(
                    exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.POIDS.ParamPlaceholder,
                    poIdsStr
                );
                sqlQuery = sqlQuery.replace(
                    queryPlaceholder,
                    filterText
                );
            }
        }

        if (filterJitUnsent) {
            for (let queryPlaceholder in exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.JITPOUnsentOnly.QueryLinePlaceholders) {
                let filterText = exports.Queries.GET_BASIC_UNSENT_PO_INFO.Filters.POIDS.QueryLinePlaceholders[queryPlaceholder];
                sqlQuery = sqlQuery.replace(
                    queryPlaceholder,
                    filterText
                );
            }
        }

        return sqlQuery;
    }

    function buildQueryGetItemInfoFromPOs(poIds = []) {
        let sqlQuery = exports.Queries.GET_ITEM_INFO_FROM_PO.Query;
        let poIdsStr = poIds.join(',');

        for (let queryPlaceholder in exports.Queries.GET_ITEM_INFO_FROM_PO.Filters.POID.QueryLinePlaceholders) {
            let filterText = exports.Queries.GET_ITEM_INFO_FROM_PO.Filters.POID.QueryLinePlaceholders[queryPlaceholder].replace(
                exports.Queries.GET_ITEM_INFO_FROM_PO.Filters.POID.ParamPlaceholder,
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
        var resultsFolderName = exports.Settings.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
        var resultsFolderObj = FCLib.createFolderInFileCabinet(resultsFolderName, exports.Ids.Folders.SESSION_RESULTS);

        return resultsFolderObj.id;
        
        // return {
        //     sessionResultsFolderId: resultsFolderId,
        // };
    }



    exports.Ids = Ids;
    exports.Settings = Settings;
    exports.TempFields = TempFields;
    exports.buildQueryBasicUnsentJITPO = buildQueryBasicUnsentJITPO;
    exports.buildQueryGetItemInfoFromPOs = buildQueryGetItemInfoFromPOs;

    

    return exports;
}

