/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope SameAccount
* @copyright 2023 Food Connects
* @author Alex McCullough alex.mccullough@gmail.com
* @description 
*/

var modulePathGenerateJitPoUtilityLibrary = './fc-jit.generate-jit-po-assistant.library.module.js';
var modulePathJitBulkEmailLibrary = './fc-jit.bulk-email-jit-pos-labels.process-emails.library.module.js';

var
    runtime,
    email,
    query,
    record,
    task,
    file,
    FCLib,
    FCJITBulkEmailLib,
    FCJITGenPoLib,
    Papa;



define(['N/runtime', 'N/email', 'N/query', 'N/record', 'N/task', 'N/file', '../Libraries/FC_MainLibrary', modulePathJitBulkEmailLibrary, modulePathGenerateJitPoUtilityLibrary, '../Libraries/papaparse.min.js'], main);

function main(runtimeModule, emailModule, queryModule, recordModule, taskModule, fileModule, fcMainLibModule, fcBulkEmailLibModule, fcGenerateJITPoLibModule, papaParseModule) {

    runtime = runtimeModule;
    email = emailModule;
    query = queryModule;
    record = recordModule;
    task = taskModule;
    file = fileModule;
    FCLib = fcMainLibModule;
    FCJITBulkEmailLib = fcBulkEmailLibModule;
    FCJITGenPoLib = fcGenerateJITPoLibModule;
    Papa = papaParseModule;

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
}


function getInputData(context) {
    // log.debug({ title: 'getInputData', details: { posToEmailExternalIdsRaw: posToEmailExternalIdsRaw } });

    var currentScript = runtime.getCurrentScript();

    // Load the CSV file with the import data
    // Convert it to an array of objects with keys matching the NS fields to be referenced when creating the POs
    let jitPoImportCsvFileId = currentScript.getParameter({
        name: FCJITGenPoLib.Ids.Parameters.JIT_PO_IMPORT_CSV_FILEID
    });

    let curFile = file.load({ id: jitPoImportCsvFileId });
    // let curFileContents = curFile.getContents();

    let parsedFile = Papa.parse(
        curFile.getContents(),
        {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: 'greedy',
        }
    );

    let rawHeaders = parsedFile.meta.fields;
    let rows = parsedFile.data;

    return rows;
}


function map(context) {
    log.debug({ title: 'map - result', details: context });

    let row = JSON.parse(context.value);

    let poExternalId = row[FCJITGenPoLib.Settings.PoImportCsv.poExternalId];

    let targetKeys = [
        ...Object.keys(FCJITGenPoLib.MRSettings.CsvToNsFieldMap),
        ...Object.keys(FCJITGenPoLib.Settings.CsvSpecialFields)
    ];

    let filteredRow = FCLib.pickFromObj(row, targetKeys);

    // let sessionFolderId = row.sessionFolderId;

    try {
        context.write({
            key: poExternalId,
            value: filteredRow
        });

    } catch (e) {
        log.error({ title: 'map - error', details: { 'context': context, 'error': e } });
    }

}


function reduce(context) {
    log.audit({ title: 'reduce - context', details: context });

    let poExternalId = context.key;
    let poItemRows = JSON.parse(context.values);

    let poRecord = buildPoRecord(poItemRows);

    let sendEmailHeader = FCJITGenPoLib.Settings.PoImportCsv.NewOutputFields.emailOnceCreated;

    let sendEmailHeaderSetting = FCJITGenPoLib.Settings.CsvSpecialFields[
        sendEmailHeader
    ];

    let sendEmail = sendEmailHeaderSetting.valueFunc(
        poItemRows[0][sendEmailHeader]
    );


    try {
        let poId = poRecord.save({
            // enableSourcing: false,
            // ignoreMandatoryFields: false
        });

        context.write({
            key: context.key,
            value: {
                poRecordId: poId,
                poExternalId: poExternalId,
                success: true,
                sendEmail: sendEmail
            },
        });


    } catch (e) {
        context.write({
            key: context.key,
            value: {
                poRecordId: null,
                poExternalId: poExternalId,
                success: false,
                sendEmail: false,
                errorMsg: e.message
            }
        });

        log.error({ title: 'reduce - error', details: { 'context': context, 'error': e } });

    }

}




