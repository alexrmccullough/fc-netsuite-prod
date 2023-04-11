/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope SameAccount
* @copyright 2023 Food Connects
* @author Alex McCullough alex.mccullough@gmail.com
* @description 
*/

var
    runtime,
    email,
    query,
    record,
    task,
    FCLib,
    FCLotMgmtLib,
    ThisAppLib;


define([
    'N/runtime', 
    'N/email', 
    'N/query', 
    'N/record', 
    'N/task', 
    '../Libraries/fc-main.library.module.js', 
    './fc-misc.general-lot-mgmt.library.module.js',
    './fc-misc.assign-so-lot-numbers-assistant.library.module.js'
], main);


function main(
    runtimeModule, 
    emailModule, 
    queryModule, 
    recordModule, 
    taskModule, 
    fcMainLibModule, 
    fcLotMgmtLibModule,
    thisAppLibModule
    ) {

    runtime = runtimeModule;
    email = emailModule;
    query = queryModule;
    record = recordModule;
    task = taskModule;
    FCLib = fcMainLibModule;
    FCLotMgmtLib = fcLotMgmtLibModule;
    ThisAppLib = thisAppLibModule;

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
}


function getInputData(context) {

    var currentScript = runtime.getCurrentScript();
    var sosToUpdateJsonFileId = currentScript.getParameter({
        name: ThisAppLib.MRSettings.Parameters.SELECTED_SO_JSON_FILE_ID
    });

    if (!sosToUpdateJsonFileId) {
        throw 'No SO JSON File ID was provided.';
    }

    var sosToUpdateInternalIds;

    try {
        // Load the JSON file with the import data
        // Convert it to an array of objects with keys matching the NS fields to be referenced when creating the POs

        let soList = FCLib.getTextFileContents(sosToUpdateJsonFileId);
        sosToUpdateInternalIds = JSON.parse(soList);
       

    } catch (e) {
        log.error({ title: 'getInputData - error', details: e });
        sendTotalFailureEmail(
            `Failed in getInputData while trying to load the SO Import CSV File with ID: ${sosToUpdateJsonFileId}.
            Error details: ${e}
            `
        );
        throw e;
    }

    return sosToUpdateInternalIds;
}


function map(context) {
    log.debug({ title: 'map - result', details: context });

    try {
        let row = JSON.parse(context.value);

        log.debug({ title: 'map - row', details: row });

        // let soInternalId = row[ThisAppLib.Settings.Ui.Step1.Sublists.SO_TABLE.TranId.Label];
        let soInternalId = row;

        log.debug({ title: 'map - soInternalId', details: soInternalId });

        // let targetKeys = [
            // ...Object.keys(FCJITGenPoLib.MRSettings.CsvToNsFieldMap),
        // ];

        // log.debug({ title: 'map - targetKeys', details: targetKeys });

        // let filteredRow = FCLib.pickFromObj(row, targetKeys);

        // log.debug({ title: 'map - filteredRow', details: filteredRow });

        // let sessionFolderId = row.sessionFolderId;

        context.write({
            key: soInternalId,
            value: row,
            success: true
        });

    } catch (e) {
        context.write({
            key: soInternalId,
            value: row,
            success: false,
            errorMsg: e.message
        });
        log.error({ title: 'map - error', details: { 'context': context, 'error': e } });

        // FIX: Need to make sure the error makes it through to summarize
    }

}


