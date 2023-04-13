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



define(['N/runtime', 'N/email', 'N/query', 'N/record', 'N/task', 'N/file', '../Libraries/fc-main.library.module.js', modulePathJitBulkEmailLibrary, modulePathGenerateJitPoUtilityLibrary, '../Libraries/papaparse.min.js'], main);

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

    var currentScript = runtime.getCurrentScript();
    var jitPoImportCsvFileId = currentScript.getParameter({
        name: FCJITGenPoLib.Ids.Parameters.JIT_PO_IMPORT_CSV_FILEID
    });

    if (!jitPoImportCsvFileId) {
        throw 'No JIT PO Import CSV File ID was provided.';
    }

    log.debug({ title: 'getInputData - jitPoImportCsvFileId', details: jitPoImportCsvFileId });

    var rows;

    try {
        // Load the CSV file with the import data
        // Convert it to an array of objects with keys matching the NS fields to be referenced when creating the POs


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
        rows = parsedFile.data;
    } catch (e) {
        log.error({ title: 'getInputData - error', details: e });
        sendTotalFailureEmail(
            `Failed in getInputData while trying to load the JIT PO Import CSV File with ID: ${jitPoImportCsvFileId}.
            Error details: ${e}
            `
        );
        throw e;
    }

    return rows;
}


function map(context) {
    log.debug({ title: 'map - result', details: context });

    try {
        let row = JSON.parse(context.value);

        log.debug({ title: 'map - row', details: row });

        let poExternalId = row[FCJITGenPoLib.Settings.PoImportCsv.NewOutputFields.poExternalId];

        log.debug({ title: 'map - poExternalId', details: poExternalId });
        log.debug({ title: 'map - FCJITGenPoLib.MRSettings.CsvToNsFieldMap', details: FCJITGenPoLib.MRSettings.CsvToNsFieldMap });
        // log.debug({ title: 'map - Settings.PoImportCsv.NewOutputFields.emailOnceCreated', details: FCJITGenPoLib.Settings.PoImportCsv.NewOutputFields.emailOnceCreated});
        // log.debug({ title: 'map - FCJITGenPoLib.MRSettings.CsvSpecialFields', details: FCJITGenPoLib.MRSettings.CsvSpecialFields});
        // log.debug({ title: 'map - FCJITGenPoLib.MRSettings.CsvSpecialFields parsed', details: JSON.parse(FCJITGenPoLib.MRSettings.CsvSpecialFields)});


        let targetKeys = [
            ...Object.keys(FCJITGenPoLib.MRSettings.CsvToNsFieldMap),
            // ...Object.keys(FCJITGenPoLib.MRSettings.CsvSpecialFields)
        ];

        log.debug({ title: 'map - targetKeys', details: targetKeys });

        let filteredRow = FCLib.pickFromObj(row, targetKeys);

        log.debug({ title: 'map - filteredRow', details: filteredRow });

        // let sessionFolderId = row.sessionFolderId;

        context.write({
            key: poExternalId,
            value: filteredRow,
            success: true
        });

    } catch (e) {
        context.write({
            key: poExternalId,
            value: filteredRow,
            success: false,
            errorMsg: e.message
        });
        log.error({ title: 'map - error', details: { 'context': context, 'error': e } });

        // FIX: Need to make sure the error makes it through to summarize
    }

}


function reduce(context) {
    log.audit({ title: 'reduce - context', details: context });

    var poRecord = null;
    var poExternalId;

    try {
        // First, check to see if there are any rows with error messages.
        //  If so, reject the entire PO and include the error message with the summary. 
        // let failedRows = [];
        // for (let value of context.values) {
        //     if (!value.success) {
        //         failedRows.push(value);
        //     }
        // }

        // if (failedRows.length > 0) {
        //     let errorMsg = `Skipping this entire PO (${key}) because the following rows failed to parse:
        //     ${JSON.stringify(failedRows)}.`;
        //     throw new Error(errorMsg);
        // }

        poExternalId = context.key;

        log.debug({ title: 'reduce - poExternalId', details: poExternalId });
        // let poItemRows = [...JSON.parse(context.values)];
        let poItemRowsRaw = context.values;
        log.debug({ title: 'reduce - poItemRows', details: poItemRowsRaw });

        let poItemRowsParsed = poItemRowsRaw.map(JSON.parse);


        poRecord = FCJITGenPoLib.buildPoRecord(poItemRowsParsed);

        log.debug({ title: 'reduce - poRecord', details: poRecord });

        let out = {
            key: context.key,
            value: {
                // poRecordId: poId,
                poExternalId: context.key,
                success: true,
                // sendEmail: sendEmail
            },
        };
        log.debug({ title: 'reduce - result out 1', details: out });

        let poId = poRecord.save();

        out.value.poRecordId = poId;

        log.debug({ title: 'reduce - result out 2', details: out });


        // log.debug({ title: 'reduce - result', details: `key: ${context.key}, value: ${context.value}`});

        context.write(out);


    } catch (e) {
        log.error({ title: 'reduce - error', details: { 'context': context, 'error': e } });

        let out = {
            key: context.key,
            value: {
                poRecordId: null,
                poExternalId: poExternalId,
                success: false,
                // sendEmail: false,
                errorMsg: e.message
            }
        };

        context.write(out);
    }

}

