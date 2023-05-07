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
        },
    };

    var Settings = {
        SESSION_RESULTS_FOLDER_NAME_PREFIX: '',

        Ui: {
            Main: {
            },
            Fields: {
            },
            FieldGroups: {
            },
            Parameters: {
                SELECT_VENDOR_CHECKBOX_ID: {
                    prefix: 'custpage_selectpo_cb_',
                    build: (poId) => { return 'custpage_selectpo_cb_' + poId; },
                    looksLike: (val) => { return val.startsWith('custpage_selectpo_cb_'); },
                },
            },
            FieldDataFormat: {
            },
            Sublists: {
                GET_VENDOR_JIT_SUMMARY: {
                    Id: 'custpage_sublist_vendor_jit_availability_summary',
                    Label: 'Vendor JIT Availability Summary',
                    Fields: {
                        Select: {
                            Type: ui.FieldType.CHECKBOX,
                            Label: 'Select',
                            Id: 'custpage_select_vendor_sublist_field_select',
                            DefaultValue: 'unchecked',
                            DisplayType: ui.FieldDisplayType.NORMAL,
                        },
                        VendorInternalId: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Vendor Internal ID',
                            Id: 'custpage_select_vendor_sublist_field_vendorinternalid',
                            QuerySource: exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.VendorInternalId,
                            DisplayType: ui.FieldDisplayType.DISABLED,
                        },
                        VendorName: {
                            Type: ui.FieldType.TEXT,
                            Label: 'PO Internal ID',
                            Id: 'custpage_select_vendor_sublist_field_vendorname',
                            QuerySource: exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.VendorName,
                            DisplayType: ui.FieldDisplayType.DISABLED,
                        },
                        VendorHasJitItemsRemaining: {
                            Type: ui.FieldType.TEXT,
                            Label: 'Has JIT Items with Availability?',
                            Id: 'custpage_select_vendor_sublist_field_vendorhasjititemsremaining',
                            QuerySource: exports.Queries.GET_BASIC_UNSENT_PO_INFO.FieldSet1.HasItemsJitRemaining,
                            DisplayType: ui.FieldDisplayType.DISABLED,
                        },
                    },
                },
            },
        },
    };



    exports.Settings = Settings;

    return exports;
}

