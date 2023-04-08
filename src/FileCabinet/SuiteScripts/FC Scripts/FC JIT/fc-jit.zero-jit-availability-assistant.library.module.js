var ui, url;

define(['N/ui/serverWidget', 'N/url'], main);

function main(serverWidgetModule, urlModule) {
    ui = serverWidgetModule;


    var exports = {
        Queries: {
            GET_VENDOR_JIT_SUMMARY: {
                Query: `
                    SELECT
                        ItemVendor.vendor as vendorid,
                        Vendor.companyname as vendorname,
                        SUM(Item.custitem_fc_am_jit_remaining),
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
                        ItemVendor.preferredVendor = 'T' 
                        AND Item.custitem_soft_comit = 'T'
                    GROUP BY
                        ItemVendor.vendor,
                        Vendor.companyname
                    ORDER BY 
                        Vendor.companyname
                `,
                FieldSet1: {
                    VendorInternalId: {
                        fieldid: 'vendorid',
                        label: 'Vendor Internal ID',
                    },
                    VendorName: {
                        fieldid: 'vendorname',
                        label: 'Vendor Name',
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

            GET_VENDOR_ITEM_DETAILS: {
                Query: `
                    SELECT
                        Item.id AS iteminternalid,
                        Item.itemid AS itemname,
                        Item.displayName AS itemdisplayname,
                        Vendor.id AS vendorid,
                        Vendor.companyname AS vendorname,
                        Item.custitem_fc_am_jit_start_qty AS startjitqty,
                        Item.custitem_fc_am_jit_remaining AS remainjitqty
                    FROM
                        Item
                    LEFT OUTER JOIN
                        ItemVendor ON Item.id = ItemVendor.item
                    LEFT OUTER JOIN
                        Vendor ON ItemVendor.vendor = Vendor.id
                    WHERE
                        ItemVendor.preferredVendor = 'T' 
                        AND Item.custitem_soft_comit = 'T'
                        @@VENDOR_ID_FILTER1@@
                    ORDER BY
                        Vendor.companyname,
                        Item.displayName
                `,
                Filters: {
                    VendorIds: {
                        ParamPlaceholder: '@@VENDOR_IDS@@',
                        QueryLinePlaceholders: {
                            '@@VENDOR_ID_FILTER1@@': 'AND ItemVendor.vendor IN (@@VENDOR_IDS@@)',
                            // '@@PO_ID_FILTER_2@@': 'WHERE (InventoryAssignment.transaction = @@PO_ID@@)',
                        },
                    },
                },
                FieldSet1: {
                    ItemId: {
                        fieldid: 'iteminternalid',
                        label: 'Item ID',
                    },
                    ItemName: {
                        fieldid: 'itemname',
                        label: 'Item Name',
                    },
                    ItemDisplayName: {
                        fieldid: 'itemdisplayname',
                        label: 'Item Display Name',
                    },
                    VendorId: {
                        fieldid: 'vendorid',
                        label: 'Vendor Internal ID',
                    },
                    VendorName: {
                        fieldid: 'vendorname',
                        label: 'Vendor Name',
                    },
                    StartJitQty: {
                        fieldid: 'startjitqty',
                        label: 'Start JIT Qty',
                    },
                    RemainJitQty: {
                        fieldid: 'remainjitqty',
                        label: 'Remain JIT Qty',
                    },
                },

            }
        },
    };

    var Ids = {
        Scripts: {
            MR_JIT_UPDATE: 'customscript_fc_am_jit_mr_updateitemjit',
        },
        Deployments: {
            MR_JIT_UPDATE: 'customdeploy_fc_am_jit_mr_updateitemjit',
        },
        Folders: {
            // PROD
            // RESULTS: 8141,
            RESULTS: 8546,
        },
    };
    exports.Ids = Ids;


    var Settings = {
        SESSION_RESULTS_FOLDER_NAME_PREFIX: 'Zero_JIT_Availability_',
        ZERO_AVAILABILITY_CSV_FILENAME_PREFIX: 'Zero_JIT_Availability_Items_',


        Ui: {
            Parameters: {
                SELECT_VENDOR_CHECKBOX_ID: {
                    prefix: 'custpage_selectvendor_cb_',
                    build: (poId) => { return 'custpage_selectvendor_cb_' + poId; },
                    looksLike: (val) => { return val.startsWith('custpage_selectvendor_cb_'); },
                },
                SELECT_ITEM_CHECKBOX_ID: {
                    prefix: 'custpage_selectitem_cb_',
                    build: (itemId) => { return 'custpage_selectitem_cb_' + itemId; },
                    looksLike: (val) => { return val.startsWith('custpage_selectitem_cb_'); },
                },
            },
            FieldDataFormat: {
            },
            Sublists: {
                SELECT_VENDORS_TO_ZERO: {
                    Id: 'custpage_sublist_vendor_jit_availability_summary',
                    Label: 'Vendor JIT Availability Summary',
                    Fields: {
                        Select: {
                            Type: ui.FieldType.CHECKBOX,
                            Label: 'Select',
                            Id: 'custpage_select_vendor_sublist_field_select',
                            DefaultValue: 'unchecked',
                            DisplayType: serverWidget.FieldDisplayType.NORMAL,
                        },
                        VendorInternalId: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Vendor Internal ID',
                            Id: 'custpage_select_vendor_sublist_field_vendorinternalid',
                            QuerySource: exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.VendorInternalId,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        VendorName: {
                            Type: ui.FieldType.TEXT,
                            Label: 'PO Internal ID',
                            Id: 'custpage_select_vendor_sublist_field_vendorname',
                            QuerySource: exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.VendorName,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        VendorHasJitItemsRemaining: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Has JIT Items with Availability?',
                            Id: 'custpage_select_vendor_sublist_field_vendorhasjititemsremaining',
                            QuerySource: exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.HasItemsJitRemaining,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        VendorItemCountJitRemaining: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Count of JIT Items with Availability',
                            Id: 'custpage_select_vendor_sublist_field_vendoritemcountjitremaining',
                            QuerySource: exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.CountItemsWithJitRemaining,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,

                        },
                    },
                },
                SELECT_ITEMS_TO_ZERO: {
                    Id: 'custpage_sublist_select_items_to_zero',
                    Label: 'Confirm Items to Zero',
                    Fields: {
                        Select: {
                            Type: ui.FieldType.CHECKBOX,
                            Label: 'Select',
                            Id: 'custpage_select_item_to_zero_select',
                            DefaultValue: 'checked',
                            DisplayType: serverWidget.FieldDisplayType.NORMAL,
                        },
                        // VendorInternalId: {
                        //     Type: ui.FieldType.TEXT,
                        //     Label: 'Vendor Internal ID',
                        //     Id: 'custpage_select_vendor_sublist_field_vendorinternalid',
                        //     QuerySource: exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.VendorInternalId,
                        //     DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        // },
                        VendorName: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Vendor Name',
                            Id: 'custpage_select_vendor_sublist_field_vendorname',
                            QuerySource: exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.VendorName,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        ItemId: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Item ID',
                            Id: 'custpage_select_item_to_zero_field_itemid',
                            QuerySource: exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.ItemId,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        ItemName: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Item Name',
                            Id: 'custpage_select_item_to_zero_field_itemname',
                            QuerySource: exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.ItemName,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        ItemDisplayName: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Item Display Name',
                            Id: 'custpage_select_item_to_zero_field_itemdisplayname',
                            QuerySource: exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.ItemDisplayName,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        RemainJitQty: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Current Remain JIT Qty',
                            Id: 'custpage_select_item_to_zero_field_remainjitqty',
                            QuerySource: exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.RemainJitQty,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        StartJitQty: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Current Start JIT Qty',
                            Id: 'custpage_select_item_to_zero_field_startjitqty',
                            QuerySource: exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.StartJitQty,
                            DisplayType: serverWidget.FieldDisplayType.DISABLED,
                        },
                        
                    },
                },
            },
        },
    };
    exports.Settings = Settings;


    function buildQueryGetVendorItemDetails(vendorIds = null) {
        let sqlQuery = exports.Queries.GET_VENDOR_ITEM_DETAILS.Query;

        // Prepare filter varialbes
        let vendorIdsStr = vendorIds === null ? '' : vendorIds.join(',');

        // Build the filter strings and insert into query
        for (let queryPlaceholder in exports.Queries.GET_VENDOR_ITEM_DETAILS.Filters.VendorIds.QueryLinePlaceholders) {
            let filterText = '';
            
            if (vendorIdsStr !== '') {
                filterText = exports.Queries.GET_VENDOR_ITEM_DETAILS.Filters.VendorIds.QueryLinePlaceholders[queryPlaceholder].replace(
                    exports.Queries.GET_VENDOR_ITEM_DETAILS.Filters.VendorIds.ParamPlaceholder,
                    vendorIdsStr
                );
            }

            sqlQuery = sqlQuery.replace(
                queryPlaceholder,
                filterText
            );
        }

        return sqlQuery;
    }
    exports.buildQueryGetVendorItemDetails = buildQueryGetVendorItemDetails;


    return exports;
}

