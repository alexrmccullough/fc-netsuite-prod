var query,
    task,
    runtime,
    dayjs;


define(['N/query', 'N/task', 'N/runtime', '../Libraries/dayjs.min.js'], main);

function main(queryModule, taskModule, runtimeModule, dayjsModule) {
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    dayjs = dayjsModule;

    var exports = {
        Queries: {
            GET_FUTURE_SOS_FOR_JIT_ITEMS: {
                // FIX: Need to group by vendor and item
                Query: `
                    SELECT 
                    Abs(SUM(TransactionLine.quantitybackordered)) as totalbackordered,
                    Abs(SUM(TransactionLine.quantity)) as totalqty,
                    Item.id as iteminternalid,
                    Item.itemId as itemid,
                    Item.displayname as itemdisplayname,
                    ItemVendor.vendor as vendorid,
                    Vendor.entityId as vendorentityid
                    FROM TransactionLine
                    JOIN Item ON Item.id = TransactionLine.item
                    JOIN ItemVendor ON item.id = itemVendor.item
                    JOIN Transaction ON Transaction.id = TransactionLine.transaction
                    JOIN Vendor ON itemVendor.vendor = vendor.id
                    WHERE (Transaction.type = 'SalesOrd')
                    AND (BUILTIN.CF(Transaction.status) IN ('SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E'))
                    AND (Item.custitem_soft_comit = 'T')
                    @@EXTRA_FILTERS@@
                    GROUP BY 
                    Item.id,
                    Item.itemId,
                    Item.displayname,
                    ItemVendor.vendor,
                    Vendor.entityId 
                `,
                Filters: {
                    soStartDate: `AND (Transaction.shipDate >= '@@SO_START_DATE@@')   `,
                    soEndDate: `AND (Transaction.shipDate <= '@@SO_END_DATE@@')   `,
                },
                FieldSet1: {
                    totalbackordered: {
                        display: 'Total Backordered',
                        poGenField: 'totalbackordered',
                        includeInCsv: false,
                    },
                    totalqty: {
                        display: 'Total On-Order',
                        poGenField: null,
                        includeInCsv: false,
                    },
                    iteminternalid: {
                        display: 'Item Internal ID',
                        poGenField: null,
                        includeInCsv: true,
                    },
                    itemid: {
                        display: 'Item ID',
                        poGenField: null,
                        includeInCsv: true,
                    },
                    itemdisplayname: {
                        display: 'Item Name',
                        poGenField: null,
                        includeInCsv: true,
                    },
                    vendorid: {
                        display: 'Vendor ID',
                        poGenField: 'vendorid',
                        includeInCsv: true,
                    },
                    vendorentityid: {
                        display: 'Vendor Name',
                        poGenField: 'vendorentityid',
                        includeInCsv: true,
                    },
                }
            },
            GET_POTENTIAL_CONFLICTING_LOT_NUMBERS: {
                Query: `
                    SELECT
                        inventoryNumber.expirationDate,
                        inventoryNumber.externalId,
                        inventoryNumber.id,
                        inventoryNumber.item,
                        inventoryNumber.inventoryNumber,
                        REGEXP_SUBSTR(inventoryNumber.inventoryNumber, '^(.*).{1}$',1,1,'',1) as lotprefix,
                        REGEXP_SUBSTR(inventoryNumber.inventoryNumber, '(.{1})$',1,1,'',1) as lotsuffix
                    FROM
                        inventoryNumber
                    WHERE
                            REGEXP_SUBSTR(inventoryNumber.inventoryNumber, '^(.*).{1}$',1,1,'',1) = '@@LOT_PREFIX@@'
                    `,
                Parameters: {
                    LotPrefix: '@@LOT_PREFIX@@'
                }
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
                    POID: {
                        ParamPlaceholder: '@@PO_ID@@',
                        QueryLinePlaceholders: {
                            '@@PO_ID_FILTER_1@@': 'AND (Transaction.id = @@PO_ID@@)',
                            // '@@PO_ID_FILTER_2@@': 'WHERE (InventoryAssignment.transaction = @@PO_ID@@)',
                        },

                    }
                },
                FieldSet1: {
                    itemid: 'Item ID',
                    item: 'Item Quantity',
                },
            }
        }
    };

    var Ids = {
        Scripts: {
            EMAIL_JIT_POS: 'customscript_fc_am_jit_mr_sendjitpos',
            JIT_CREATE_POS_HELPER_MAPREDUCE: 'customscript_fc_am_jit_mr_createpos',
        },
        Deployments: {
            EMAIL_JIT_POS: 'customscript_fc_am_jit_mr_sendjitpos',
            JIT_CREATE_POS_HELPER_MAPREDUCE: 'customscript_fc_am_jit_mr_createpos',
        },
        Fields: {
        },
        Folders: {
            // MAIN: 9116,
            RESULTS: 8543, // SB
            CACHE: 8604  // SB
        },
        Files: {

        },
        Parameters: {
            JIT_PO_IMPORT_CSV_FILEID: 'custscript_fc_am_jitpo_import_csv_fileid',
            PO_CSV_HEADER_TO_NS_REVERSE_LOOKUP_JSON: 'custscript_fc_am_csvtons_reverselookup',
        },
        // CSVImportMappings: {
        //     JIT_PO_IMPORT_ASSISTANT_CSVIMPORT_SCRIPTID: 'custimport_fc_static_jit_po_assistant_2',
        // },
    };

    var Settings = {
        SESSION_RESULTS_FOLDER_NAME_PREFIX: 'JIT_PO_Results_',
        JIT_PO_ACCEPTEDPOS_TEMPJSON_FILENAME_PREFIX: 'TEMP_JIT_PO_AcceptedPOs_',
        JIT_PO_REJECTEDPOS_TEMPJSON_FILENAME_PREFIX: 'TEMP_JIT_PO_RejectedPOs_',
        JIT_PO_ACCEPTEDPOS_CSV_FILENAME_PREFIX: 'JIT_PO_AcceptedPOs_',
        JIT_PO_REJECTEDPOS_CSV_FILENAME_PREFIX: 'JIT_PO_RejectedPOs_',

        PurchaseOrder: {
            VALID_PO_SUFFIXES:
                ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
                    'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av', 'aw', 'ax', 'ay', 'az',
                    'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bk', 'bl', 'bm', 'bn', 'bo', 'bp', 'bq', 'br', 'bs', 'bt', 'bu', 'bv', 'bw', 'bx', 'by', 'bz',
                    'ca', 'cb', 'cc', 'cd', 'ce', 'cf', 'cg', 'ch', 'ci', 'cj', 'ck', 'cl', 'cm', 'cn', 'co', 'cp', 'cq', 'cr', 'cs', 'ct', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
                    'da', 'db', 'dc', 'dd', 'de', 'df', 'dg', 'dh', 'di', 'dj', 'dk', 'dl', 'dm', 'dn', 'do', 'dp', 'dq', 'dr', 'ds', 'dt', 'du', 'dv', 'dw', 'dx', 'dy', 'dz',
                ],
            GENERATE_LOT_NUMBER: (delivdatestr) => { return `JIT${delivdatestr}`; },
        },

        Ui: {
            Main: {
                DEFAULT_PO_DUE_DATE_DAYS_FROM_TODAY: 1,
            },
            Fields: {
                CAPTURE_SOS_START_DATE_LABEL: 'From SO Delivery Date',
                CAPTURE_SOS_END_DATE_LABEL: 'To SO Delivery Date',
                DRAFT_POS_DATA_FIELD_ID: 'custpage_draft_pos_data',
                DRAFT_POS_DATA_FIELD_LABEL: 'Draft POs',
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
                CAPTURE_SOS_START_DATE_ID: 'custpage_capture_sos_start_date',
                CAPTURE_SOS_END_DATE_ID: 'custpage_capture_sos_end_date',
                ENABLE_SEND_ALL_POS_BY_DEFAULT_ID: 'custpage_enable_send_all_pos_by_default',
                HIDDEN_PERSISTENT_PARAMS_ID: 'custpage_hidden_persistent_params',
                CAPTURE_PO_DELIVERY_DUE_DATE_ID: 'custpage_capture_po_delivery_due_date',
                JIT_PO_ACCEPTEDPOS_TEMPJSON_FILE_ID: 'custpage_jit_po_acceptedpos_tempjson_file',
                JIT_PO_REJECTEDPOS_TEMPJSON_FILE_ID: 'custpage_jit_po_rejectedpos_tempjson_file',
                POS_TO_EMAIL_EXTERNAL_IDS: 'custpage_pos_to_email_external_ids',
            },
            DynamicParameters: {
                CREATE_PO_CHECKBOX_ID: (vendorid) => `custpage_create_po_${vendorid}`,
                EMAIL_PO_CHECKBOX_ID: (vendorid) => `custpage_email_po_${vendorid}`,
                PO_MEMO_FIELD_ID: (vendorid) => `custpage_po_memo_${vendorid}`,
                ITEM_FINAL_QTY_FIELD_ID: (vendorid, itemid) =>
                    ['custpage_item_final_qty', vendorid, itemid].filter(Boolean).join('_'),
            },

        },

        PoImportCsv: {
            NewOutputFields: {
                finalQty: 'Final Item Qty',
                lotNumber: 'Receipt Lot Number',
                memo: 'PO Memo',
                poExternalId: 'PO External ID',
                poSequenceNumber: 'PO Sequence Counter',
                receiveByDate: 'Receive By Date',
                emailOnceCreated: 'Email Once Created',
            },

        },
    };

    var MRSettings = {
        CsvToNsFieldMap: {
            [Settings.PoImportCsv.NewOutputFields.finalQty]: {
                typeFunc: (value) => { return parseFloat(value) },
                record: 'item',
                nsFieldId: 'custbody_final_qty',
            },

            [Settings.PoImportCsv.NewOutputFields.lotNumber]: {
                typeFunc: (value) => { return value.toString() },
                record: 'inventorydetail',
                nsFieldId: 'custcol_lot_number',
            },
            [Settings.PoImportCsv.NewOutputFields.memo]: {
                typeFunc: (value) => { return value.toString() },
                record: 'transaction',
                nsFieldId: 'memo',
            },
            [Settings.PoImportCsv.NewOutputFields.poExternalId]: {
                typeFunc: (value) => { return value.toString() },
                record: 'transaction',
                nsFieldId: 'externalid',
            },
            [Settings.PoImportCsv.NewOutputFields.poSequenceNumber]: {
                typeFunc: (value) => { return value.toString() },
                record: 'transaction',
                nsFieldId: 'tranid',
            } ,
            [Settings.PoImportCsv.NewOutputFields.receiveByDate]: {
                typeFunc: (value) => { return value.toString() },
                record: 'transaction',
                nsFieldId: 'duedate',
                formatFunc: (date) => { return dayjs(date).format('M/D/YYYY') },
            },

            [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.iteminternalid.display]: {
                typeFunc: (value) => { return value.toString() },
                record: 'item',
                nsFieldId: 'internalid',
            },
            // [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.itemid.display]: ,
            // [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.itemdisplayname.display]: ,
            [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.vendorid.display]: {
                typeFunc: (value) => { return value.toString() },
                record: 'transaction',
                nsFieldId: 'vendorid',
            },
            // [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.vendorentityid.display]: ,

        },
        
        CSVSpecialFields: {
            [Settings.PoImportCsv.NewOutputFields.emailOnceCreated]: {
                // valueFunc converts upper/lower case true/false/yes/no to boolean
                valueFunc: (value) => FCLib.looksLikeYes(value),
            },
        },
        
        Emails: {
            PoCreationSummary: {
                Subject: 'Generate JIT POs -- Process Summary',
                Recipients: ['procurement@foodconnects.org'],
                Cc: [''],
                Bcc: [''],
                Body: {
                    Template: `
                        <p>{{posSucceededCount}} Purchase Orders successfully created.</p>
                        <p>{{posFailedCount}} Purchase Orders failed to create.</p>
                        <br>
                        <h3>POs successfully created</h3>
                        <ul>{{successfulPoList}}</ul>
                        <br>
                        <h3>Failed POs</h3>
                        <ul>{{failedPoList}}</ul>
                        <br>
                        Please use the <a href="">Bulk JIT PO Email Assistant</a> to the POs with shipping labels. 
                    `,
                    PlaceholderFuncs: {
                        posSucceededCount: (bodytext, value) => bodytext.replace('{{posSucceededCount}}', value),
                        posFailedCount: (bodytext, value) => bodytext.replace('{{posFailedCount}}', value),
                        successfulPoList: (bodytext, value) => bodytext.replace('{{successfulPoList}}', value),
                        failedPoList: (bodytext, value) => bodytext.replace('{{failedPoList}}', value),
                    },
                    ReplaceAllPlaceholders: (bodytext, posSucceededCount, posFailedCount, successfulPoList, failedPoList) => {
                        bodytext = Settings.Emails.PoCreationSummary.Body.PlaceholderFuncs.posSucceededCount(bodytext, posSucceededCount);
                        bodytext = Settings.Emails.PoCreationSummary.Body.PlaceholderFuncs.posFailedCount(bodytext, posFailedCount);
                        bodytext = Settings.Emails.PoCreationSummary.Body.PlaceholderFuncs.successfulPoList(bodytext, successfulPoList);
                        bodytext = Settings.Emails.PoCreationSummary.Body.PlaceholderFuncs.failedPoList(bodytext, failedPoList);
                        return bodytext;
                    },

                }
                

            }
        }
    };



    function buildQueryGetItemInfoFromPO(poId) {
        let sqlQuery = exports.Queries.GET_ITEM_INFO_FROM_PO.Query;

        for (let queryPlaceholder in exports.Queries.GET_ITEM_INFO_FROM_PO.Filters.POID.QueryLinePlaceholders) {
            let filterText = exports.Queries.GET_ITEM_INFO_FROM_PO.Filters.POID.QueryLinePlaceholders[queryPlaceholder].replace(
                exports.Queries.GET_ITEM_INFO_FROM_PO.Filters.POID.ParamPlaceholder,
                poId
            );
            sqlQuery = sqlQuery.replace(
                queryPlaceholder,
                filterText
            );
        }

        return sqlQuery;

    }



    exports.Ids = Ids;
    exports.Settings = Settings;
    exports.MRSettings = MRSettings;
    exports.buildQueryGetItemInfoFromPO = buildQueryGetItemInfoFromPO;

    return exports;
}

