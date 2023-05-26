var FCClientLib;

define([
    '../Libraries/fc-client.library.module',
], main);

function main(fcClientLibModule) {
    FCClientLib = fcClientLibModule;

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
                BuildQuery: function () {
                    return this.Query;
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
                    VendorIds: 'AND ItemVendor.vendor IN (@@VENDOR_IDS@@)',
                },
                BuildQuery: function (vendorIds = null) {
                    const vendorIdStr = vendorIds ? vendorIds.map(id => `'${id}'`).join(',') : '';
                    const vendorFilterLine = this.Filters.VendorIds.replace('@@VENDOR_IDS@@', vendorIdStr);
                    return this.Query.replace('@@VENDOR_ID_FILTER1@@', vendorFilterLine);
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
            RESULTS: {
                GetId: function () { return FCLib.getEnvSpecificFileId(this.Sandbox, this.Prod); },
                Sandbox: 8141,
                Prod: 8141,
            },
        },
    };
    exports.Ids = Ids;


    var Ui = {
        Step1: {
            Parameters: {
                SELECT_VENDOR_CHECKBOX_ID: {
                    prefix: 'custpage_selectvendor_cb_',
                    looksLike: (val) => { return val.startsWith(FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_selectvendor_'); },
                    build: (vendorId) => { return FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_selectvendor_' + vendorId; },
                    parse: (param) => { return param.split('_')[2]},
                },
            },
            Sublists: {
                SELECT_VENDORS_TO_ZERO: {
                    Id: 'custpage_select_vendors_to_zero_sublist',
                    Label: 'Select Vendors to Zero',
                    Fields: {
                        CB_Select: {
                            Label: 'Select',
                            GetTableElem: function (thisRow) {
                                const queryFields = exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1;
                                const vendorId = thisRow[queryFields.VendorInternalId.fieldid];
                                const name = exports.Ui.Step1.Parameters.SELECT_VENDOR_CHECKBOX_ID.build(vendorId);
                                const id = name;
                                const value = vendorId;
                                const style = FCLib.Ui.CheckboxStyles.Style1;
                                const defaultState = '';

                                return `<input type="checkbox" name="${name}" id="${id}" value="${value}" style="${style}" ${defaultState}>`;
                            },
                        },
                        VendorInternalId: {
                            Label: 'Vendor Internal ID',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.VendorInternalId.fieldid] || '';
                            },
                        },
                        VendorName: {
                            Label: 'Vendor Name',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.VendorName.fieldid] || '';
                            },
                        },
                        VendorHasJitItemsRemaining: {
                            Label: 'Has JIT Items with Availability?',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.HasItemsJitRemaining.fieldid] || '';
                            }
                        },
                        VendorItemCountJitRemaining: {
                            Label: 'Count JIT Items with Availability',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_JIT_SUMMARY.FieldSet1.CountItemsWithJitRemaining.fieldid] || '';
                            }
                        },
                    },
                },
            },
        },
        Step2: {
            Parameters: {
                SELECT_ITEM_CHECKBOX_ID: {
                    prefix: 'custpage_selectitem_cb_',
                    looksLike: (val) => { return val.startsWith(FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_selectitem_'); },
                    build: (itemId) => { return FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_selectitem_' + itemId; },
                    parse: (val) => { return val.split('_')[2]; },
                },
            },
            Sublists: {
                SELECT_ITEMS_TO_ZERO: {
                    Id: 'custpage_select_items_to_zero_sublist',
                    Label: 'Select Items to Zero',
                    Fields: {
                        CB_Select: {
                            Label: 'Select',
                            GetTableElem: function (thisRow) {
                                const queryFields = exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1;
                                const itemInternalId = thisRow[queryFields.ItemId.fieldid];
                                const name = exports.Ui.Step2.Parameters.SELECT_ITEM_CHECKBOX_ID.build(itemInternalId);
                                const id = name;
                                const value = itemInternalId;
                                const style = FCLib.Ui.CheckboxStyles.Style1;
                                const defaultState = 'checked';

                                return `<input type="checkbox" name="${name}" id="${id}" value="${value}" style="${style}" ${defaultState}>`;
                            },
                        },
                        VendorName: {
                            Label: 'Vendor Name',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.VendorName.fieldid] || '';
                            },
                        },
                        ItemInternalId: {
                            Label: 'Item Internal ID',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.ItemId.fieldid] || '';
                            },
                        },
                        ItemName: {
                            Label: 'Item Name',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.ItemName.fieldid] || '';
                            },
                        },
                        ItemDisplayName: {
                            Label: 'Item Display Name',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.ItemDisplayName.fieldid] || '';
                            },
                        },
                        RemainJitQty: {
                            Label: 'Remaining JIT Qty',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.RemainJitQty.fieldid] || '';
                            },
                        },
                        StartJitQty: {
                            Label: 'Starting JIT Qty',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_VENDOR_ITEM_DETAILS.FieldSet1.StartJitQty.fieldid] || '';
                            },
                        },
                    },
                },
            },
        },
    };
    exports.Ui = Ui;


    var Settings = {
        SESSION_RESULTS_FOLDER_NAME_PREFIX: 'Zero_JIT_Availability_',
        ZERO_AVAILABILITY_CSV_FILENAME_PREFIX: 'Zero_JIT_Availability_Items_',
    };
    exports.Settings = Settings;



    return exports;
}

