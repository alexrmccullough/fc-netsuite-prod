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
    record,
    task,
    file,
    FCLib,
    ThisAppLib,
    Papa;

define(['N/runtime', 
    'N/record', 
    'N/task', 
    'N/file', 
    '../Libraries/fc-main.library.module', 
    './fc-jit.advanced-update-jit-availablity.library.module', 
    '../Libraries/papaparse.min'
], main);

function main(runtimeModule, recordModule, taskModule, fileModule, fcMainLibModule, fcJITUploadLibModule, papaParseModule) {
    runtime = runtimeModule;
    record = recordModule;
    task = taskModule;
    file = fileModule;
    FCLib = fcMainLibModule;
    ThisAppLib = fcJITUploadLibModule;
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

    let itemUpdateCSVFileId = currentScript.getParameter({
        name: ThisAppLib.Ids.Parameters.JIT_ITEM_UPDATE_CSV_FILEID
    });

    // let itemUpdateCSVFileId2 = context.parameters[FCUpdateJITAvailLib.Ids.Parameters.JIT_ITEM_UPDATE_CSV_FILEID];
    log.debug({ title: 'getInputData - context', details: JSON.stringify(context) });
    log.debug({ title: 'getInputData', details: { itemUpdateCSVFileId: itemUpdateCSVFileId } });
    log.debug({ title: 'getInputData - csv param name', details: ThisAppLib.Ids.Parameters.JIT_ITEM_UPDATE_CSV_FILEID });
    // log.debug({ title: 'getInputData', details: { itemUpdateCSVFileId2: itemUpdateCSVFileId2 } });


    // FIX?: Run query on future SOs at time of MR to reduce lag between launch and completion?
    // let subtractFutureSOS = context.params[FCJITUploadLib.SUBTRACT_FUTURE_SOS_ON_UPDATE];

    // Open and parse the input CSV
    let itemFileContents = file.load({ id: itemUpdateCSVFileId }).getContents();

    let parsedFile = Papa.parse(
        itemFileContents,
        {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: 'greedy',
        }
    );

    // Query the DB to get updated, more complete data about these items
    // Get at unique list of item internal ids from the data
    let itemInternalIds = parsedFile.data.reduce(function (itemids, row) {
        itemids.add(row[FCLib.Ids.Fields.Item.InternalId]);
        return itemids;
    }, new Set());

    // Run a simple query filtered by the item ids to get the required fields. 
    let sqlQuery = `
        SELECT
            Item.${FCLib.Ids.Fields.Item.InternalId},
            Item.${FCLib.Ids.Fields.Item.Name},
            Item.${FCLib.Ids.Fields.Item.DisplayName},
            Item.${FCLib.Ids.Fields.Item.ItemType},
            Item.${FCLib.Ids.Fields.Item.IsLotItem},
        FROM
            Item
        WHERE
            Item.${FCLib.Ids.Fields.Item.InternalId} IN (${[...itemInternalIds].join(',')})
        `;

    // Run the query
    let queryResults = FCLib.sqlSelectAllRowsIntoDict(
        sqlQuery,
        FCLib.Ids.Fields.Item.InternalId,
    );

    // Add the missing field data into the parsedFile data
    parsedFile.data.forEach((row) => {
        let itemInternalId = row[FCLib.Ids.Fields.Item.InternalId];
        let itemData = queryResults[itemInternalId];

        if (itemData) {
            Object.assign(row, itemData);
        }
    });


    return parsedFile.data;
}


function map(context) {
    log.debug({ title: 'map - result', details: context });
    let itemUpdateInfo = JSON.parse(context.value);

    try {
        context.write({
            key: itemUpdateInfo[FCLib.Ids.Fields.Item.InternalId],
            value: itemUpdateInfo
        });

    } catch (e) {
        log.error({ title: 'map - error', details: { 'context': context, 'error': e } });
    }

}


