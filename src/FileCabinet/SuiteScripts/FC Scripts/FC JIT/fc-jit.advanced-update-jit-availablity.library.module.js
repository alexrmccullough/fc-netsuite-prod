var log, 
    task,
    runtime,
    email,
    ui,
    FCLib;

define(['N/log', 
    'N/task', 
    'N/runtime', 
    'N/email', 
    'N/ui/serverWidget', 
    '../Libraries/fc-main.library.module'
], main);

function main(logModule,  taskModule, runtimeModule, emailModule, uiModule, fcLibModule) {
    log = logModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;
    ui = uiModule;
    FCLib = fcLibModule;

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
                    WITH T AS (
                        SELECT Vendor.companyname AS vendorname,
                            Vendor.id AS vendorinternalid,
                            SUM(
                                CASE
                                    WHEN Item.custitem_fc_zen_sft_comm_qty > 0 THEN 1
                                    ELSE 0
                                END
                            ) AS countitemswithstandingjit,
                            CASE
                                WHEN SUM(
                                    CASE
                                        WHEN Item.custitem_fc_zen_sft_comm_qty > 0 THEN 1
                                        ELSE 0
                                    END
                                ) > 0 THEN 'T'
                                ELSE ''
                            END AS hasstandingjit
                        FROM Item
                            LEFT OUTER JOIN ItemVendor ON Item.id = ItemVendor.item
                            LEFT OUTER JOIN Vendor ON ItemVendor.vendor = Vendor.id
                        WHERE
                            Item.id IN (@@ITEM_ID_LIST@@)
                        GROUP BY 
                            Vendor.companyname,
                            Vendor.id
                    )
                    SELECT 
                        vendorname,
                        vendorinternalid,
                        countitemswithstandingjit,
                        hasstandingjit
                    FROM T
                    ORDER BY 
                        hasstandingjit,
                        vendorname
                    `,
                // FIX: This is entirely generic -- it should be ported to FCLib
                BuildQuery: function (itemIds) {
                    let itemIdsStr = itemIds.map(itemId => `'${itemId}'`).join(',');
                    return this.Query.replace('@@ITEM_ID_LIST@@', itemIdsStr);
                },
                FieldSet1: {
                    // ItemDisplayName: {
                    //     fieldid: 'displayname',
                    //     label: 'Item Display Name',
                    // },
                    VendorId: {
                        fieldid: 'vendorinternalid',
                        label: 'Vendor Internal ID',
                    },
                    VendorName: {
                        fieldid: 'vendorname',
                        label: 'Vendor Name',
                    },
                    CountItemsWithStandingJit: {
                        fieldid: 'countitemswithstandingjit',
                        label: 'Standing JIT Item Count',
                    },
                    HasStandingJit: {
                        fieldid: 'hasstandingjit',
                        label: 'Has Standing JIT?',
                    },
                },
            },
            GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS: {
                Query: `
                    SELECT *
                    FROM (
                            SELECT ROWNUM AS ROWNUMBER,
                                *
                            FROM (
                                    WITH ExcudeVendors AS (
                                        SELECT Vendor.id AS vendorinternalid
                                        FROM Item
                                            LEFT JOIN ItemVendor ON Item.id = ItemVendor.item
                                            LEFT JOIN Vendor ON ItemVendor.vendor = Vendor.id
                                        @@VENDOR_FILTER_LINE@@
                                    ),
                                    T AS (
                                        SELECT ItemVendor.vendor as vendorid,
                                            Vendor.companyname as vendorname,
                                            COUNT(Item.id) AS jititemcount,
                                            CASE
                                                WHEN SUM(
                                                    CASE
                                                        WHEN Item.custitem_fc_am_jit_remaining > 0 THEN 1
                                                        ELSE 0
                                                    END
                                                ) > 0 THEN 'Yes'
                                                ELSE 'No'
                                            END AS hasitemsjitremaining,
                                            SUM(
                                                CASE
                                                    WHEN Item.custitem_fc_am_jit_remaining > 0 THEN 1
                                                    ELSE 0
                                                END
                                            ) AS countitemswithjitremaining,
                                            SUM(
                                                CASE
                                                    WHEN Item.custitem_fc_zen_sft_comm_qty > 0 THEN 1
                                                    ELSE 0
                                                END
                                            ) AS countitemswithstandingjit,
                                            CASE
                                                WHEN SUM(
                                                    CASE
                                                        WHEN Item.custitem_fc_zen_sft_comm_qty > 0 THEN 1
                                                        ELSE 0
                                                    END
                                                ) > 0 THEN 'T'
                                                ELSE ''
                                            END AS hasstandingjit
                                        FROM Item
                                            LEFT JOIN ItemVendor ON Item.id = ItemVendor.item
                                            LEFT JOIN Vendor ON ItemVendor.vendor = Vendor.id
                                        WHERE ItemVendor.preferredVendor = 'T'
                                            AND Item.custitem_soft_comit = 'T'
                                            AND Vendor.id NOT IN (
                                                SELECT vendorinternalid
                                                FROM ExcudeVendors
                                            )
                                        GROUP BY ItemVendor.vendor,
                                            Vendor.companyname
                                    )
                                    SELECT T.vendorid AS vendorinternalid,
                                        T.vendorname AS vendorname,
                                        T.jititemcount AS jititemcount,
                                        T.hasitemsjitremaining AS hasitemsjitremaining,
                                        T.countitemswithjitremaining AS countitemswithjitremaining,
                                        T.countitemswithstandingjit AS countitemswithstandingjit,
                                        T.hasstandingjit AS hasstandingjit
                                    FROM T
                                    ORDER BY 
                                        T.hasstandingjit,
                                        T.vendorname
                                )
                        )
                        `,
                BuildQuery: function (itemIds) {
                    let vendorFilter = ''
                    if (itemIds && itemIds.length > 0) {
                        let itemIdsStr = itemIds.map(itemId => `'${itemId}'`).join(',');

                        vendorFilter = `WHERE Item.id IN (${itemIdsStr})`;
                    };

                    return this.Query.replace('@@VENDOR_FILTER_LINE@@', vendorFilter);
                },
                Filters: {
                    FilterOutCsvVendors: {
                        ParamPlaceholder: '@@CSV_VENDOR_ID_LIST@@',
                        QueryLinePlaceholder: {
                            '@@CSV_VENDOR_FILTER@@':
                                `Vendor.id NOT IN (
                                    SELECT
                                        Vendor.id AS vendorinternalid,
                                    FROM
                                        Item
                                    LEFT JOIN ItemVendor ON Item.id = ItemVendor.item
                                    LEFT JOIN Vendor ON ItemVendor.vendor = Vendor.id
                                    
                                    WHERE
                                        Item.id IN (@@ITEM_ID_LIST@@)
                                ) AND
                                `,
                        },
                    },
                },
                FieldSet1: {
                    VendorId: {
                        fieldid: 'vendorinternalid',
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
                    CountItemsWithStandingJit: {
                        fieldid: 'countitemswithstandingjit',
                        label: 'Count Items With Standing JIT',
                    },
                    HasStandingJit: {
                        fieldid: 'hasstandingjit',
                        label: 'Has Standing JIT',
                    },
                },
            },

            GET_JIT_ITEM_DETAILS_FOR_VENDORS: {
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
                        ItemVendor.vendor as vendorid,
                        Vendor.companyname as vendorname
                    FROM
                        Item
                    JOIN ItemVendor ON Item.id = ItemVendor.item
                    JOIN Vendor ON ItemVendor.vendor = Vendor.id
                    WHERE
                        Item.custitem_soft_comit = 'T'
                        AND ItemVendor.vendor IN (@@VENDOR_ID_LIST@@)
                        AND ItemVendor.preferredVendor = 'T'
                    ORDER BY Item.itemid
                `,
                BuildQuery: function (vendorIds) {
                    let vendorIdsStr = vendorIds.map(vendorId => `'${vendorId}'`).join(',');
                    return this.Query.replace('@@VENDOR_ID_LIST@@', vendorIdsStr);
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
                    VendorId: {
                        fieldid: 'vendorid',
                        label: 'Vendor ID',
                    },
                    VendorName: {
                        fieldid: 'vendorname',
                        label: 'Vendor Name',
                    },
                },
            },

            GET_JIT_ITEMS_ON_FUTURE_SOS: {
                Query: `
                    SELECT
                        SUM(Abs(TransactionLine.quantity)) as totalQty,
                        Item.itemId as itemId,
                        Item.id as iteminternalid,
            
                    FROM
                        TransactionLine
            
                    JOIN Item ON Item.id = TransactionLine.item
                    JOIN ItemVendor ON Item.id = ItemVendor.item
                    JOIN Transaction ON Transaction.id = TransactionLine.transaction
            
                    WHERE
                        Transaction.type = 'SalesOrd'
                        AND Item.custitem_soft_comit = 'T'
                        AND ItemVendor.vendor IN (@@VENDOR_ID_LIST@@)
                        AND ItemVendor.preferredVendor = 'T'
                        AND Transaction.shipDate >= (SELECT SYSDATE FROM Dual)
                    
                    GROUP BY
                        Item.id,
                        Item.itemId
                    `,
                BuildQuery: function (vendorIds) {
                    let vendorIdsStr = vendorIds.map(vendorId => `'${vendorId}'`).join(',');
                    return this.Query.replace('@@VENDOR_ID_LIST@@', vendorIdsStr);
                },
                FieldSet1: {
                    ItemName: {
                        fieldid: 'itemid',
                        label: 'Item Name',
                    },
                    ItemInternalId: {
                        fieldid: 'iteminternalid',
                        label: 'Item Internal ID',
                    },
                    TotalQty: {
                        fieldid: 'totalqty',
                        label: 'Total Qty',
                    },
                },
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
            MR_JIT_UPDATE: 'customscript_fc_am_mr_adv_updateitemjit',
        },
        Deployments: {
            MR_JIT_UPDATE: 'customdeploy_fc_am_mr_adv_updateitemjit',
        },
        Parameters: {
            JIT_ITEM_UPDATE_CSV_FILEID: 'custscript_fc_am_adv_jit_update_csvid',
            // SUBTRACT_FUTURE_SOS_ON_UPDATE: 'custscript_fc_am_jit_subtract_future_sos',
        }

    };
    exports.Ids = Ids;


    var IO = {
        SESSION_RESULTS_FOLDER_NAME_PREFIX: 'JIT_Availability_Update_',
        CSV_ORIGINALS_SUBFOLDER_NAME: 'Originals',
        CSV_FINAL_CHANGES_FILENAME: 'JIT_Availability_Update_Final.csv',
        ZERO_AVAILABILITY_CSV_FILENAME_PREFIX: 'Zero_Availability_Items_',
        FolderIds: {
            INPUT: {
                Sandbox: 8544,
                Prod: 8142,
                GetId: function () { return FCLib.getEnvSpecificFolderId(this.Sandbox, this.Prod); },
            },
            RESULTS: {
                Sandbox: 8546,
                Prod: 8141,
                GetId: function () { return FCLib.getEnvSpecificFolderId(this.Sandbox, this.Prod); },
            },
        },
    };
    exports.IO = IO;


    var Parameters = {
        Step1: {
            SELECT_CSV_CHECKBOX: {
                prefix: 'custpage_selectcsv_cb_',
                looksLike: (val) => { return val.startsWith('custpage_selectcsv_cb_'); },
                build: (itemId) => { return `custpage_selectcsv_cb_${itemId}`; },
                parse: (val) => { return val.replace('custpage_selectcsv_cb_', ''); },
            },
        },
        // FIX: Apply this new setup to the other parameters across other apps  
        Step2: {
            // SUCCESSFUL_ITEM_CACHE_FILE_FIELD_ID: 'custpage_successful_item_cache_file',
            SELECT_ITEM_CHECKBOX: {
                prefix: 'custpage_selectitem_cb_',
                looksLike: (val) => { return val.startsWith(this.prefix); },
                build: (itemId) => { return `${this.prefix}${itemId}`; },
                parse: (val) => { return val.replace(this.prefix, ''); },
                // looksLike: (val) => { return val.startsWith('custpage_selectitem_cb_'); },
                // build: (itemId) => { return `custpage_selectitem_cb_${itemId}`; },
                // parse: (val) => { return val.replace('custpage_selectitem_cb_', ''); },

            },
        },
        Step3: {
            VENDOR_ACTION_RADIOBUTTON: {
                prefix: 'custpage_table1_action_rb_',
                build: (vendorId) => {
                    let curThis = this;
                    return 'custpage_table1_action_rb_' + vendorId;
                },
                looksLike: (val) => { return val.startsWith('custpage_table1_action_rb_'); },
                parse: (val) => { return val.replace('custpage_table1_action_rb_', ''); },
                Options: {
                    NO_ACTION: '1',
                    ZERO_JIT_AVAIL: '2',
                    ZERO_AND_APPLY_STANDING: '3',
                    APPLY_STANDING_NO_ZEROING: '4',
                },
            },
            VENDOR_SUBTRACTFUTURESOS_CHECKBOX: {
                prefix: 'custpage_subtractfuturesos_cb_',
                looksLike: (val) => { return val.startsWith('custpage_subtractfuturesos_cb_'); },
                build: (vendorId) => { return 'custpage_subtractfuturesos_cb_' + vendorId; },
                parse: (val) => { return val.replace('custpage_subtractfuturesos_cb_', ''); },
            },
            VENDOR_APPLYCSV_CHECKBOX: {
                prefix: 'custpage_applycsv_cb_',
                looksLike: (val) => { return val.startsWith('custpage_applycsv_cb_'); },
                build: (vendorId) => { return 'custpage_applycsv_cb_' + vendorId; },
                parse: (val) => { return val.replace('custpage_applycsv_cb_', ''); },
            },
            CSV_ITEMS_SELECTED_FROM_STEP2_HIDDENFIELD: {
                prefix: 'custpage_csvitemsselected_cb_',
                looksLike: (val) => { return val.startsWith('custpage_csvitemsselected_cb_'); },
                build: (itemId) => { return 'custpage_csvitemsselected_cb_' + itemId; },
                parse: (val) => { return val.replace('custpage_csvitemsselected_cb_', ''); },
            },
        },
        Step4: {
            SELECT_JIT_CHANGE_CHECKBOX: {
                prefix: 'custpage_selectjitchange_cb_',
                looksLike: (val) => { return val.startsWith('custpage_selectjitchange_cb_'); },
                buildName: (itemId) => { return 'custpage_selectjitchange_cb_' + itemId; },
                buildValue: (newJitStart, newJitRemain) => {
                    let value = {
                        newJitStart: Number(newJitStart),
                        newJitRemain: Number(newJitRemain),
                    };
                    let valueString = JSON.stringify(value);
                    return valueString;
                },
                parseName: (val) => { return val.replace('custpage_selectjitchange_cb_', ''); },
                parseValue: (val) => { return JSON.parse(val); },
            }
        },
    };
    exports.Parameters = Parameters;



    var Settings = {
        Email: {
            SUMMARIZE_EMAIL: {
                EmailSubject: {
                    Template: `JIT Availability Update Summary - {{TIMESTAMP}}`,
                },

                EmailBody: {
                    Template: `
                        <p>An imported update to JIT availability has been completed by user: {{USER}}</p>. 
                        <br>
                        <h3>Succesfully updated items</h3>
                        {{SUCCESSFUL_CHANGES}}
                        <br>
                        <h3>Failed items</h3>
                        {{FAILED_CHANGES}}
                    `,
                },
                BuildSubject: function (testVar = '') {
                    log.debug({title: 'this in BuildSubject', details: this + ', ' + JSON.stringify(this)});

                    let timestamp = FCLib.getStandardDateTimeString1();
                    let subject = this.EmailSubject.Template;
                    subject = subject.replace('{{TIMESTAMP}}', timestamp);
                    return subject;
                },
                BuildBody: function (
                    user = '',
                    successfulChanges = '',
                    failedChanges = ''
                ) {
                    log.debug({title: 'this in BuildBody', details: this + ', ' + JSON.stringify(this)});

                    let body = this.EmailBody.Template;
                    body = body.replace('{{USER}}', user);
                    body = body.replace('{{SUCCESSFUL_CHANGES}}', successfulChanges);
                    body = body.replace('{{FAILED_CHANGES}}', failedChanges);
                    return body;
                },

                RecipientsEmails: [],
                CcEmails: [],
                // RecipientsEmails: ['procurement@foodconnects.org'],
                // CcEmails: ['sales@foodconnects.org'],
                BccEmails: [],

                SUCCESS_TABLE: {
                    Id: 'custpage_success_table',
                    Label: 'Successful JIT Availability Updates',
                    Fields: {
                        ItemInternalId: {
                            Label: 'Item Internal Id',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.InternalId]; },
                        },
                        ItemName: {
                            Label: 'Item Name',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.Name]; },
                        },
                        ItemDisplayName: {
                            Label: 'Item Display Name',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.DisplayName]; },
                        },
                        StartJitQty: {
                            Label: 'Start JIT Qty',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.StartJITQty]; },
                        },
                        RemainingJitQty: {
                            Label: 'Remaining JIT Qty',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.RemainingJITQty]; },
                        },
                    },
                },

                FAILURE_TABLE: {
                    Id: 'custpage_failure_table',
                    Label: 'Failed JIT Availability Updates',
                    Fields: {
                        ItemInternalId: {
                            Label: 'Item Internal Id',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.InternalId]; },
                        },
                        ItemName: {
                            Label: 'Item Name',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.Name]; },
                        },
                        ItemDisplayName: {
                            Label: 'Item Display Name',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.DisplayName]; },
                        },
                        StartJitQty: {
                            Label: 'Start JIT Qty',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.StartJITQty]; },
                        },
                        RemainingJitQty: {
                            Label: 'Remaining JIT Qty',
                            GetTableElem: (thisRow) => { return thisRow[FCLib.Ids.Fields.Item.RemainingJITQty]; },
                        },
                        ErrorMessage: {
                            Label: 'Error',
                            GetTableElem: (thisRow) => { return thisRow.errorMessage; },
                        },
                    },
                },
            },
        },
        Ui: {
            Step1: {
                Main: {
                    JIT_UPLOAD_UTILITY_FORM_TITLE: 'JIT Upload Utility',
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
                    FILE_TABLE_2: {
                        Id: 'custpage_file_table_2',
                        Label: 'Candidate CSV Files in Input Folder',
                        Fields: {
                            CB_Select: {
                                Label: 'Select',
                                DefaultState: 'checked',
                                GetTableElem: function (thisRow) {
                                    const queryFields = exports.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID.FieldSet1;
                                    const fileId = thisRow[queryFields.FileId.fieldid];
                                    let name = exports.Parameters.Step1.SELECT_CSV_CHECKBOX.build(fileId);
                                    let id = name;
                                    let value = fileId;
                                    let style = FCLib.Ui.CheckboxStyles.Style1;
                                    return `<input type="checkbox" name="${name}" id="${id}" value="${value}" style="${style}" ${this.DefaultState}>`;
                                },
                            },

                            FileId: {
                                Label: 'File ID',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID.FieldSet1.FileId.fieldid];
                                },
                            },
                            FileName: {
                                Label: 'File Name',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID.FieldSet1.FileName.fieldid];
                                },
                            },
                            FileLastModifiedDate: {
                                Label: 'Last Modified',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID.FieldSet1.FileLastModifiedDate.fieldid];
                                },
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
                    // SUCCESSFUL_ITEM_CACHE_FILE_FIELD_LABEL: 'Successful Item Cache File',
                },
                FieldGroups: {
                    CSV_ERROR_RESULTS_FIELD_GROUP_ID: 'custpage_error_results_fieldgroup',
                    CSV_ERROR_RESULTS_FIELD_GROUP_LABEL: 'Error Results',
                    CSV_SUCCESS_RESULTS_FIELD_GROUP_ID: 'custpage_item_update_results_fieldgroup',
                    CSV_SUCCESS_RESULTS_FIELD_GROUP_LABEL: 'Successfully Parsed Items',
                },
                Sublists: {
                    ITEMS_SUCCESSFULLY_PARSED_TABLE: {
                        Id: 'custpage_items_successfully_parsed_table',
                        Label: 'Successfully Parsed Items from Input CSVs',
                        Fields: {
                            NewJitStartQty: {               // This field is injected programatically, so we need to treat it a little specially.
                                Label: 'New JIT Start Qty',
                                FieldId: 'CUST_new_jitstartqty',
                                GetTableElem: function (thisRow) {
                                    return thisRow[this.FieldId] || '';
                                },
                            },
                            CB_Select: {
                                Label: 'Select',
                                DefaultState: 'checked',
                                GetTableElem: function (thisRow) {
                                    const queryFields = exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1;
                                    let itemId = thisRow[queryFields.ItemInternalId.fieldid];
                                    let name = exports.Parameters.Step2.SELECT_ITEM_CHECKBOX.build(itemId);
                                    let id = name;
                                    let value = thisRow['CUST_new_jitstartqty'];          // Referring to the custom entry NewJitStartQty
                                    let style = FCLib.Ui.CheckboxStyles.Style1;

                                    return `<input type="checkbox" name="${name}" id="${id}" value="${value}" style="${style}" ${this.DefaultState}>`;
                                },
                            },
                            ItemInternalId: {
                                Label: 'Internal Id',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemInternalId.fieldid] || '';
                                },
                            },
                            ItemName: {
                                Label: 'Item Name',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemName.fieldid] || '';
                                },
                            },
                            ItemDisplayName: {
                                Label: 'Item Display Name',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemDisplayName.fieldid] || '';
                                },
                            },
                            ItemStandingJitQty: {
                                Label: 'Current Item Standing JIT Qty',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemStandingJitQty.fieldid] || '';
                                },
                            },
                            ItemStartJitQty: {
                                Label: 'Current Item Start JIT Qty',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemStartJitQty.fieldid] || '';
                                },
                            },
                            ItemRemainJitQty: {
                                Label: 'Current Item Remain JIT Qty',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemRemainJitQty.fieldid] || '';
                                },
                            },
                        },
                    },
                },
            },
            Step3: {
                FormFields: {
                    VENDOR_TABLE_WITH_CSV_ITEMS: {
                        Id: 'custpage_vendors_w_csv_items',
                        Label: 'Vendors With Items in CSV Files',
                    },
                    VENDOR_TABLE_NON_CSV: {
                        Id: 'custpage_vendors_non_csv',
                        Label: 'Vendors Without Items in CSV Files',
                    },
                    CSV_ITEMS_SELECTED_FROM_STEP2_HIDDEN: {
                        Id: 'custpage_csv_items_selected_from_step2',
                        Label: 'CSV Items Selected From Step 2',
                    },

                },
                Sublists: {
                    SUCCESS_VENDOR_TABLE_WITH_CSV: {
                        Id: 'custpage_vendors_w_csv_sublist',
                        Label: 'Vendors With Items in CSV Files',
                        Fields: {
                            VendorId: {
                                Label: 'Vendor Id',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                },
                            },
                            VendorName: {
                                Label: 'Vendor Name',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1.VendorName.fieldid];
                                },
                            },
                            StandingJitItemCount: {
                                Label: 'Standing JIT Items',
                                GetTableElem: function (thisRow) {
                                    let val = thisRow[exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1.CountItemsWithStandingJit.fieldid];
                                    return val ? val : '';
                                },
                            },
                            ActionRadio_NoAction: {
                                Label: 'No Action',
                                DefaultState: 'checked',
                                GetTableElem: function (thisRow) {
                                    let prefix = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.prefix;
                                    let vendorId = thisRow[exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.build(vendorId);
                                    let id = name + '_noaction';
                                    let value = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.Options.NO_ACTION;
                                    let style = FCLib.Ui.RadioButtonStyles.Style1;
                                    return `<input type="radio" name="${name}" id="${id}" value="${value}" style="${style}" ${this.DefaultState}>`;
                                },
                            },

                            ActionRadio_ZeroJitAvailability: {
                                Label: 'Zero JIT Availability',
                                GetTableElem: function (thisRow) {
                                    let vendorId = thisRow[exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.build(vendorId);
                                    let id = name + '_zerojitavail';
                                    let value = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.Options.ZERO_JIT_AVAIL;
                                    let style = FCLib.Ui.RadioButtonStyles.Style1;
                                    return `<input type="radio" name="${name}" id="${id}" style="${style}" value="${value}">`;
                                },
                            },

                            ActionRadio_ZeroJitPlusApplyStanding: {
                                Label: 'Zero JIT + Apply Standing',
                                GetTableElem: function (thisRow) {
                                    let vendorId = thisRow[exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.build(vendorId);
                                    let id = name + '_zerojitapplystanding';
                                    let value = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.Options.ZERO_AND_APPLY_STANDING;
                                    let style = FCLib.Ui.RadioButtonStyles.Style1;
                                    return `<input type="radio" name="${name}" id="${id}" style="${style}" value="${value}">`;
                                }
                            },

                            ActionRadio_ApplyStandingNoZero: {
                                Label: 'Apply Standing w/o Zeroing',
                                GetTableElem: function (thisRow) {
                                    let vendorId = thisRow[exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.build(vendorId);
                                    let id = name + '_applystandingnozero';
                                    let value = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.Options.APPLY_STANDING_NO_ZEROING;
                                    let style = FCLib.Ui.RadioButtonStyles.Style1;
                                    return `<input type="radio" name="${name}" id="${id}" style="${style}" value="${value}">`;
                                }
                            },

                            SubtractFutureSosFromJitAvail: {
                                Label: 'Subtract Future SOs from JIT Avail',
                                DefaultState: 'checked',
                                GetTableElem: function (thisRow) {
                                    const queryFields = exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1;
                                    const vendorId = thisRow[queryFields.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_SUBTRACTFUTURESOS_CHECKBOX.build(vendorId);
                                    let id = name;
                                    let value = vendorId;
                                    let style = FCLib.Ui.CheckboxStyles.Style1;
                                    return `<input type="checkbox" name="${name}" id="${id}" value="${value}" style="${style}" ${this.DefaultState}>`;
                                }
                            },

                            ApplyCsvAvailability: {
                                Label: 'Apply CSV Availability',
                                DefaultState: 'checked',
                                GetTableElem: function (thisRow) {
                                    const queryFields = exports.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.FieldSet1;
                                    const vendorId = thisRow[queryFields.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_APPLYCSV_CHECKBOX.build(vendorId);
                                    let id = name;
                                    let value = vendorId;
                                    let style = FCLib.Ui.CheckboxStyles.Style2;
                                    return `<input type="checkbox" name="${name}" id="${id}" value="${value}" style="${style}" ${this.DefaultState}>`;
                                },
                            },
                        },
                    },
                    VENDOR_TABLE_NO_CSV: {
                        Id: 'custpage_vendors_no_csv_sublist',
                        Label: 'Vendors With No Items in CSV Files',
                        Fields: {
                            VendorId: {
                                Label: 'Vendor Id',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                },
                            },
                            VendorName: {
                                Label: 'Vendor Name',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS.FieldSet1.VendorName.fieldid];
                                },
                            },
                            StandingJitItemCount: {
                                Label: 'Standing JIT Items',
                                GetTableElem: function (thisRow) {
                                    let val = thisRow[exports.Queries.GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS.FieldSet1.CountItemsWithStandingJit.fieldid];
                                    return val ? val : '';
                                },
                            },
                            ActionRadio_NoAction: {
                                Label: 'No Action',
                                DefaultState: 'checked',
                                GetTableElem: function (thisRow) {
                                    let prefix = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.prefix;
                                    let vendorId = thisRow[exports.Queries.GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.build(vendorId);
                                    let id = name + '_noaction';
                                    let value = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.Options.NO_ACTION;
                                    let style = FCLib.Ui.RadioButtonStyles.Style1;
                                    return `<input type="radio" name="${name}" id="${id}" value="${value}" style="${style}" ${this.DefaultState}>`;
                                },
                            },

                            ActionRadio_ZeroJitAvailability: {
                                Label: 'Zero JIT Availability',
                                GetTableElem: function (thisRow) {
                                    let vendorId = thisRow[exports.Queries.GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.build(vendorId);
                                    let id = name + '_zerojitavail';
                                    let value = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.Options.ZERO_JIT_AVAIL;
                                    let style = FCLib.Ui.RadioButtonStyles.Style1;
                                    return `<input type="radio" name="${name}" id="${id}" style="${style}" value="${value}">`;
                                },
                            },

                            ActionRadio_ZeroJitPlusApplyStanding: {
                                Label: 'Zero JIT + Apply Standing',
                                GetTableElem: function (thisRow) {
                                    let vendorId = thisRow[exports.Queries.GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.build(vendorId);
                                    let id = name + '_zerojitapplystanding';
                                    let value = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.Options.ZERO_AND_APPLY_STANDING;
                                    let style = FCLib.Ui.RadioButtonStyles.Style1;
                                    return `<input type="radio" name="${name}" id="${id}" style="${style}" value="${value}">`;
                                }
                            },

                            ActionRadio_ApplyStandingNoZero: {
                                Label: 'Apply Standing w/o Zeroing',
                                GetTableElem: function (thisRow) {
                                    let vendorId = thisRow[exports.Queries.GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS.FieldSet1.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.build(vendorId);
                                    let id = name + '_applystandingnozero';
                                    let value = exports.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.Options.APPLY_STANDING_NO_ZEROING;
                                    let style = FCLib.Ui.RadioButtonStyles.Style1;
                                    return `<input type="radio" name="${name}" id="${id}" style="${style}" value="${value}">`;
                                }
                            },

                            SubtractFutureSosFromJitAvail: {
                                Label: 'Subtract Future SOs from JIT Avail',
                                DefaultState: 'checked',
                                GetTableElem: function (thisRow) {
                                    const queryFields = exports.Queries.GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS.FieldSet1;
                                    const vendorId = thisRow[queryFields.VendorId.fieldid];
                                    let name = exports.Parameters.Step3.VENDOR_SUBTRACTFUTURESOS_CHECKBOX.build(vendorId);
                                    let id = name;
                                    let value = vendorId;
                                    let style = FCLib.Ui.CheckboxStyles.Style1;
                                    return `<input type="checkbox" name="${name}" id="${id}" value="${value}" style="${style}" ${this.DefaultState}>`;
                                }
                            },
                        },
                    },

                    CSV_ITEMS_SELECTED_FROM_STEP2_HIDDEN: {
                        Fields: {
                            CsvItemSelected: {
                                DefaultState: 'checked',
                                GetTableElem: function (itemId, jitCount) {
                                    let name = exports.Parameters.Step3.CSV_ITEMS_SELECTED_FROM_STEP2_HIDDENFIELD.build(itemId);
                                    let id = name;
                                    let style = FCLib.Ui.CheckboxStyles.Style1;
                                    return `<input type="hidden" name="${name}" id="${id}" value="${jitCount}" style="${style}">`;
                                },
                            },
                        },
                    },
                },
            },
            Step4: {
                FormFields: {
                    PROPOSED_JIT_CHANGES_TABLE: {
                        Id: 'custpage_proposed_jit_changes_table',
                        Label: 'Proposed JIT Changes',
                    },
                },
                Sublists: {
                    PROPOSED_JIT_CHANGES: {
                        Id: 'custpage_proposed_jit_changes_sublist',
                        Label: 'Proposed JIT Changes',
                        Fields: {
                            CB_Select: {
                                Label: 'Select',
                                GetTableElem: function (thisRow) {
                                    let queryFieldSet = exports.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.FieldSet1;
                                    let itemId = thisRow[queryFieldSet.ItemInternalId.fieldid];
                                    let name = exports.Parameters.Step4.SELECT_JIT_CHANGE_CHECKBOX.buildName(itemId);
                                    let id = name;

                                    let style = FCLib.Ui.CheckboxStyles.Style1;

                                    // Determine the default value: if the new JIT values are equal to the old JIT values, then the checkbox should be unchecked
                                    let oldItemStart = thisRow[queryFieldSet.ItemStartJitQty.fieldid];
                                    let oldItemRemain = thisRow[queryFieldSet.ItemRemainJitQty.fieldid];
                                    let newItemStart = thisRow.newStartJitValue;
                                    let newItemRemain = thisRow.newRemainingJitValue;

                                    let value = exports.Parameters.Step4.SELECT_JIT_CHANGE_CHECKBOX.buildValue(
                                        newItemStart,
                                        newItemRemain
                                    );

                                    let checked = 'checked';
                                    if ((oldItemStart !== null) && (newItemStart !== null) &&
                                        (Number(oldItemStart) === Number(newItemStart)) && (Number(oldItemRemain) === Number(newItemRemain))) {
                                        checked = '';
                                    }
                                    return `<input type="checkbox" name="${name}" id="${id}" value='${value}' style="${style}" ${checked}>`;
                                },
                            },
                            VendorName: {
                                Label: 'Vendor Name',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.FieldSet1.VendorName.fieldid];
                                },
                            },
                            VendorId: {
                                Label: 'Vendor Id',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.FieldSet1.VendorId.fieldid];
                                }
                            },
                            ItemId: {
                                Label: 'Item Id',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.FieldSet1.ItemInternalId.fieldid];
                                }
                            },
                            ItemName: {
                                Label: 'Item Name',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.FieldSet1.ItemName.fieldid];
                                }
                            },
                            ItemDisplayName: {
                                Label: 'Item Display Name',
                                GetTableElem: function (thisRow) {
                                    return thisRow[exports.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.FieldSet1.ItemDisplayName.fieldid];
                                },
                            },
                            CurrentJitRemaining: {
                                Label: 'Current JIT Remain',
                                GetTableElem: function (thisRow) {
                                    let val = thisRow[exports.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.FieldSet1.ItemRemainJitQty.fieldid];
                                    return val === null ? '' : val;
                                }
                            },
                            CurrentJitStart: {
                                Label: 'Current JIT Start',
                                GetTableElem: function (thisRow) {
                                    let val = thisRow[exports.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.FieldSet1.ItemStartJitQty.fieldid];
                                    return val === null ? '' : val;
                                }
                            },
                            QtyOnFutureSos: {
                                Label: 'Qty on Future SOs',
                                GetTableElem: function (thisRow) {
                                    return thisRow.futureSoCount;
                                },
                            },
                            NewJitRemaining: {
                                Label: 'New JIT Remaining',
                                GetTableElem: function (thisRow) {
                                    return thisRow.newRemainingJitValue;
                                },
                            },
                            NewJitStart: {
                                Label: 'New JIT Start',
                                GetTableElem: function (thisRow) {
                                    return thisRow.newStartJitValue;
                                },
                            },
                            FutureSoCount: {
                                Label: 'Future SO Count',
                                GetTableElem: function (thisRow) {
                                    let val = thisRow.futureSoCount;
                                    return thisRow.futureSoCount == 0 ? '' : val;
                                },
                            },
                        },
                    },
                },
            },
        },
    };
    exports.Settings = Settings;


    function submitItemUpdateMRJob(csvFileId) {
        var mrTaskId;
        try {
            // Launch the MR task using the JIT CSV upload ID passed as a parameter
            let mrParams = {
                [exports.Ids.Parameters.JIT_ITEM_UPDATE_CSV_FILEID]: csvFileId,
            };

            let mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: ThisAppLib.Ids.Scripts.MR_JIT_UPDATE,
                deploymentId: ThisAppLib.Ids.Deployments.MR_JIT_UPDATE,
                params: mrParams
            });

            // Submit the map/reduce task
            mrTaskId = mrTask.submit();

        } catch (e) {
            log.error({ title: 'Error submitting MR task', details: e });
        }

        return mrTaskId;
    }
    exports.submitItemUpdateMRJob = submitItemUpdateMRJob;

    return exports;
}

