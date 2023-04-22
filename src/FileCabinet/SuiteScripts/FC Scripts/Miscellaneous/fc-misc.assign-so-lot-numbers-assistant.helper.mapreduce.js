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
    record,
    FCLib,
    FCLotMgmtLib,
    ThisAppLib;


define([
    'N/runtime',
    'N/email',
    'N/record',
    '../Libraries/fc-main.library.module.js',
    './fc-misc.general-lot-mgmt.library.module.js',
    './fc-misc.assign-so-lot-numbers-assistant.library.module.js'
], main);


function main(
    runtimeModule,
    emailModule,
    recordModule,
    fcMainLibModule,
    fcLotMgmtLibModule,
    thisAppLibModule
) {

    runtime = runtimeModule;
    email = emailModule;
    record = recordModule;
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

        // Query the DB to get more detailed main line info about the SOs that we're going to try to update.
        // We'll have this data on hand for log messages along the way.
        // Most importantly, we'll have it on hand to email out a detailed process summary email.
        let sqlSoListQuery = ThisAppLib.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.BuildQuery(sosToUpdateInternalIds);
        let soListQueryResults = FCLib.sqlSelectAllRows(sqlSoListQuery);

    } catch (e) {
        log.error({ title: 'getInputData - error', details: e });
        sendTotalFailureEmail(
            `Failed in getInputData while trying to load the SO Import CSV File with ID: ${sosToUpdateJsonFileId}.
            Error details: ${e}
            `
        );
        throw e;
    }

    return soListQueryResults;
}


function map(context) {
    log.debug({ title: 'map - result', details: context });

    const soInfo = JSON.parse(context.value);
    const soInternalId = soInfo[ThisAppLib.Queries.MR_GET_SOS_TO_UPDATE_DETAILS.FieldSet.TranInternalId.fieldid];

    context.write({
        key: soInternalId,
        value: soInfo,
    });
}


function reduce(context) {
    log.audit({ title: 'reduce - context', details: context });

    var soInternalId = context.key;
    var soInfo = JSON.parse(context.value);
    var success = true;
    var errorMessage = '';
    var soUpdateSummary = '';

    try {
        log.debug({ title: 'reduce - soInternalId', details: soInternalId });

        // Load the SO Record to pass to the autoAssignLotNumbers function
        let soRecord = record.load({
            type: record.Type.SALES_ORDER,
            id: soInternalId,
            isDynamic: true
        });

        soUpdateSummary = FCLotMgmtLib.doAssignSOLotNumbers(soRecord);
        soRecord.save();

        log.debug({ title: 'reduce - soRecord', details: soRecord });

    } catch (e) {
        log.error({ title: 'reduce - error', details: { 'context': context, 'error': e } });
        success = false;
        errorMessage = e.message;
    }

    let out = {
        key: soInternalId,
        value: {
            success: success,
            errorMessage: errorMessage,
            ...soInfo
        }
    };

    context.write(out);

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

    // Build and send a detailed summary email of the changes that were applied and the failures that occurred
    // Build lists of succeeded and failed items
    let succeededSos = [];
    let failedSos = [];

    context.output.iterator().each((key, value) => {
        let changeInfo = JSON.parse(value);
        if (changeInfo.success) {
            succeededSos.push(changeInfo);
        } else {
            failedSos.push(changeInfo);
        }
        return true;
    });

    // Build a formatted table for the email output
    let htmlSuccessTable = '';

    if (succeededSos.length > 0) {
        let successFieldDefs = [
            ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.TranInternalId,
            ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.TranId,
            ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.CustomerName,
            ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.ShipDate,
        ];

        const successTableStyle = FCLib.Ui.TableStyles.Style1;

        succeededSos = FCLib.sortArrayOfObjsByKeys(
            succeededSos,
            [ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.TranId]
        );

        htmlSuccessTable = FCLib.updatedConvertLookupTableToHTMLTable({
            data: succeededSos,
            fieldDefs: successFieldDefs,
            ...successTableStyle
        });
    }

    let htmlFailureTable = '';
    if (failedSos.length > 0) {
        let failureFieldDefs = [
            ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.TranInternalId,
            ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.TranId,
            ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.CustomerName,
            ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.ShipDate,
            ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.ErrorMessage,
        ];

        const failureTableStyle = FCLib.Ui.TableStyles.Style1;

        failedSos = FCLib.sortArrayOfObjsByKeys(
            failedSos,
            [ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.FAILURE_TABLE.Fields.TranId]
        );

        htmlFailureTable = FCLib.updatedConvertLookupTableToHTMLTable({
            data: failedSos,
            fieldDefs: failureFieldDefs,
            ...failureTableStyle
        });
    }

    // Build the email body
    const thisUserRec = runtime.getCurrentUser();
    let userStr = `${thisUserRec.name} (${thisUserRec.id})`;

    log.debug({ title: 'summarize - SUMMARIZE_EMAIL obj', details: ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL });

    let emailBody = ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.BuildBody(
        userStr,
        htmlSuccessTable,
        htmlFailureTable,
    );

    log.debug({ title: 'summarize - emailBody', details: emailBody });

    let emailSubject = ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.BuildSubject();

    log.debug({ title: 'summarize - emailSubject', details: emailSubject });

    // Send the email
    email.send({
        author: thisUserRec.id,
        recipients: [
            thisUserRec.email,
            ...ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.RecipientsEmails,
        ],
        cc: ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.CcEmails,
        bcc: ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.BccEmails,
        body: emailBody,
        subject: emailSubject
    });

    log.audit({ title: 'Final Process Summary', details: `Succeeded: ${succeededSos.length}, Failed: ${failedSos.length}` });
}


function sendTotalFailureEmail (reason) {
    let emailBody =
        `The Autoassign SO Lot Numbers process failed.
        Reason specified: ${reason ? reason : 'No reason specified.'}`;
    let thisUserRec = runtime.getCurrentUser();

    // FIX
    email.send({
        author: thisUserRec.id,
        recipients: [
            thisUserRec.email,
            ...ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.RecipientsEmails,
        ],
        cc: ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.CcEmails,
        bcc: ThisAppLib.MRSettings.Email.SUMMARIZE_EMAIL.BccEmails,
        body: emailBody,
        subject: 'Autoassign SO Lot Numbers - Total Process Failure'
    });
    return;
}





