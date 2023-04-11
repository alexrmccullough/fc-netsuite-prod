var query,
    task,
    runtime,
    email,
    ui;

define(['N/query', 'N/task', 'N/runtime', 'N/email', 'N/ui/serverWidget'], main);

function main(queryModule, taskModule, runtimeModule, emailModule, uiModule) {
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;
    ui = uiModule;

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
            GET_ALL_CSV_FILES_IN_FOLDER_BY_ID: {
                Query: `
                    SELECT
                        File.id as fileid,
                        File.name as filename,
                        File.lastModifiedDate as filelastmodifieddate,
                    FROM 
                        File 
                    WHERE ( Folder = @@FOLDER_ID@@ ) AND ( Name LIKE '%.csv' )
                    `,
                BuildQuery: function (folderId) {
                    return this.Query.replace('@@FOLDER_ID@@', folderId);
                },
                FieldSet1: {
                    FileId: {
                        fieldid: 'fileid',
                        label: 'File ID',
                    },
                    FileName: {
                        fieldid: 'filename',
                        label: 'File Name',
                    },
                    FileLastModifiedDate: {
                        fieldid: 'filelastmodifieddate',
                        label: 'Last Modified Date',
                    },
                },
            },

            GET_LIST_JIT_ITEMS: {
                Query: `
                    SELECT
                        Item.itemid as itemname
                    FROM
                        Item
                    WHERE
                        Item.custitem_soft_comit = 'T'
                `,
                BuildQuery: function () { return this.Query; },
                FieldSet1: {
                    ItemName: {
                        fieldid: 'itemname',
                        label: 'Item Name',
                    },
                },
            },

            GET_JIT_ITEM_DETAILS: {
                Query: `
                    SELECT
                        Item.itemid as itemname,
                        Item.displayname as itemdisplayname,
                        Item.id AS iteminternalid,
                        Item.custitem_soft_comit AS itemisjit,
                        Item.custitem_fc_zen_sft_comm_qty AS itemstandingjitqty,
                        Item.custitem_fc_am_jit_start_qty AS itemstartjitqty,
                        Item.custitem_fc_am_jit_remaining AS itemremainjitqty,
                        Item.custitem_fc_zen_jit_producers AS itemjitproducers,		
                    FROM
                        Item
                    WHERE
                        Item.custitem_soft_comit = 'T'
                        @@ITEM_NAME_FILTER_1@@
                    `,
                Filters: {
                    ItemNames: {
                        ParamPlaceholder: '@@ITEM_NAME_LIST@@',
                        QueryLinePlaceholders: {
                            '@@ITEM_NAME_FILTER_1@@': 'AND Item.itemid IN (@@ITEM_NAME_LIST@@)',
                            // '@@PO_ID_FILTER_2@@': 'WHERE (InventoryAssignment.transaction = @@PO_ID@@)',
                        },
                    },
                },
                // FIX: This is entirely generic -- it should be ported to FCLib
                BuildQuery: function (itemNames) {
                    let sqlQuery = this.Query;
                    if (itemNames && itemNames.length > 0) {
                        let itemNamesStr = itemNames.map(itemName => `'${itemName}'`).join(',');
                        let itemNameFilter = this.Filters.ItemNames;
                        for (let key of Object.keys(itemNameFilter.QueryLinePlaceholders)) {
                            let filterText = itemNameFilter.QueryLinePlaceholders[key].replace(
                                itemNameFilter.ParamPlaceholder,
                                itemNamesStr
                            );
                            sqlQuery = sqlQuery.replace(
                                key,
                                filterText
                            );
                        }

                    }
                    return sqlQuery;
                },
                FieldSet1: {
                    ItemName: {
                        fieldid: 'itemname',
                        label: 'Item Name',
                    },
                    ItemInternalId: {
                        fieldid: 'iteminternalid',
                        label: 'Internal ID',
                    },
                    ItemDisplayName: {
                        fieldid: 'itemdisplayname',
                        label: 'Display Name',
                    },
                    ItemIsJit: {
                        fieldid: 'itemisjit',
                        label: 'Item Is JIT?',
                    },
                    ItemStandingJitQty: {
                        fieldid: 'itemstandingjitqty',
                        label: 'Standing JIT Qty',
                    },
                    ItemStartJitQty: {
                        fieldid: 'itemstartjitqty',
                        label: 'Start JIT Qty',
                    },
                    ItemRemainJitQty: {
                        fieldid: 'itemremainjitqty',
                        label: 'Remaining JIT Qty',
                    },
                },

            },
            GET_VENDORS_WITH_SUCCESS_CSV_ITEMS: {
                Query: `
                    SELECT
                        Item.displayname AS itemdisplayname,
                        Vendor.companyname AS vendorname,
                        Vendor.id AS vendorinternalid,
                    FROM
                        Item
                    LEFT OUTER JOIN ItemVendor ON Item.id = ItemVendor.item
                    LEFT OUTER JOIN Vendor ON ItemVendor.vendor = Vendor.id
                    
                    WHERE
                        Item.id IN (@@ITEM_ID_LIST@@)
                    `,
                // FIX: This is entirely generic -- it should be ported to FCLib
                BuildQuery: function (itemIds) {
                    let itemIdsStr = itemIds.map(itemId => `'${itemId}'`).join(',');
                    return this.Query.replace('@@ITEM_ID_LIST@@', itemIdsStr);
                },
                FieldSet1: {
                    ItemDisplayName: {
                        fieldid: 'displayname',
                        label: 'Item Display Name',
                    },
                    VendorId: {
                        fieldid: 'vendorinternalid',
                        label: 'Vendor Internal ID',
                    },
                    VendorName: {
                        fieldid: 'vendorname',
                        label: 'Vendor Name',
                    },
                },
            },
            GET_JIT_VENDORS_WITHOUT_CSV_ITEMS: {
                Query: `
                    SELECT
                        ItemVendor.vendor as vendorid,
                        Vendor.companyname as vendorname,
                        COUNT(Item.id) AS jititemcount,
                        CASE WHEN SUM(
                            CASE WHEN Item.custitem_fc_am_jit_remaining > 0 THEN 1 ELSE 0 END
                            ) > 0 THEN 'Yes' ELSE 'No' END AS hasitemsjitremaining,
                        SUM(
                            CASE WHEN Item.custitem_fc_am_jit_remaining > 0 THEN 1 ELSE 0 END
                            ) AS countitemswithjitremaining
                    FROM
                        Item
                    LEFT OUTER JOIN
                        ItemVendor ON Item.id = ItemVendor.item
                    LEFT OUTER JOIN
                        Vendor ON ItemVendor.vendor = Vendor.id
                    WHERE
                        Vendor.id NOT IN (
                            SELECT
                                Vendor.id AS vendorinternalid,
                            FROM
                                Item
                            LEFT OUTER JOIN ItemVendor ON Item.id = ItemVendor.item
                            LEFT OUTER JOIN Vendor ON ItemVendor.vendor = Vendor.id
                            
                            WHERE
                                Item.id IN (@@ITEM_ID_LIST@@)
                        )
                        AND ItemVendor.preferredVendor = 'T' 
                        AND Item.custitem_soft_comit = 'T'
                    GROUP BY
                        ItemVendor.vendor,
                        Vendor.companyname
                    ORDER BY 
                        Vendor.companyname
                    `,
                BuildQuery: function (itemIds) {
                    let itemIdsStr = itemIds.map(itemId => `'${itemId}'`).join(',');
                    return this.Query.replace('@@ITEM_ID_LIST@@', itemIdsStr);
                },
                FieldSet1: {
                    VendorInternalId: {
                        fieldid: 'vendorid',
                        label: 'Vendor Internal ID',
                    },
                    VendorName: {
                        fieldid: 'vendorname',
                        label: 'Vendor Name',
                    },
                    JitItemCount: {
                        fieldid: 'jititemcount',
                        label: 'JIT Item Count',
                    },
                    HasItemsJitRemaining: {
                        fieldid: 'hasitemsjitremaining',
                        label: 'Has Items JIT Remaining',
                    },
                    CountItemsWithJitRemaining: {
                        fieldid: 'countitemswithjitremaining',
                        label: 'Count Items With JIT Remaining',
                    },
                },
            },

            GET_JIT_ITEMS_ON_FUTURE_SOS: {
                Query: `
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
            },

        },
        CsvFormats: {
            INPUT_JIT_ITEM_CSV: {
                RequiredFieldSet: {
                    ExternalId: 'ExternalID',
                    JitStartQty: 'Start Quantity'
                },
                GetFileHeaders: function () {
                    return Object.values(this.RequiredFieldSet);
                },
            },


            PARSE_ERROR_CSV: {
                FieldSet1: {
                    Error: {
                        fieldid: 'errors',
                        label: 'Errors'
                    }
                },
            },
            ITEMS_TO_UPDATE_CSV: {
                FileName: 'JIT_Raw_Items_from_Input.csv',
                FieldSet1: {
                    ItemInternalId: {
                        fieldid: 'id',
                        label: 'Item Internal ID',
                    },
                    ItemName: {
                        fieldid: 'itemid',
                        label: 'Item Name',
                        InputHeader: 'ExternalID',
                    },
                    JitStartQuantity: {
                        // fieldid: 'startquantity',
                        label: 'JIT Start Quantity',
                        InputHeader: 'Start Quantity',
                    }
                    // NewStartQty: {
                    //     fieldid: 'filename',
                    //     label: 'File Name',
                    // },
                    // FileLastModifiedDate: {
                    //     fieldid: 'filelastmodifieddate',
                    //     label: 'Last Modified Date',
                    // },              
                },
            },
        },
    };

    var Ids = {
        Scripts: {
            MR_JIT_UPDATE: 'customscript_fc_am_jit_mr_updateitemjit',
        },
        Deployments: {
            MR_JIT_UPDATE: 'customdeploy_fc_am_jit_mr_updateitemjit',
        },
        Parameters: {
            JIT_ITEM_UPDATE_CSV_FILEID: 'custscript_fc_am_jit_update_csv_fileid',
            SUBTRACT_FUTURE_SOS_ON_UPDATE: 'custscript_fc_am_jit_subtract_future_sos',
        }

    };
    exports.Ids = Ids;


    var IO = {
        SESSION_RESULTS_FOLDER_NAME_PREFIX: 'JIT_Availability_Update_',
        CSV_ORIGINALS_SUBFOLDER_NAME: 'Originals',
        FolderIds: {
            // PROD
            // INPUT: 8142,
            // RESULTS: 8141,
            INPUT: 8544,
            RESULTS: 8546,
        },
    };
    exports.IO = IO;

    var Settings = {
        Ui: {
            Step1: {
                Main: {
                    JIT_UPLOAD_UTILITY_FORM_TITLE: 'JIT Upload Utility',
                },
                Parameters: {
                    SELECT_CSV_CHECKBOX_ID: {
                        prefix: 'custpage_selectcsv_cb_',
                        build: (fileId) => { return 'custpage_selectcsv_cb_' + fileId; },
                        looksLike: (val) => { return val.startsWith('custpage_selectcsv_cb_'); },
                    },
                },
                Fields: {
                    FILE_TABLE_FIELD_ID: 'custpage_file_table',
                    FILE_TABLE_FIELD_LABEL: 'Candidate CSV Files in Input Folder',
                },
                FieldGroups: {
                    FILE_TABLE_FIELD_GROUP_ID: 'custpage_file_table_fieldgroup',
                    FILE_TABLE_FIELD_GROUP_LABEL: 'Candidate CSV Files in Input Folder',
                },
                Sublists: {
                    FILE_TABLE: {
                        Id: 'custpage_file_table_sublist',
                        Label: 'Candidate CSV Files in Input Folder',
                        Fields: {
                            Select: {
                                Label: 'Select',
                                DefaultValue: 'checked',
                            },
                            FileId: {
                                Label: 'File ID',
                                QuerySource: exports.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID.FieldSet1.FileId,
                            },
                            FileName: {
                                Label: 'File Name',
                                QuerySource: exports.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID.FieldSet1.FileName,
                            },
                            FileLastModifiedDate: {
                                Label: 'Last Modified Date',
                                QuerySource: exports.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID.FieldSet1.FileLastModifiedDate,
                            },
                        },
                    },
                },
            },
            Step2: {
                Fields: {
                    CSV_ERROR_RESULTS_FIELD_ID: 'custpage_error_results',
                    CSV_ERROR_RESULTS_FIELD_LABEL: 'Error Results',
                    CSV_SUCCESS_RESULTS_FIELD_ID: 'custpage_item_update_results',
                    CSV_SUCCESS_RESULTS_FIELD_LABEL: 'Item Update Results',
                    SUCCESSFUL_ITEM_CACHE_FILE_FIELD_LABEL: 'Successful Item Cache File',
                },
                FieldGroups: {
                    CSV_ERROR_RESULTS_FIELD_GROUP_ID: 'custpage_error_results_fieldgroup',
                    CSV_ERROR_RESULTS_FIELD_GROUP_LABEL: 'Error Results',
                    CSV_SUCCESS_RESULTS_FIELD_GROUP_ID: 'custpage_item_update_results_fieldgroup',
                    CSV_SUCCESS_RESULTS_FIELD_GROUP_LABEL: 'Successfully Parsed Items',
                },
                Parameters: {
                    SUCCESSFUL_ITEM_CACHE_FILE_FIELD_ID: 'custpage_successful_item_cache_file',
                    SELECT_ITEM_CHECKBOX_ID: {
                        prefix: 'custpage_selectitem_cb_',
                        build: (fileId) => { return 'custpage_selectitem_cb_' + fileId; },
                        looksLike: (val) => { return val.startsWith('custpage_selectitem_cb_'); },
                    },
                },
                Sublists: {
                    SUCCESS_ITEM_TABLE: {
                        Id: 'custpage_success_item_table_sublist',
                        Label: 'Successfully Parsed Items from Input CSVs',
                        Fields: {
                            Select: {
                                Label: 'Select',
                                DefaultValue: 'checked',
                            },
                            ItemInternalId: {
                                Label: 'Internal Id',
                                QuerySource: exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemInternalId,
                            },
                            ItemName: {
                                Label: 'Item Name',
                                QuerySource: exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemName,
                            },
                            ItemDisplayName: {
                                Label: 'Item Display Name',
                                QuerySource: exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemDisplayName,
                            },

                            NewJitStartQty: {
                                Label: 'New JIT Start Qty',
                                QuerySource: {
                                    fieldid: 'custitem_jit_start_qty',
                                    label: 'New JIT Start Qty',
                                },
                            },
                            ItemStandingJitQty: {
                                Label: 'Standing JIT Qty',
                                QuerySource: exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemStandingJitQty,
                            },
                            ItemStartJitQty: {
                                Label: 'Current STart JIT Qty',
                                QuerySource: exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemStartJitQty,
                            },
                            ItemRemainJitQty: {
                                Label: 'CurrentRemaining JIT Qty',
                                QuerySource: exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemRemainJitQty,
                            },
                        },
                    },
                },
            },
            Step3: {
                Parameters: {
                    TABLE1_ACTION_RADIOBUTTON: {
                        prefix: 'custpage_table1_action_rb_',
                        build: (fileId) => { return 'custpage_table1_action_rb_' + fileId; },
                        looksLike: (val) => { return val.startsWith('custpage_table1_action_rb_'); },
                    },
                },
                Sublists: {
                    SUCCESS_ITEM_TABLE: {
                        Id: 'custpage_vendors_w_csv_sublist',
                        Label: 'Vendors With Items in CSV Files',
                        Fields: {
                            VendorId: {
                                Label: 'Vendor Id',
                                QuerySource: exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1.VendorId,
                                
                            },
                            VendorName: {
                                Label: 'Vendor Name',
                                QuerySource: exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1.VendorName,
                            },
                            ActionNoAction: {
                                Label: 'No Action',
                                DefaultValue: 'checked',
                            },
                            ActionZeroJitAvailability: {
                                Label: 'Zero JIT Availability',
                                DefaultValue: 'checked',
                            },
                            ActionZeroPlusApplyStanding: {
                                Label: 'Zero Plus Apply Standing JIT Avail',
                                DefaultValue: 'checked',
                            },
                            ActionZeroNoApplyStanding: {
                                Label: 'Zero No Apply Standing JIT Avail',
                                DefaultValue: 'checked',
                            },
                            SubtractFutureSosFromJitAvail: {
                                Label: 'Subtract Future SOs from JIT Avail',
                                DefaultValue: 'checked',
                            },
                            ApplyCsvAvailability: {
                                Label: 'Apply CSV Availability',
                                DefaultValue: 'checked',
                            },
                        },
                    },
                },
            },
        },
    };
    exports.Settings = Settings;



    return exports;
}

