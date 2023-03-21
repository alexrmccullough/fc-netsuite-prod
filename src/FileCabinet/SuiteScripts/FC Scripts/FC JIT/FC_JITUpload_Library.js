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
                    AND
                    (Item.itemId IN (?))
        
                GROUP BY 
                    Item.itemId
                `,
        }
    };

    var Ids = {
        Scripts: {
            MR_JIT_UPDATE: 'customscript_fc_am_mr_jit_updateitemjitstartqty',
        },
        Deployments: {
            MR_JIT_UPDATE: 'customdeploy_fc_am_mr_jit_updateitemjitstartqty',
        },
        Fields: {
        },
        Sublists: {
        },
        Folders: {
            MAIN: 8138,
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
        JIT_UPLOAD_UTILITY_CSV_FILENAME_PREFIX: 'JIT_Upload_Successful_Items_'
    };

    var TempFields = {
        ItemOldStartJITQty: 'oldstartjitqty',
        ItemOldRemainingJITQty: 'oldremainingjitqty',
    }

    exports.Ids = Ids;
    exports.Settings = Settings;

    return exports;
}