// function reduce(context) {
//     log.audit({ title: 'reduce - context', details: context });

//     var poRecord = null;

//     try {
//         // First, check to see if there are any rows with error messages.
//         //  If so, reject the entire PO and include the error message with the summary. 
//         let failedRows = [];
//         for (let row of context.values) {
//             if (!row.success) {
//                 failedRows.push(row);
//             }
//         }

//         if (failedRows.length > 0) {
//             let errorMsg = `Skipping this entire PO (${key}) because the following rows failed to parse:
//             ${JSON.stringify(failedRows)}.`;
//             throw new Error(errorMsg);
//         }

//         let poExternalId = context.key;

//         log.debug({ title: 'reduce - poExternalId', details: poExternalId });
//         // let poItemRows = [...JSON.parse(context.values)];
//         let poItemRows = context.values;
//         log.debug({ title: 'reduce - poItemRows', details: poItemRows });

//         poRecord = FCJITGenPoLib.buildPoRecord(poItemRows);

//         log.debug({ title: 'reduce - poRecord', details: poRecord });

//         let out = {
//             key: context.key,
//             value: {
//                 // poRecordId: poId,
//                 poExternalId: context.key,
//                 success: true,
//                 // sendEmail: sendEmail
//             },
//         };
//         log.debug({ title: 'reduce - result out 1', details: out });

//         let poId = poRecord.save({
//             // enableSourcing: false,
//             // ignoreMandatoryFields: false
//         });

//         out.value.poRecordId = poId;

//         log.debug({ title: 'reduce - result out 2', details: out });


//         // log.debug({ title: 'reduce - result', details: `key: ${context.key}, value: ${context.value}`});

//         context.write(out);


//     } catch (e) {
//         log.error({ title: 'reduce - error', details: { 'context': context, 'error': e } });

//         let out = {
//             key: context.key,
//             value: {
//                 poRecordId: null,
//                 poExternalId: poExternalId,
//                 success: false,
//                 // sendEmail: false,
//                 errorMsg: e.message
//             }
//         };

//         context.write(out);
//     }

// }




function summarize(context) {
    log.audit({ title: 'summarize - context', details: context });
    log.audit({ title: 'summarize - context JSON', details: JSON.stringify(context) });
    log.audit({ title: 'summarize - context output JSON', details: JSON.stringify(context.output) })

    // Log details about the script's execution.
    log.audit({
        title: `Runtime stats`,
        details: `Time to completion (${context.seconds} seconds), Usage units consumed (${context.usage}), Concurrency (${context.concurrency}), Number of yields (${context.yields})`
    });

    // Two main steps:
    //   1. Build + send a process summary email to send to the user, summarizing:
    //          POs successfully created, 
    //          POs not successfully created,
    //   2. Assemble all the PO data to pass to the JIT PO Email process and submit that task

    let posSucceeded = {};
    let posFailed = {};
    let posToEmail = [];

    context.output.iterator().each(function (key, value) {
        let thisVal = JSON.parse(value);
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
    });


    // Send the summary email to the user
    let emailBody = buildProcessSummaryEmail(
        posSucceeded,
        posFailed,
        posToEmail
    );

    email.send({
        author: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Sender,
        recipients: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Recipients,
        cc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Cc,
        bcc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Bcc,
        body: emailBody,
        subject: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Subject,
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


function sendTotalFailureEmail (reason) {
    let emailBody = 
        `The JIT PO creation process failed to create any POs.
        Reason specified: ${reason ? reason : 'No reason specified.'}`;

    email.send({
        author: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Sender,
        recipients: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Recipients,
        cc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Cc,
        bcc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Bcc,
        body: emailBody,
        subject: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Subject,
    });
    return;
}

function buildProcessSummaryEmail(
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

    let emailBody = FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Body.ReplaceAllPlaceholders(
        // FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Body.Template,
        posSucceededCount,
        posFailedCount,
        posSucceededList,
        posFailedList,
    );

    return emailBody;
}



