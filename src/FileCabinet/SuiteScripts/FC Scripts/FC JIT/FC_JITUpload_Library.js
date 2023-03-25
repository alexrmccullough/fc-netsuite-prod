var query;

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
            GET_JIT_ITEM_SNAPSHOT: `
                SELECT
                    Item.itemId as itemname,
                    Item.id AS internalid,
                    Item.itemtype AS itemtype,
                    Item.isLotItem AS islotitem,
                    Item.custitem_soft_comit AS isjit,
                    Item.custitem_fc_zen_sft_comm_qty AS standingjitqty,
                    Item.custitem_fc_am_jit_start_qty AS startjitqty,
                    Item.custitem_fc_am_jit_remaining AS remainjitqty,
                    Item.custitem_fc_zen_jit_producers AS jitproducers,		
                FROM
                    Item
                WHERE
                    Item.custitem_soft_comit = 'T'
                `,

            GET_JIT_ITEMS_ON_FUTURE_SOS: `
                SELECT
                    SUM(Abs(TransactionLine.quantity)) as totalQty,
                    Item.itemId as itemId
        
                FROM
                    TransactionLine
        
                JOIN Item ON Item.id = TransactionLine.item
                JOIN Transaction ON Transaction.id = TransactionLine.transaction
        
                WHERE
                    (Transaction.type = 'SalesOrd')
                    AND   
                    (Item.custitem_soft_comit = 'T') 
                    AND 
                    (Transaction.shipDate >= (SELECT SYSDATE FROM Dual))

        
                GROUP BY 
                    Item.itemId
                `,

            GET_ALL_CSV_FILES_IN_FOLDER_BY_ID: `SELECT ID FROM File WHERE ( Folder = ? ) AND ( Name LIKE '%.csv' )`,
            
        }
    };

    var Ids = {
        Scripts: {
            MR_JIT_UPDATE: 'customscript_fc_am_jit_mr_updateitemjit',
        },
        Deployments: {
            MR_JIT_UPDATE: 'customdeploy_fc_am_jit_mr_updateitemjit',
        },
        Fields: {
        },
        Sublists: {
        },
        Folders: {
            MAIN: 9115,
            INPUT: 8142,
            RESULTS: 8141,
        },
        Files: {

        },
        Parameters: {
            JIT_ITEM_UPDATE_CSV_FILEID: 'custscript_fc_am_jit_update_csv_fileid',
            SUBTRACT_FUTURE_SOS_ON_UPDATE: 'custscript_fc_am_jit_subtract_future_sos',
        }
    
    };

    var Settings = {
        CSV_OUT_ERROR_FIELDNAME: 'Errors',
        ITEM_ID_FIELDNAME: "ExternalID",
        JIT_START_QTY_FIELDNAME: "Start Quantity",
        REQUIRED_FIELD_NAMES: ["ExternalID", "Start Quantity"],
        CSV_ORIGINALS_SUBFOLDER_NAME: "Originals",
        SESSION_RESULTS_FOLDER_NAME_PREFIX: 'JIT_CSV_Upload_',
        PAPAPARSE_EXTRA_COL_NAME: "__parsed_extra",
        JIT_UPLOAD_SUCCESS_FILENAME: 'JIT_Upload_Success.csv',
        JIT_UPLOAD_UTILITY_CSV_FILENAME_PREFIX: 'JIT_Upload_Successful_Items_',

        Ui: {
            Main: {
                JIT_UPLOAD_UTILITY_FORM_TITLE: 'JIT Upload Utility',
            },
            Fields: {
                ERROR_RESULTS_FIELD_ID: 'custpage_error_results',
                ERROR_RESULTS_FIELD_LABEL: 'Error Results',
                ITEM_UPDATE_RESULTS_FIELD_ID: 'custpage_item_update_results',
                ITEM_UPDATE_RESULTS_FIELD_LABEL: 'Item Update Results',
                ITEM_UPLOAD_CSV_FIELD_LABEL: 'Upload CSV',

            },
            FieldGroups: {
                OPTIONS_FIELD_GROUP_ID: 'custpage_submit_fieldgroup',
                OPTIONS_FIELD_GROUP_LABEL: 'Options',
                ERROR_RESULTS_FIELD_GROUP_ID: 'custpage_error_results_fieldgroup',
                ERROR_RESULTS_FIELD_GROUP_LABEL: 'Error Results',
                ITEM_UPDATE_RESULTS_FIELD_GROUP_ID: 'custpage_item_update_results_fieldgroup',
                ITEM_UPDATE_RESULTS_FIELD_GROUP_LABEL: 'Item Update Results',
            },
            Buttons: {
                SUBMIT_BUTTON_LABEL: 'Submit',
                SUBTRACT_FUTURE_SOS_CHECKBOX_LABEL: 'Subtract Future SOs from Start Quantity',
                RESET_ALL_JIT_CHECKBOX_LABEL: 'Zero All JIT Items before Update',
            },
            Parameters: {
                SUBTRACT_FUTURE_SOS_CHECKBOX_ID: 'custscript_subtract_future_sos',
                RESET_ALL_JIT_CHECKBOX_ID: 'custpage_reset_all_jit',
                ITEM_UPLOAD_CSV_FIELD_ID: 'custpage_item_upload_csv_id',
            }
        },
    };

    var TempFields = {
        ItemOldStartJITQty: 'oldstartjitqty',
        ItemOldRemainingJITQty: 'oldremainingjitqty',
    }

    exports.Ids = Ids;
    exports.Settings = Settings;
    exports.TempFields = TempFields;

    return exports;
}