function reduce(context) {
    log.audit({ title: 'reduce - context', details: context });

    try {
        // First, check to see if there are any rows with error messages.
        // //  If so, reject the entire PO and include the error message with the summary. 
        // let failedRows = [];

        // for (let value of context.values) {
        //     if (!value.success) {
        //         failedRows.push(value);
        //     }
        // }

        // // let soName = row[ThisAppLib.Settings.Ui.Step1.Sublists.SO_TABLE.TranId.Label]

        // if (failedRows.length > 0) {
        //     let errorMsg = `Skipping this entire SO (${key}) because the following rows failed to parse:
        //     ${JSON.stringify(failedRows)}.`;
        //     throw new Error(errorMsg);
        // }

        let soInternalId = context.key;

        log.debug({ title: 'reduce - soInternalId', details: soInternalId });

        // let soToUpdate = context.values[0];
        
        // Load the SO Record to pass to the autoAssignLotNumbers function
        let soRecord = record.load({
            type: record.Type.SALES_ORDER,
            id: soInternalId,
            isDynamic: true
        });

        soUpdateSummary = FCLotMgmtLib.doAssignSOLotNumbers(soRecord);

        soRecord.save();

        log.debug({ title: 'reduce - soRecord', details: soRecord });

        let out = {
            key: context.key,
            value: {
                // poRecordId: poId,
                poExternalId: context.key,
                updateSummary: soUpdateSummary,
                success: true,
            },
        };

        log.debug({ title: 'reduce - result out 1', details: out });

        context.write(out);

    } catch (e) {
        log.error({ title: 'reduce - error', details: { 'context': context, 'error': e } });

        let out = {
            key: context.key,
            value: {
                soRecordId: null,
                soInternalId: soInternalId,
                success: false,
                // sendEmail: false,
                errorMsg: e.message
            }
        };

        context.write(out);
    }

}




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
    //          Lots that were assigned to each SO
    //          Lots that were not assigned

    // context.output.iterator().each(function (key, value) {
    //     let thisVal = JSON.parse(value);
    //     if (thisVal.success) {
    //         posSucceeded[thisVal.poExternalId] = thisVal;
    //         if (thisVal.sendEmail) {
    //             posToEmail.push(thisVal.poRecordId);
    //         }
    //     } else {
    //         posFailed[thisVal.poExternalId] = {
    //             row: thisVal,
    //             errorMsg: thisVal.errorMsg
    //         };
    //     }
    // });


    // // Send the summary email to the user
    // let emailBody = buildProcessSummaryEmail(
    //     // FIX
    // );

    // email.send({
    //     author: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Sender,
    //     recipients: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Recipients,
    //     cc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Cc,
    //     bcc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Bcc,
    //     body: emailBody,
    //     subject: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Subject,
    // });


    log.audit({
        title: 'AutoAssign SO Lot Numbers - summary',
        details: ''
    });


}



// function sendTotalFailureEmail (reason) {
//     let emailBody = 
//         `The Autoassign SO Lot Numbers process failed.
//         Reason specified: ${reason ? reason : 'No reason specified.'}`;

//     // FIX
//     email.send({
//         author: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Sender,
//         recipients: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Recipients,
//         cc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Cc,
//         bcc: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Bcc,
//         body: emailBody,
//         subject: FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Subject,
//     });
//     return;
// }

// function buildProcessSummaryEmail(
//     posSucceeded = {},
//     posFailed = {},
//     posToEmail = {},
// ) {

//     let posSucceededCount = Object.keys(posSucceeded).length;
//     let posFailedCount = Object.keys(posFailed).length;
//     let posToEmailCount = Object.keys(posToEmail).length;

//     let posSucceededList = '';
//     let posFailedList = '';

//     if (posSucceededCount > 0) {
//         for (const [key, value] of Object.entries(posSucceeded)) {
//             posSucceededList += `<li>Internal ID: ${value.poRecordId}, External ID: ${key}</li>`;
//         }
//     }

//     if (posFailedCount > 0) {
//         for (const [key, value] of Object.entries(posFailed)) {
//             posFailedList += `<li>Internal ID: ${value.poRecordId}, External ID: ${key}, Error: ${value.errorMsg}</li>`;
//         }
//     }

//     let emailBody = FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Body.ReplaceAllPlaceholders(
//         // FCJITGenPoLib.MRSettings.Emails.PoCreationSummary.Body.Template,
//         posSucceededCount,
//         posFailedCount,
//         posSucceededList,
//         posFailedList,
//     );

//     return emailBody;
// }




