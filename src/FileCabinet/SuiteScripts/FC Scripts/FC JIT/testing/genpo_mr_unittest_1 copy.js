
require(['N/email'], function (email) {
    var exports = {
        Queries: {
            GET_FUTURE_SOS_FOR_JIT_ITEMS: {
                FieldSet1: {
                    totalbackordered: {
                        display: 'Total Backordered',
                        poGenField: 'totalbackordered',
                        includeInCsv: false,
                    },
                    totalqty: {
                        display: 'Total On-Order',
                        poGenField: null,
                        includeInCsv: false,
                    },
                    iteminternalid: {
                        display: 'Item Internal ID',
                        poGenField: null,
                        includeInCsv: true,
                    },
                    itemid: {
                        display: 'Item ID',
                        poGenField: null,
                        includeInCsv: true,
                    },
                    itemdisplayname: {
                        display: 'Item Name',
                        poGenField: null,
                        includeInCsv: true,
                    },
                    vendorid: {
                        display: 'Vendor ID',
                        poGenField: 'vendorid',
                        includeInCsv: true,
                    },
                    vendorentityid: {
                        display: 'Vendor Name',
                        poGenField: 'vendorentityid',
                        includeInCsv: true,
                    },
                },
            },
        },
    };


    var Settings = {
        PoImportCsv: {
            NewOutputFields: {
                finalQty: 'Final Item Qty',
                lotNumber: 'Receipt Lot Number',
                lotQuantity: 'Receipt Lot Quantity',
                memo: 'PO Memo',
                poExternalId: 'PO External ID',
                poSequenceNumber: 'PO Sequence Counter',
                receiveByDate: 'Receive By Date',
                // transactionDate: 'Transaction Date',
                // emailOnceCreated: 'Email Once Created',
            },

        },
    };

    var FCJITGenPoLib = {
        MRSettings: {
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
                    Sender: '1240',
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
        }
    };

    let emailBody = FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Body.Template;

    email.send({
        author: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Sender,
        recipients: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Recipients,
        cc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Cc,
        bcc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Bcc,
        body: emailBody,
        subject: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Subject,
    });

});