var record,
    dayjs,
    FCLib, 
    FCClientLib;


define(['N/record', 
    '../Libraries/dayjs.min', 
    '../Libraries/fc-main.library.module',
    '../Libraries/fc-client.library.module'
], main);

function main(recordModule, dayjsModule, fcLibModule, fcClientLibModule) {
    record = recordModule;
    dayjs = dayjsModule;
    FCLib = fcLibModule;
    FCClientLib = fcClientLibModule;

    var exports = {
        Queries: {
            GET_SIMPLE_FUTURE_JIT_SO_VENDOR_LIST: {
                Query: `
                SELECT 
                    ItemVendor.vendor as vendorid,
                    Vendor.entityId as vendorentityid,
                FROM TransactionLine
                    JOIN Item ON Item.id = TransactionLine.item
                    JOIN ItemVendor ON item.id = itemVendor.item
                    JOIN Transaction ON Transaction.id = TransactionLine.transaction
                    JOIN Vendor ON itemVendor.vendor = vendor.id
                WHERE (Transaction.type = 'SalesOrd')
                    AND (
                        BUILTIN.CF(Transaction.status) IN ('SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E')
                    )
                    AND (Item.custitem_soft_comit = 'T')
                    @@EXTRA_FILTERS@@

                GROUP BY 
                    ItemVendor.vendor,
                    Vendor.entityId
                `,
                Filters: {
                    soStartDate: `AND (Transaction.shipDate >= '@@SO_START_DATE@@')   `,
                    soEndDate: `AND (Transaction.shipDate <= '@@SO_END_DATE@@')   `,
                },
                BuildQuery: function (startDate = null, endDate = null) {
                    let dateFilters = '';
                    dateFilters += startDate ? this.Filters.soStartDate.replace('@@SO_START_DATE@@', startDate) : '';
                    dateFilters += endDate ? this.Filters.soEndDate.replace('@@SO_END_DATE@@', endDate) : '';

                    return this.Query.replace('@@EXTRA_FILTERS@@', dateFilters);
                },
                FieldSet1: {
                    vendorid: {
                        label: 'Vendor ID',
                        fieldid: 'vendorid',
                        // includeInCsv: true,
                    },
                    vendorentityid: {
                        label: 'Vendor Name',
                        fieldid: 'vendorentityid',
                        // includeInCsv: true,
                    },
                }
            },
            GET_FUTURE_SOS_FOR_JIT_ITEMS: {
                // FIX: Need to group by vendor and item
                Query: `
                    SELECT Abs(SUM(TransactionLine.quantitybackordered)) as totalbackordered,
                        Abs(SUM(TransactionLine.quantity)) as totalqty,
                        Item.id as iteminternalid,
                        Item.itemId as itemid,
                        Item.displayname as itemdisplayname,
                        ItemVendor.vendor as vendorid,
                        Vendor.entityId as vendorentityid,
                        Vendor.companyname as vendorname
                    FROM TransactionLine
                        JOIN Item ON Item.id = TransactionLine.item
                        JOIN ItemVendor ON item.id = itemVendor.item
                        JOIN Transaction ON Transaction.id = TransactionLine.transaction
                        JOIN Vendor ON itemVendor.vendor = vendor.id
                    WHERE (Transaction.type = 'SalesOrd')
                        AND (
                            BUILTIN.CF(Transaction.status) IN ('SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E')
                        )
                        AND (Item.custitem_soft_comit = 'T')
                        @@VENDOR_ID_FILTER@@
                        @@DATE_FILTERS@@

                    GROUP BY Item.id,
                        Item.itemId,
                        Item.displayname,
                        ItemVendor.vendor,
                        Vendor.entityId,
                        Vendor.companyname
                `,
                Filters: {
                    soStartDate: `AND (Transaction.shipDate >= '@@SO_START_DATE@@')\n   `,
                    soEndDate: `AND (Transaction.shipDate <= '@@SO_END_DATE@@')\n   `,
                    vendorIds: `AND (ItemVendor.vendor IN (@@VENDOR_IDS@@))\n   `,
                },
                BuildQuery: function (startDate = null, endDate = null, vendorIds = null) {
                    let dateFilters = '';
                    dateFilters += startDate ? this.Filters.soStartDate.replace('@@SO_START_DATE@@', startDate) : '';
                    dateFilters += endDate ? this.Filters.soEndDate.replace('@@SO_END_DATE@@', endDate) : '';

                    const vendorIdStr = vendorIds ? vendorIds.map(id => `'${id}'`).join(',') : '';
                    let vendorIdFilter = vendorIds ? this.Filters.vendorIds.replace('@@VENDOR_IDS@@', vendorIdStr) : '';

                    return this.Query.replace('@@DATE_FILTERS@@', dateFilters).replace('@@VENDOR_ID_FILTER@@', vendorIdFilter);
                },
                FieldSet1: {
                    totalbackordered: {
                        label: 'Total Backordered',
                        fieldid: 'totalbackordered',
                        // includeInCsv: false,
                    },
                    totalqty: {
                        label: 'Total Demand',
                        fieldid: 'totalqty',
                        // includeInCsv: false,
                    },
                    iteminternalid: {
                        label: 'Item Internal ID',
                        fieldid: 'iteminternalid',
                        // includeInCsv: true,
                    },
                    itemid: {
                        label: 'Item ID',
                        fieldid: 'itemid',
                        // includeInCsv: true,
                    },
                    itemdisplayname: {
                        label: 'Item Name',
                        fieldid: 'itemdisplayname',
                        // includeInCsv: true,
                    },
                    vendorid: {
                        label: 'Vendor ID',
                        fieldid: 'vendorid',
                        // includeInCsv: true,
                    },
                    vendorentityid: {
                        label: 'Vendor Name',
                        fieldid: 'vendorentityid',
                        // includeInCsv: true,
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
                },
                BuildQuery: function (lotPrefix) {
                    return this.Query.replace('@@LOT_PREFIX@@', lotPrefix);
                },
            },
            GET_SUMMARIZED_ITEM_INFO_FROM_PO: {            /// Used in the Email JIT PO from PO Form script
                BuildQueryFunction: buildQueryGetItemInfoFromPO,
                Query: `
                    SELECT TransactionLine.uniquekey AS tranlineuniquekey,
                        Item.id AS itemid,
                        ABS(SUM(TransactionLine.quantity)) AS itemquantity
                    FROM TransactionLine
                        JOIN Transaction ON Transaction.id = TransactionLine.transaction
                        LEFT OUTER JOIN Item ON Item.id = TransactionLine.item
                    WHERE TransactionLine.mainline = 'F'
                        @@PO_ID_FILTER_1@@
                    GROUP BY TransactionLine.uniquekey,
                        Item.id            
                `,
                BuildQuery: function (poId) {
                    let filterLine = `AND (Transaction.id = ${poId})`;
                    return this.Query.replace('@@PO_ID_FILTER_1@@', filterLine);
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
            EMAIL_JIT_POS: 'customdeploy_fc_am_jit_mr_sendjitpos',
            JIT_CREATE_POS_HELPER_MAPREDUCE: 'customdeploy_fc_am_jit_mr_createpos',
        },
        Folders: {
            RESULTS: {
                GetId: function () { return FCLib.getEnvSpecificFolderId(this.Sandbox, this.Prod); },
                Sandbox: 8543, 
                Prod: 9116,
            },
        },
        Parameters: {
            JIT_PO_IMPORT_CSV_FILEID: 'custscript_fc_am_jitpo_import_csv_fileid',
            PO_CSV_HEADER_TO_NS_REVERSE_LOOKUP_JSON: 'custscript_fc_am_csvtons_reverselookup',
        },
    };
    exports.Ids = Ids;

    var Settings = {
        IO: {
            SESSION_RESULTS_FOLDER_NAME_PREFIX: 'JIT_PO_Results_',
            JIT_PO_ACCEPTEDPOS_TEMPJSON_FILENAME_PREFIX: 'TEMP_JIT_PO_AcceptedPOs_',
            JIT_PO_REJECTEDPOS_TEMPJSON_FILENAME_PREFIX: 'TEMP_JIT_PO_RejectedPOs_',
            JIT_PO_ACCEPTEDPOS_CSV_FILENAME_PREFIX: 'JIT_PO_AcceptedPOs_',
            JIT_PO_REJECTEDPOS_CSV_FILENAME_PREFIX: 'JIT_PO_RejectedPOs_',
        },
        PurchaseOrder: {
            DEFAULT_PO_DUE_DATE_DAYS_FROM_TODAY: 1,
            VALID_PO_SUFFIXES:
                ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
                    'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av', 'aw', 'ax', 'ay', 'az',
                    'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bk', 'bl', 'bm', 'bn', 'bo', 'bp', 'bq', 'br', 'bs', 'bt', 'bu', 'bv', 'bw', 'bx', 'by', 'bz',
                    'ca', 'cb', 'cc', 'cd', 'ce', 'cf', 'cg', 'ch', 'ci', 'cj', 'ck', 'cl', 'cm', 'cn', 'co', 'cp', 'cq', 'cr', 'cs', 'ct', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
                    'da', 'db', 'dc', 'dd', 'de', 'df', 'dg', 'dh', 'di', 'dj', 'dk', 'dl', 'dm', 'dn', 'do', 'dp', 'dq', 'dr', 'ds', 'dt', 'du', 'dv', 'dw', 'dx', 'dy', 'dz',
                ],
            GENERATE_LOT_NUMBER: (delivdatestr) => { return `JIT${delivdatestr}`; },
        },
        PoImportCsv: {
            NewOutputFields: {
                finalQty: 'Final Item Qty',
                lotNumber: 'Receipt Lot Number',
                lotQuantity: 'Receipt Lot Quantity',
                memo: 'PO Memo',
                poExternalId: 'PO External ID',
                poSequenceNumber: 'PO Sequence Counter',
                receiveByDate: 'Receive By Date',
                // emailOnceCreated: 'Email Once Created',
            },
        },
    };
    exports.Settings = Settings;


    var Ui = {
        General: {
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
        },
        Step1: {
            Parameters: {
                CAPTURE_PO_DELIVERY_DUE_DATE_ID: 'custpage_capture_po_delivery_due_date',
                CAPTURE_SOS_START_DATE_ID: 'custpage_capture_sos_start_date',
                CAPTURE_SOS_END_DATE_ID: 'custpage_capture_sos_end_date',
            },
            Fields: {
                CAPTURE_PO_DELIVERY_DUE_DATE_LABEL: 'PO Delivery Due Date',

                CAPTURE_SOS_START_DATE_LABEL: 'From SO Delivery Date',
                CAPTURE_SOS_END_DATE_LABEL: 'To SO Delivery Date',
            },
        },
        Step2: {
            Sublists: {
                INITIAL_VENDOR_SELECT_TABLE: {
                    Id: 'custpage_initial_vendor_select_table',
                    Label: 'Select Vendor(s) to Process',
                    Fields: {
                        CB_Select: {
                            Label: 'Select',
                            GetTableElem: function (thisRow) {
                                const queryFields = exports.Queries.GET_SIMPLE_FUTURE_JIT_SO_VENDOR_LIST.FieldSet1;
                                const vendorId = thisRow[queryFields.vendorid.fieldid];
                                const name = exports.Ui.Step2.Parameters.VENDOR_SELECT_CHECKBOX.build(vendorId);
                                const id = name;
                                const value = vendorId;
                                const style = FCLib.Ui.CheckboxStyles.Style1;
                                const defaultState = '';
                                return `<input type="checkbox" name="${name}" id="${id}" value="${value}" style="${style}" ${defaultState}>`;
                            },
                        },
                        VendorName: {
                            Label: 'Vendor Name',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_SIMPLE_FUTURE_JIT_SO_VENDOR_LIST.FieldSet1.vendorentityid.fieldid];
                            },
                        },
                    },
                },
            },
        },
        Step3: {
            Main: {
            },
            Fields: {
            },
            FieldGroups: {
            },
            Sublists: {
                VENDOR_FUTURE_SO_TABLE: {
                    Id: 'custpage_vendor_future_so_table',
                    Label: 'Vendor Future SO Table',
                    Fields: {
                        QtyInput: {
                            Label: 'Final PO Qty',
                            GetTableElem: function (thisRow) {
                                const queryFields = exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1;
                                const value = thisRow[queryFields.totalbackordered.fieldid];
                                const vendorId = thisRow[queryFields.vendorid.fieldid];
                                const itemId = thisRow[queryFields.itemid.fieldid];

                                const name = exports.Ui.Step3.Parameters.FINAL_PO_QTY_INPUT.build(vendorId, itemId);
                                const id = name;
                                const style = '';

                                return `<input type="number" name="${name}" id="${id}" value="${value}" style="${style}">`;
                            },
                        },
                        TotalBackordered: {
                            Label: 'Total Backordered',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.totalbackordered.fieldid];
                            },
                        },
                        TotalDemand: {
                            Label: 'Total Demand',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.totalqty.fieldid];
                            },
                        },
                        ItemName: {
                            Label: 'Item Name',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.itemid.fieldid];
                            },

                        },
                        ItemDisplayName: {
                            Label: 'Item Display Name',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.itemdisplayname.fieldid];
                            },
                        },
                        VendorId: {
                            Label: 'Vendor ID',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.vendorid.fieldid];
                            },
                        },
                        VendorDisplayName: {
                            Label: 'Vendor Name',
                            GetTableElem: function (thisRow) {
                                return thisRow[exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.vendorentityid.fieldid];
                            }

                        },
                    },
                },
            },
        },

        Step4: {
            Fields: {
                FINALREVIEW_POS_ACCEPTED_FIELD_ID: 'custpage_finalreview_pos_accepted',
                FINALREVIEW_POS_ACCEPTED_FIELD_LABEL: 'POs to Accept',
                FINALREVIEW_POS_REJECTED_FIELD_ID: 'custpage_finalreview_pos_rejected',
                FINALREVIEW_POS_REJECTED_FIELD_LABEL: 'POs to Reject',
            },
            FieldGroups: {
                FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_ID: 'custpage_finalreview_pos_accepted_group',
                FINALREVIEW_POS_ACCEPTED_FIELD_GROUP_LABEL: 'POs to Accept',
                FINALREVIEW_POS_REJECTED_FIELD_GROUP_ID: 'custpage_finalreview_pos_rejected_group',
                FINALREVIEW_POS_REJECTED_FIELD_GROUP_LABEL: 'POs to Reject',
            },

            // Sublists: {
            //     POS_TO_ACCEPT_TABLE: {
            //         Id: 'custpage_pos_to_accept_table',
            //         Label: 'POs to Accept',
            //         Fields: {
            //             FinalItemQty: {
            //                 Label: 'Final Item Qty',
            //                 GetTableElem: function (thisRow) {

            //                 },
            //             },
            //             ReceiptLotNum: {
            //                 Label: 'Receipt Lot #',
            //                 GetTableElem: function (thisRow) {
            //                 },
            //             },
            //             ReceiptLotQty: {
            //                 Label: 'Receipt Lot Qty',
            //                 GetTableElem: function (thisRow) {

            //                 },
            //             },
            //             PoMemo: {
            //                 Label: 'PO Memo',
            //                 GetTableElem: function (thisRow) {
            //                 },
            //             },
            //             POExternalId: {
            //                 Label: 'PO External ID',
            //                 GetTableElem: function (thisRow) {

            //                 },
            //             },
            //             PoSeqCounter: {
            //                 Label: 'PO Seq Counter',
            //                 GetTableElem: function (thisRow) {
            //                 },
            //             },
            //             PoDueDate: {
            //                 Label: 'PO Receive By Date',
            //                 GetTableElem: function (thisRow) {
            //                 }
            //             },
            //         },
            //     },
            // },
        },

    };

    Ui.Step2.Parameters = {
        VENDOR_SELECT_CHECKBOX: {
            // prefix: 'custpage_vendorselect_',
            looksLike: (val) => { return val.startsWith(FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_vendorselect_'); },
            build: (vendorId) => { return FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_vendorselect_' + vendorId; },
            parse: (val) => {
                return val.split('_').pop();
            },
        },
    };

    Ui.Step3.Parameters = {
        FINAL_PO_QTY_INPUT: {
            // prefix: 'custpage_finalpoqty_',
            looksLike: (val) => { return val.startsWith(FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_finalpoqty_'); },
            build: (vendorId, itemId) => { return FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_finalpoqty_' + `${vendorId}_${itemId}`; },
            parse: (val) => {
                let split = val.split('_');
                return { vendorId: split[2], itemId: split[3] };
            },
        },
        CREATE_PO_CHECKBOX: {
            // prefix: 'custpage_create_po_',
            looksLike: (val) => { return val.startsWith(FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_createpo_' ); },
            build: (vendorid) => { return FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_createpo_' + vendorid; },
            parse: (param) => { return param.split('_').pop(); },
                
        },
        PO_MEMO_FIELD: {
            // prefix: 'custpage_po_memo_',
            looksLike: (val) => { return val.startsWith(FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_pomemo_'); },
            build: (vendorid) => { return FCClientLib.Ui.FC_CHECKBOX_PREFIX + '_pomemo_' + vendorid; },
            parse: (param) => { return param.split('_').pop(); },
        },
    };

    Ui.Step4.Parameters = {
        JIT_PO_ACCEPTEDPOS_TEMPJSON_FILE_ID: 'custpage_jit_po_acceptedpos_tempjson_file',
        JIT_PO_REJECTEDPOS_TEMPJSON_FILE_ID: 'custpage_jit_po_rejectedpos_tempjson_file',
    };
    
    exports.Ui = Ui;


    var MRSettings = {
        CsvToNsFieldMap: {
            [Settings.PoImportCsv.NewOutputFields.finalQty]: {
                typeFunc: (value) => { return parseFloat(value) },
                record: 'item',
                nsFieldId: 'quantity',
            },

            [Settings.PoImportCsv.NewOutputFields.lotNumber]: {
                typeFunc: (value) => { return value.toString() },
                record: 'inventorydetail',
                nsFieldId: 'receiptinventorynumber',
            },
            [Settings.PoImportCsv.NewOutputFields.lotQuantity]: {
                typeFunc: (value) => { return parseFloat(value) },
                record: 'inventorydetail',
                nsFieldId: 'quantity',
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
            },
            [Settings.PoImportCsv.NewOutputFields.receiveByDate]: {
                typeFunc: (value) => { return new Date(value) },
                record: 'transaction',
                nsFieldId: 'duedate',
                formatFunc: (date) => { return dayjs(date).format('M/D/YYYY') },
            },

            [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.iteminternalid.display]: {
                typeFunc: (value) => { return value.toString() },
                record: 'item',
                nsFieldId: 'item',
            },
            // [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.itemid.display]: ,
            // [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.itemdisplayname.display]: ,
            [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.vendorid.display]: {
                typeFunc: (value) => { return value.toString() },
                record: 'transaction',
                nsFieldId: 'entity',
            },
            // [exports.Queries.GET_FUTURE_SOS_FOR_JIT_ITEMS.FieldSet1.vendorentityid.display]: ,

        },

        // CsvSpecialFields: {
        //     [Settings.PoImportCsv.NewOutputFields.emailOnceCreated]: {
        //         test: 'testvalue',
        //         // valueFunc converts upper/lower case true/false/yes/no to boolean
        //         // valueFunc: (value) => { return FCLib.looksLikeYes(value); },
        //     },
        // },

        Emails: {
            PoCreationSummary: {
                Sender: '-5',
                Subject: 'Generate JIT POs -- Process Summary',
                // Recipients: ['procurement@foodconnects.org'],
                Recipients: ['alex@foodconnects.org'],
                Cc: [],
                Bcc: [],
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
                        Please use the <a href="">Bulk JIT PO Email Assistant</a> to email the POs with shipping labels. 
                    `,
                    PlaceholderFuncs: {
                        posSucceededCount: (bodytext, value) => bodytext.replace('{{posSucceededCount}}', value),
                        posFailedCount: (bodytext, value) => bodytext.replace('{{posFailedCount}}', value),
                        successfulPoList: (bodytext, value) => bodytext.replace('{{successfulPoList}}', value),
                        failedPoList: (bodytext, value) => bodytext.replace('{{failedPoList}}', value),
                    },
                }
            }
        }
    };

    MRSettings.Emails.PoCreationSummary.Body.ReplaceAllPlaceholders = function
        (posSucceededCount, posFailedCount, successfulPoList, failedPoList) {
        let bodytext = MRSettings.Emails.PoCreationSummary.Body.Template;
        bodytext = MRSettings.Emails.PoCreationSummary.Body.PlaceholderFuncs.posSucceededCount(bodytext, posSucceededCount);
        bodytext = MRSettings.Emails.PoCreationSummary.Body.PlaceholderFuncs.posFailedCount(bodytext, posFailedCount);
        bodytext = MRSettings.Emails.PoCreationSummary.Body.PlaceholderFuncs.successfulPoList(bodytext, successfulPoList);
        bodytext = MRSettings.Emails.PoCreationSummary.Body.PlaceholderFuncs.failedPoList(bodytext, failedPoList);
        return bodytext;
    };

    exports.MRSettings = MRSettings;


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
    exports.buildQueryGetItemInfoFromPO = buildQueryGetItemInfoFromPO;




    function buildPoRecord(csvRows) {
        // var csvRows = csvRowsRaw.map(JSON.parse);
        const dynamic = true;

        log.debug({ title: 'csvrows: ', details: csvRows });
        let firstRow = csvRows[0];

        log.debug({ title: 'firstRow: ', details: firstRow });
        var poRecord = record.create({
            type: record.Type.PURCHASE_ORDER,
            isDynamic: dynamic
        });



        log.debug({ title: 'poRecord', details: poRecord });

        let keysInCsvDebug = Object.keys(csvRows[0]);
        log.debug({ title: 'keysInCsvDebug', details: keysInCsvDebug });

        // Set the PO mainline fields
        // FIX;
        var csvToNsFieldMapKeys = Object.keys(MRSettings.CsvToNsFieldMap);
        var poMainlineHeaders = csvToNsFieldMapKeys.filter(
            (header) => { return MRSettings.CsvToNsFieldMap[header].record === 'transaction' }
        );

        log.debug({ title: 'poMainlineHeaders', details: poMainlineHeaders })

        for (let header of poMainlineHeaders) {
            let nsFieldId = MRSettings.CsvToNsFieldMap[header].nsFieldId;
            let typeFunc = MRSettings.CsvToNsFieldMap[header].typeFunc;
            let nsValue = typeFunc(csvRows[0][header]);

            poRecord.setValue({
                fieldId: nsFieldId,
                value: nsValue
            });
        }

        log.debug({ title: 'poRecord', details: poRecord });


        // Set the PO item + inventory detail fields
        let poItemHeaders = csvToNsFieldMapKeys.filter(
            (header) => { return MRSettings.CsvToNsFieldMap[header].record === 'item' }
        );

        log.debug({ title: 'poItemHeaders', details: poItemHeaders });

        // FIX: Need to make sure we have an inventorydetail quantity field
        let invDetailHeaders = csvToNsFieldMapKeys.filter(
            (header) => { return MRSettings.CsvToNsFieldMap[header].record === 'inventorydetail' }
        );

        log.debug({ title: 'invDetailHeaders', details: invDetailHeaders });

        for (let i = 0; i < csvRows.length; i++) {
            let row = csvRows[i];

            // Insert a line in the item sublist.
            if (dynamic) {
                log.debug({ title: 'about to insert new item line', details: 'i: ' + i });
                poRecord.selectNewLine({
                    sublistId: 'item'
                });
            }
            else {
                poRecord.insertLine({
                    sublistId: 'item',
                    line: i
                });
            }

            // Set the required item-level fields for the line
            for (let header of poItemHeaders) {
                let nsFieldId = MRSettings.CsvToNsFieldMap[header].nsFieldId;
                let typeFunc = MRSettings.CsvToNsFieldMap[header].typeFunc;
                let nsValue = typeFunc(row[header]);

                if (dynamic) {
                    log.debug({ title: 'setting current sublist value', details: 'i: ' + i });
                    poRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: nsFieldId,
                        value: nsValue
                    });
                }

                else {
                    poRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: nsFieldId,
                        line: i,
                        value: nsValue
                    });
                }
            }

            if (invDetailHeaders && invDetailHeaders.length > 0) {

                if (dynamic) {
                    log.debug({ title: 'getting current sublist subrecord', details: 'i: ' + i });
                    invDetailSubrec = poRecord.getCurrentSublistSubrecord({
                        sublistId: 'item',
                        fieldId: 'inventorydetail'
                    });
                }
                else {
                    let invDetailSubrec = poRecord.getSublistSubrecord({
                        sublistId: 'item',
                        line: i,
                        fieldId: 'inventorydetail'
                    });
                }

                // Insert a line in the subrecord's inventory assignment sublist.
                if (dynamic) {
                    log.debug({ title: 'about to insert new inv detail line', details: 'i: ' + i });
                    invDetailSubrec.selectNewLine({
                        sublistId: 'inventoryassignment'
                    });
                }
                else {
                    invDetailSubrec.insertLine({
                        sublistId: 'inventoryassignment',
                        line: 0
                    });
                }


                // Set the required inventory detail-level fields for the line
                for (let header of invDetailHeaders) {
                    let nsFieldId = MRSettings.CsvToNsFieldMap[header].nsFieldId;
                    let typeFunc = MRSettings.CsvToNsFieldMap[header].typeFunc;
                    let nsValue = typeFunc(row[header]);

                    if (dynamic) {
                        log.debug({ title: 'setting current inv assignment sublist value', details: 'i: ' + i });
                        invDetailSubrec.setCurrentSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: nsFieldId,
                            value: nsValue
                        });
                    }
                    else {
                        invDetailSubrec.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: nsFieldId,
                            line: i,
                            value: nsValue
                        });
                    }
                }

                // Commit the line to the inventory assignment sublist.

                if (dynamic) {
                    log.debug({ title: 'about to save invDetailSubrec lines', details: invDetailSubrec });

                    invDetailSubrec.commitLine({
                        sublistId: 'inventoryassignment'
                    });
                }
            }

            // Commit the line to the item sublist.
            if (dynamic) {
                log.debug({ title: 'about to save poRecord item line', details: poRecord });
                poRecord.commitLine({
                    sublistId: 'item'
                });
            }
        }

        log.debug({ title: 'returning new poRecord', details: poRecord });

        return poRecord;
    }
    exports.buildPoRecord = buildPoRecord;


    return exports;
}

