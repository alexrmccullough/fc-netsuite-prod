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
            GET_FUTURE_SOS_FOR_JIT_ITEMS: {
                // FIX: Need to group by vendor and item
                Query:
                    `SELECT Abs(TransactionLine.quantity) as totalqty,
                        Item.itemId as itemid,
                        Item.cost as itemcost,
                        Item.displayname as itemdisplayname,
                        ItemVendor.vendor,
                        ItemVendor.preferredVendor,
                        ItemVendor.purchasePrice as vendor_specific_purchase_price,
                        LocationTotals.totalBackordered AS totalbackordered,
                        LocationTotals.totalAvailable AS totalavailable,
                        LocationTotals.totalCommitted AS totalcommitted,
                        LocationTotals.totalOnHand AS totalonhand,
                        LocationTotals.totalOnOrder AS totalonorder,
                        Vendor.id as vendorid,
                        Vendor.entityId as vendorentityid
                    FROM TransactionLine
                        JOIN Item ON Item.id = TransactionLine.item
                        JOIN ItemVendor ON item.id = itemVendor.item
                        JOIN Transaction ON Transaction.id = TransactionLine.transaction
                        JOIN (
                            SELECT aggregateItemLocation.item AS item,
                                SUM(aggregateItemLocation.quantityBackOrdered) AS totalBackordered,
                                SUM(aggregateItemLocation.quantityAvailable) AS totalAvailable,
                                SUM(aggregateItemLocation.quantityCommitted) AS totalCommitted,
                                SUM(aggregateItemLocation.quantityOnHand) AS totalOnHand,
                                SUM(aggregateItemLocation.quantityOnOrder) AS totalOnOrder
                            FROM aggregateItemLocation
                            GROUP BY aggregateItemLocation.item
                        ) AS LocationTotals ON item.id = LocationTotals.item
                        JOIN Vendor ON itemVendor.vendor = vendor.id
                    WHERE (Transaction.type = 'SalesOrd')
                        AND (Item.custitem_soft_comit = 'T')
                        @@EXTRA_FILTERS@@
                `,
                Filters: {
                    soStartDate: 'AND (Transaction.shipDate >= @@SO_START_DATE@@)',
                    soEndDate: 'AND (Transaction.shipDate <= @@SO_END_DATE@@)',
                },
                FieldSet1: {
                    totalqty: 'Total Quantity',
                    itemid: 'Item ID',
                    cost: 'Cost',
                    vendor: 'Vendor',
                    preferredVendor: 'Preferred Vendor',
                    vendor_specific_purchase_price: 'Vendor Specific Purchase Price',
                    totalbackordered: 'Total Backordered',
                    totalavailable: 'Total Available',
                    totalcommitted: 'Total Committed',
                    totalonhand: 'Total On Hand',
                    totalonorder: 'Total On Order',
                    vendorid: 'Vendor ID',
                    vendorentityid: 'Vendor Entity ID',
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
            }
        }
    };

    var Ids = {
        Scripts: {
            JIT_PO_UTILITY: 'customscript_fc_am_jit_sl_jitsoutility',
            EMAIL_JIT_POS: 'customscript_fc_am_jit_mr_sendjitpos',
        },
        Deployments: {
            JIT_PO_UTILITY: 'customdeploy_fc_am_jit_sl_jitsoutility',
            SEND_JIT_POS: 'customscript_fc_am_jit_mr_sendjitpos',
        },
        Searches: {

        },
        Fields: {
        },
        Sublists: {
        },
        Folders: {
            MAIN: 9116,
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
                ]
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
            }
        },
    };

    var TempFields = {
    }

    exports.Ids = Ids;
    exports.Settings = Settings;
    exports.TempFields = TempFields;

    return exports;
}