function summarize(context) {
    log.audit({ title: 'summarize - context', details: context });
    // Log details about the script's execution.
    log.audit({
        title: `Runtime stats`,
        details: `Usage units consumed (${context.usage}), Concurrency (${context.concurrency}), Number of yields (${context.yields})`
    });

    // Two main steps:
    //   1. Build + send a process summary email to send to the user, summarizing:
    //          POs successfully created, 
    //          POs not successfully created,
    //   2. Assemble all the PO data to pass to the JIT PO Email process and submit that task

    let posSucceeded = {};
    let posFailed = {};
    let posToEmail = [];

    for (const [key, valueRaw] of Object.entries(context.output)) {
        let thisVal = JSON.parse(valueRaw);
        if (thisVal.success) {
            posSucceeded[thisVal.poExternalId] = thisVal;
            if (thisVal.sendEmail) {
                posToEmail.push(thisVal.poRecordId);
            }
        } else {
            posFailed[thisVal.poExternalId] = {
                row: thisVal,
                errorMsg: thisVal.errorMsg
            };
        } 
    }

    // Send the summary email to the user
    let emailBody = buildProcessSummaryEmail(
        posSucceeded,
        posFailed,
        posToEmail
    );

    email.send({
        author: runtime.getCurrentUser().id,
        recipients: FCJITGenPoLib.Settings.Emails.PoCreationSummary.Recipients,
        cc: FCJITGenPoLib.Settings.Emails.PoCreationSummary.Cc,
        bcc: FCJITGenPoLib.Settings.Emails.PoCreationSummary.Bcc,
        body: emailBody,
        subject: FCJITGenPoLib.Settings.Emails.PoCreationSummary.Subject,
    });


    log.audit({
        title: 'Generated JIT POs - summary',
        details: emailBody 
    });


    // // Launch the JIT PO Email process
    // if (Object.keys(posToEmail).length > 0) {
    //     let emailTask = task.create({
    //         taskType: task.TaskType.MAP_REDUCE,
    //         scriptId: FCJITBulkEmailLib.Ids.Scripts.FC_BULK_EMAIL_JIT_POS_MR,
    //         deploymentId: FCJITBulkEmailLib.Ids.Scripts.FC_BULK_EMAIL_JIT_POS_MR,
    //         params: {
    //             custscript_jit_po_email_pos: JSON.stringify(posToEmail)
    //         }
    //     });

    //     let emailTaskId = emailTask.submit();
    //     log.audit({
    //         title: 'JIT PO Email task submitted',
    //         details: emailTaskId
    //     });
    // }

}


function buildProcessSummaryEmail (
    posSucceeded = {},
    posFailed = {},
    posToEmail = {},
) {

    let posSucceededCount = Object.keys(posSucceeded).length;
    let posFailedCount = Object.keys(posFailed).length;
    let posToEmailCount = Object.keys(posToEmail).length;

    let posSucceededList = '';
    let posFailedList = '';

    if (posSucceededCount > 0) {
        for (const [key, value] of Object.entries(posSucceeded)) {
            posSucceededList += `<li>Internal ID: ${value.poRecordId}, External ID: ${key}</li>`;
        }
    }

    if (posFailedCount > 0) {
        for (const [key, value] of Object.entries(posFailed)) {
            posFailedList += `<li>Internal ID: ${value.poRecordId}, External ID: ${key}, Error: ${value.errorMsg}</li>`;
        }
    }

    let emailBody = FCJITGenPoLib.Settings.Emails.PoCreationSummary.ReplaceAllPlaceholders(
        posSucceededCount,
        posFailedCount,
        posSucceededList,
        posFailedList,
    );

    return emailBody;
}


function buildPoRecord(csvRows) {
    let poRecord = record.create({
        type: record.Type.PURCHASE_ORDER,
        isDynamic: false
    });


    // Set the PO mainline fields
    let poMainlineHeaders = FCJITGenPoLib.MRSettings.CsvToNsFieldMap.filter(
        (header) => header.record === 'transaction'
    );

    for (let header of poMainlineHeaders) {
        let nsFieldId = header.nsFieldId;
        let typeFunc = csvRows[0][header].typeFunc;
        let nsValue = typeFunc(csvRows[0][header]);

        poRecord.setValue({
            fieldId: nsFieldId,
            value: nsValue
        });
    }

    // Set the PO item + inventory detail fields
    let poItemHeaders = FCJITGenPoLib.MRSettings.CsvToNsFieldMap.filter(
        (header) => header.record === 'item'
    );

    // FIX: Need to make sure we have an inventorydetail quantity field
    let invDetailHeaders = FCJITGenPoLib.MRSettings.CsvToNsFieldMap.filter(
        (header) => header.record === 'inventorydetail'
    );

    for (let i = 0; i < csvRows.length; i++) {
        let row = csvRows[i];

        // Insert a line in the item sublist.
        poRecord.insertLine({
            sublistId: 'item',
            line: i
        });


        // Set the required item-level fields for the line
        for (let header of poItemHeaders) {
            let nsFieldId = header.nsFieldId;
            let typeFunc = row[header].typeFunc;
            let nsValue = typeFunc(row[header]);

            poRecord.setSublistValue({
                sublistId: 'item',
                fieldId: header.fieldId,
                line: i,
                value: nsValue
            });
        }

        if (invDetailHeaders && invDetailHeaders.length > 0) {

            let invDetailSubrec = rec.getSublistSubrecord({
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
            for (let header of invDetailHeaders) {
                let nsFieldId = header.nsFieldId;
                let typeFunc = row[header].typeFunc;
                let nsValue = typeFunc(row[header]);

                invDetailSubrec.setSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: header.fieldId,
                    line: i,
                    value: nsValue
                });
            }
        }
    }

    return poRecord;
}


