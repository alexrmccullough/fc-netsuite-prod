var query,
    task,
    runtime,
    email,
    ui,
    FCLib;

define(['N/query', 
    'N/task', 
    'N/runtime', 
    'N/email', 
    'N/ui/serverWidget', 
    '../Libraries/fc-main.library.module'
], main);

function main(queryModule, taskModule, runtimeModule, emailModule, uiModule, fcLibModule) {
    query = queryModule;
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
            GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO: {
                Query: `
                        WITH LotQtyBySO AS (
                            SELECT
                                TransactionLine.transaction AS transactionid,
                                SUM(ABS(InventoryAssignment.quantity)) AS totallottedquantity
                            FROM
                                TransactionLine
                            LEFT OUTER JOIN InventoryAssignment ON (
                                TransactionLine.id = InventoryAssignment.transactionLine
                                AND TransactionLine.transaction = inventoryAssignment.Transaction	
                            )
                            WHERE
                                TransactionLine.isclosed = 'F'
                            GROUP BY
                                TransactionLine.transaction
                        )
                        
                        SELECT
                            Transaction.id AS traninternalid,
                            Transaction.tranid AS tranid,
                            Transaction.shipdate AS shipdate,
                            Transaction.entity AS customerinternalid,
                            BUILTIN.DF(Transaction.entity) AS customername,
                            SUM(ABS(TransactionLine.quantity)) AS totalquantity,
                            LotQtyBySO.totallottedquantity,
                            (SUM(ABS(TransactionLine.quantity)) - COALESCE(LotQtyBySO.totallottedquantity, 0)) AS qtyremainingtobelotted
                        
                        FROM
                            Transaction
                        
                        INNER JOIN TransactionLine ON Transaction.id = TransactionLine.transaction
                        INNER JOIN Item ON TransactionLine.item = Item.id
                        INNER JOIN LotQtyBySO ON LotQtyBySO.transactionid = Transaction.id
                        
                        WHERE
                            Transaction.type = 'SalesOrd'
                            AND BUILTIN.CF(Transaction.status) IN ('SalesOrd:B', 'SalesOrd:D', 'SalesOrd:E')
                            AND TransactionLine.itemType = 'InvtPart'
                            AND Item.isLotItem = 'T'
                        
                        GROUP BY
                            Transaction.id,
                            Transaction.tranid,
                            Transaction.shipdate,
                            Transaction.entity,
                            BUILTIN.DF(Transaction.entity),
                            LotQtyBySO.totallottedquantity

                        ORDER BY
                            Transaction.shipdate,
                            Transaction.entity
                    `,
                BuildQuery: function (folderId) {
                    return this.Query;
                },
                FieldSet1: {
                    TranInternalId: {
                        fieldid: 'traninternalid',
                        label: 'Transaction Internal ID',
                    },
                    TranId: {
                        fieldid: 'tranid',
                        label: 'Transaction ID',
                    },
                    ShipDate: {
                        fieldid: 'shipdate',
                        label: 'Ship Date',
                    },
                    CustomerInternalId: {
                        fieldid: 'customerinternalid',
                        label: 'Customer Internal ID',
                    },
                    CustomerName: {
                        fieldid: 'customername',
                        label: 'Customer Name',
                    },
                    TotalQuantity: {
                        fieldid: 'totalquantity',
                        label: 'Total Quantity',
                    },
                    TotalLottedQuantity: {
                        fieldid: 'totallottedquantity',
                        label: 'Total Lotted Quantity',
                    },
                    QtyRemainingToBeLotted: {
                        fieldid: 'qtyremainingtobelotted',
                        label: 'Qty Remaining to be Lotted',
                    },
                },
            },
            MR_GET_SOS_TO_UPDATE_DETAILS: {
                Query: `
                    SELECT
                        Transaction.id AS traninternalid,
                        Transaction.tranid AS tranid,
                        BUILTIN.DF(Transaction.entity) AS customername,
                        Transaction.shipdate AS shipdate
                    FROM 
                        Transaction
                    WHERE
                        Transaction.id IN ({{SO_IDS}})                  
                
                    `,
                BuildQuery: function (soIdList) {
                    let soIdStr = soIdList.join(',');
                    return this.Query.replace('{{SO_IDS}}', soIdStr);
                },
                FieldSet1: {
                    TranInternalId: {
                        fieldid: 'traninternalid',
                        label: 'SO Internal ID',
                    },
                    TranId: {
                        fieldid: 'tranid',
                        label: 'SO ID',
                    },
                    CustomerName: {
                        fieldid: 'customername',
                        label: 'Customer Name',
                    },
                    ShipDate: {
                        fieldid: 'shipdate',
                        label: 'Ship Date',
                    },
                },
            },
        },
    };


    var MRSettings = {
        SCRIPT_ID: 'customscript_fc_am_mr_autoapplysolotnums',
        DEPLOYMENT_ID: 'customdeploy_fc_am_mr_autoapplysolotnums',

        Parameters: {
            SELECTED_SO_JSON_FILE_ID: 'custscript_fc_am_selected_so_json',
        },

        SELECTED_SO_JSON_FILE: {
            BuildName: () => {
                return FCLib.generateTimestampedFilename(
                    'selected_so_json',
                    'json'
                );
            },
            OutFolderId: () => {
                return FCLib.Ids.Folders.MAIN_TEMP_CACHE_FOLDER.GetId();
            }

        },

        Email: {
            SUMMARIZE_EMAIL: {
                EmailSubject: {
                    Template: `Assign SO Lot Numbers Summary - {{TIMESTAMP}}`,
                },

                EmailBody: {
                    Template: `
                        <p>Lot numbers have been assigned by: {{USER}}</p>. 
                        <br>
                        <h3>Succesfully updated items</h3>
                        {{SUCCESSFUL_CHANGES}}
                        <br>
                        <h3>Failed items</h3>
                        {{FAILED_CHANGES}}
                    `,
                },
                BuildSubject: function (testVar = '') {
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
                    let body = this.EmailBody.Template;
                    body = body.replace('{{USER}}', user);
                    body = body.replace('{{SUCCESSFUL_CHANGES}}', successfulChanges);
                    body = body.replace('{{FAILED_CHANGES}}', failedChanges);
                    return body;
                },

                RecipientsEmails: [],
                CcEmails: [],
                // RecipientsEmails: ['warehouse@foodconnects.org'],
                BccEmails: [],

                SUCCESS_TABLE: {
                    Id: 'custpage_success_table',
                    Label: 'Successful SO Lot Number Updates',
                    Fields: {
                        TranInternalId: {
                            Label: 'SO Internal ID',
                            GetTableElem: (thisRow) => { return thisRow[exports.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.FieldSet1.TranInternalId]; },
                        },
                        TranId: {
                            Label: 'SO ID',
                            GetTableElem: (thisRow) => { return thisRow[exports.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.FieldSet1.TranId]; },
                        },
                        CustomerName: {
                            Label: 'Customer Name',
                            GetTableElem: (thisRow) => { return thisRow[exports.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.FieldSet1.CustomerName]; },
                        },
                        ShipDate: {
                            Label: 'Ship Date',
                            GetTableElem: (thisRow) => { return thisRow[exports.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.FieldSet1.ShipDate]; },
                        },
                    },
                },

                FAILURE_TABLE: {
                    Id: 'custpage_failure_table',
                    Label: 'Failed SO Lot Number Updates',
                    Fields: {
                        TranInternalId: {
                            Label: 'SO Internal ID',
                            GetTableElem: (thisRow) => { return thisRow[exports.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.FieldSet1.TranInternalId]; },
                        },
                        TranId: {
                            Label: 'SO ID',
                            GetTableElem: (thisRow) => { return thisRow[exports.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.FieldSet1.TranId]; },
                        },
                        CustomerName: {
                            Label: 'Customer Name',
                            GetTableElem: (thisRow) => { return thisRow[exports.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.FieldSet1.CustomerName]; },
                        },
                        ShipDate: {
                            Label: 'Ship Date',
                            GetTableElem: (thisRow) => { return thisRow[exports.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.FieldSet1.ShipDate]; },
                        },
                        ErrorMessage: {
                            Label: 'Error',
                            GetTableElem: (thisRow) => { return thisRow.errorMessage; },
                        },
                    },
                },
            },
        },
    };
    exports.MRSettings = MRSettings;



    var Settings = {
        Ui: {
            Step1: {
                Main: {
                    JIT_UPLOAD_UTILITY_FORM_TITLE: 'JIT Upload Utility',
                },
                Parameters: {
                    SELECT_SO_CHECKBOX_ID: {
                        prefix: 'custpage_selectso_cb_',
                        build: (fileId) => { return 'custpage_selectso_cb_' + fileId; },
                        looksLike: (val) => { return val.startsWith('custpage_selectso_cb_'); },
                    },
                },
                Fields: {
                    SO_TABLE_FIELD_ID: 'custpage_so_table',
                    SO_TABLE_FIELD_LABEL: 'Sales Orders with Unassigned Lots',
                },
                Sublists: {
                    SO_TABLE: {
                        Id: 'custpage_so_table_sublist',
                        Label: 'Sales Orders with Unassigned Lots',
                        Fields: {
                            Select: {
                                Label: 'Select',
                                DefaultValue: '',
                            },
                            TranInternalId: {
                                Label: 'Transaction Internal ID',
                                QuerySource: exports.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.FieldSet1.TranInternalId,
                            },
                            TranId: {
                                Label: 'Transaction ID',
                                QuerySource: exports.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.FieldSet1.TranId,
                            },
                            ShipDate: {
                                Label: 'Ship Date',
                                QuerySource: exports.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.FieldSet1.ShipDate,
                            },
                            CustomerInternalId: {
                                Label: 'Customer Internal ID',
                                QuerySource: exports.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.FieldSet1.CustomerInternalId,
                            },
                            CustomerName: {
                                Label: 'Customer Name',
                                QuerySource: exports.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.FieldSet1.CustomerName,
                            },
                            TotalQuantity: {
                                Label: 'Total Quantity',
                                QuerySource: exports.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.FieldSet1.TotalQuantity,
                            },
                            TotalLottedQuantity: {
                                Label: 'Total Lotted Quantity',
                                QuerySource: exports.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.FieldSet1.TotalLottedQuantity,
                            },
                            QtyRemainingToBeLotted: {
                                Label: 'Qty to be Lotted',
                                QuerySource: exports.Queries.GET_SOS_WITH_UNASSIGNED_LOTS_BY_SO.FieldSet1.QtyRemainingToBeLotted,
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