function reduce(context) {
    log.audit({ title: 'reduce - context', details: context });

    var result = context.values.map(JSON.parse)[0];
    log.debug({ title: 'reduce - result', details: { item: context.key, result: result } });

    var changedRecordId;
    var success = true;
    var errorMessage = '';

    try {

        //NOTE: We shouldn't ever have more than one value returned here due to how we designed the input. 
        // How should we deal with it if we do have > 1 result? 
        // Currently: Consider only the first result.

        // Get the internal item type for this item
        let itemType = FCLib.lookupInternalItemType(
            result[FCLib.Ids.Fields.Item.ItemType],
            result[FCLib.Ids.Fields.Item.IsLotItem]
        );

        log.debug({ title: 'reduce - itemType', details: itemType });

        changedRecordId = record.submitFields({
            type: itemType,
            id: result[FCLib.Ids.Fields.Item.InternalId],
            values: {
                [FCLib.Ids.Fields.Item.StartJITQty]: result[FCLib.Ids.Fields.Item.StartJITQty],
                [FCLib.Ids.Fields.Item.RemainingJITQty]: result[FCLib.Ids.Fields.Item.RemainingJITQty],
            },
        });


    } catch (e) {
        log.error({ title: 'reduce - error', details: { 'context': context, 'error': e } });
        success = false;
        errorMessage = e.message;
    }


    let changeNotes = {
        success: success,
        errorMessage: errorMessage,
        changedRecordId: changedRecordId,
        ...result
        // itemName: result[FCLib.Ids.Fields.Item.Name],
        // itemInternalId: result[FCLib.Ids.Fields.Item.InternalId],
        // itemStartJITQty: result[FCLib.Ids.Fields.Item.StartJITQty],
        // itemRemainingJITQty: result[FCLib.Ids.Fields.Item.RemainingJITQty],
        // itemOldStartJITQty: result[FCLib.Ids.Fields.Item.OldStartJITQty],
        // itemOldRemainingJITQty: result[FCLib.Ids.Fields.Item.OldRemainingJITQty],
    };

    context.write({
        key: context.key,
        value: changeNotes
    });
}


function summarize(context) {
    log.audit({ title: 'summarize - context', details: context });
    log.debug({ title: 'summarize start - Settings', details: JSON.stringify(ThisAppLib.Settings) });
    // Log details about the script's execution.
    log.audit({
        title: 'Metrics',
        details: `Usage: ${context.usage}, Concurrency: ${context.concurrency}, Yields: ${context.yields}`
    });

    // Log details about the script's execution AND send summary email to the user and to any default recipients. 
    // Build lists of succeeded and failed items
    let succeededItems = [];
    let failedItems = [];


    context.output.iterator().each((key, value) => {
        let changeInfo = JSON.parse(value);
        if (changeInfo.success) {
            succeededItems.push(changeInfo);
        } else {
            failedItems.push(changeInfo);
        }
        return true;
    });

    // Build a formatted table for the email output
    let htmlSuccessTable = '';

    if (succeededItems.length > 0) {
        let successFieldDefs = [
            ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.ItemInternalId,
            ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.ItemName,
            ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.ItemDisplayName,
            ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.StartJitQty,
            ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.RemainingJitQty,
        ];

        const successTableStyle = FCLib.Ui.TableStyles.Style1;

        succeededItems = FCLib.sortArrayOfObjsByKeys(
            succeededItems,
            [ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.ItemDisplayName]
        );

        htmlSuccessTable = FCLib.updatedConvertLookupTableToHTMLTable({
            data: succeededItems,
            fieldDefs: successFieldDefs,
            ...successTableStyle
        });
    }

    let htmlFailureTable = '';
    if (failedItems.length > 0) {
        let failureFieldDefs = [
            ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.FAILURE_TABLE.Fields.ItemInternalId,
            ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.FAILURE_TABLE.Fields.ItemName,
            ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.FAILURE_TABLE.Fields.ItemDisplayName,
            ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.FAILURE_TABLE.Fields.ErrorMessage,
        ];

        const failureTableStyle = FCLib.Ui.TableStyles.Style1;

        failedItems = FCLib.sortArrayOfObjsByKeys(
            failedItems,
            [ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.FAILURE_TABLE.Fields.ItemDisplayName]
        );

        htmlFailureTable = FCLib.updatedConvertLookupTableToHTMLTable({
            data: failedItems,
            fieldDefs: failureFieldDefs,
            ...failureTableStyle
        });
    }

    // Build the email body
    const thisUserRec = runtime.getCurrentUser();
    let userStr = `${thisUserRec.name} (${thisUserRec.id})`;


    log.debug({ title: 'summarize - SUMMARIZE_EMAIL obj', details: ThisAppLib.Settings.Email.SUMMARIZE_EMAIL });

    let emailBody = ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.BuildBody(
        userStr,
        htmlSuccessTable,
        htmlFailureTable,
    );

    log.debug({ title: 'summarize - emailBody', details: emailBody });

    let emailSubject = ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.BuildSubject();

    log.debug({ title: 'summarize - emailSubject', details: emailSubject });

    // Send the email
    email.send({
        author: thisUserRec.id,
        recipients: [
            thisUserRec.email,
            ...ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.RecipientsEmails,
        ],
        cc: ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.CcEmails,
        bcc: ThisAppLib.Settings.Email.SUMMARIZE_EMAIL.BccEmails,
        body: emailBody,
        subject: emailSubject
    });


    log.audit({
        title: 'Items updated with new JIT quantities',
        details: `Successfully updated ${succeededItems.length} items. Failed to update ${failedItems.length} items.}`
    });
}