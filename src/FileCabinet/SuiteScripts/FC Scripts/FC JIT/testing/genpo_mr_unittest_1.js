
require(['N/record'], function (record) {


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
                // [Settings.PoImportCsv.NewOutputFields.poSequenceNumber]: {
                //     typeFunc: (value) => { return value.toString() },
                //     record: 'transaction',
                //     nsFieldId: 'tranid',
                // },
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
        },
    };


    var csvRowsInput = [{ "Receipt Lot Quantity": "2", "Final Item Qty": "2", "Receipt Lot Number": "JIT2023331a", "PO Memo": "", "PO External ID": "JITPO_126_2023331_9172", "PO Sequence Counter": "2", "Receive By Date": "3/31/2023", "Item Internal ID": "25", "Vendor ID": "126" }];
    csvRowsInput = csvRowsInput.map(JSON.stringify);

    var record = buildPoRecord(csvRowsInput);
    log.debug({ title: 'record', details: record });
    var recId = record.save();
    log.debug({ title: 'recId', details: recId });


    function buildPoRecord(csvRowsRaw) {
        var csvRows = csvRowsRaw.map(JSON.parse);

        log.debug({ title: 'csvrows: ', details: csvRows });
        let firstRow = csvRows[0];

        log.debug({ title: 'firstRow: ', details: firstRow });
        var poRecord = record.create({
            type: record.Type.PURCHASE_ORDER,
            isDynamic: false
        });

        log.debug({ title: 'poRecord', details: poRecord });

        let keysInCsvDebug = Object.keys(csvRows[0]);
        log.debug({ title: 'keysInCsvDebug', details: keysInCsvDebug });

        // Set the PO mainline fields
        // FIX;
        var csvToNsFieldMapKeys = Object.keys(FCJITGenPoLib.MRSettings.CsvToNsFieldMap);
        var poMainlineHeaders = csvToNsFieldMapKeys.filter(
            (header) => { return FCJITGenPoLib.MRSettings.CsvToNsFieldMap[header].record === 'transaction' }
        );

        log.debug({ title: 'poMainlineHeaders', details: poMainlineHeaders })

        for (let header of poMainlineHeaders) {
            let nsFieldId = FCJITGenPoLib.MRSettings.CsvToNsFieldMap[header].nsFieldId;
            let typeFunc = FCJITGenPoLib.MRSettings.CsvToNsFieldMap[header].typeFunc;
            let nsValue = typeFunc(csvRows[0][header]);

            poRecord.setValue({
                fieldId: nsFieldId,
                value: nsValue
            });
        }

        log.debug({ title: 'poRecord', details: poRecord });


        // Set the PO item + inventory detail fields
        let poItemHeaders = csvToNsFieldMapKeys.filter(
            (header) => { return FCJITGenPoLib.MRSettings.CsvToNsFieldMap[header].record === 'item' }
        );

        log.debug({ title: 'poItemHeaders', details: poItemHeaders });

        // FIX: Need to make sure we have an inventorydetail quantity field
        let invDetailHeaders = csvToNsFieldMapKeys.filter(
            (header) => { return FCJITGenPoLib.MRSettings.CsvToNsFieldMap[header].record === 'inventorydetail' }
        );

        log.debug({ title: 'invDetailHeaders', details: invDetailHeaders });

        for (let i = 0; i < csvRows.length; i++) {
            let row = csvRows[i];

            // Insert a line in the item sublist.
            poRecord.insertLine({
                sublistId: 'item',
                line: i
            });


            // Set the required item-level fields for the line
            for (let header of poItemHeaders) {
                let nsFieldId = FCJITGenPoLib.MRSettings.CsvToNsFieldMap[header].nsFieldId;
                let typeFunc = FCJITGenPoLib.MRSettings.CsvToNsFieldMap[header].typeFunc;
                let nsValue = typeFunc(row[header]);

                poRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: nsFieldId,
                    line: i,
                    value: nsValue
                });
            }

            let debugHeaders = ['Receipt Lot Quantity', 'Receipt Lot Number'];

            // if (invDetailHeaders && invDetailHeaders.length > 0) {
            if (invDetailHeaders && debugHeaders.length > 0) {

                let invDetailSubrec = poRecord.getSublistSubrecord({
                    sublistId: 'item',
                    line: i,
                    fieldId: 'inventorydetail'
                });

                // Insert a line in the subrecord's inventory assignment sublist.
                invDetailSubrec.insertLine({
                    sublistId: 'inventoryassignment',
                    line: 0
                });


                // Set the required inventory detail-level fields for the line
                // for (let header of invDetailHeaders) {
                for (let header of debugHeaders) {
                    let nsFieldId = FCJITGenPoLib.MRSettings.CsvToNsFieldMap[header].nsFieldId;
                    let typeFunc = FCJITGenPoLib.MRSettings.CsvToNsFieldMap[header].typeFunc;
                    let nsValue = typeFunc(row[header]);

                    invDetailSubrec.setSublistValue({
                        sublistId: 'inventoryassignment',
                        fieldId: nsFieldId,
                        line: i,
                        value: nsValue
                    });
                }
            }
        }

        return poRecord;
    }

});
