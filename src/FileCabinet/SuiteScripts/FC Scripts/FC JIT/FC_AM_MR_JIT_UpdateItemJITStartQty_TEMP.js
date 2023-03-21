/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope SameAccount
* @copyright 2023 Food Connects
* @author Alex McCullough alex.mccullough@gmail.com
* @description 
*/

var
    query,
    record,
    task,
    file,
    FCLib,
    FCJITUploadLib,
    Papa;

define(['N/query', 'N/record', 'N/task', 'N/file', './Libraries/FC_MainLibrary', 'FC_JITUpload_Library', '../Libraries/papaparse.min.js'], main);

function main(queryModule, recordModule, taskModule, fileModule, fcMainLibModule, fcJITUploadLibModule, papaParseModule) {

    query = queryModule;
    record = recordModule;
    task = taskModule;
    file = fileModule;
    FCLib = fcMainLibModule;
    FCJITUploadLib = fcJITUploadLibModule;
    Papa = papaParseModule;

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
}


function getInputData(context) {
    let itemUpdateCSVFileId = context.params[FCJITUploadLib.JIT_ITEM_UPDATE_CSV_FILEID];

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

    //NOTE: We shouldn't ever have more than one value returned here due to how we designed the input. 
    // How should we deal with it if we do have > 1 result? 
    // Currently: Consider only the first result.
    let result = context.values.map(JSON.parse)[0];

    // Get the internal item type for this item
    let itemType = FCLib.lookupInternalItemType(
        result[FCLib.Ids.Fields.Item.Type],
        result[FCLib.Ids.Fields.Item.IsLotItem]
    );

    try {
        var changedRecordId = record.submitFields({
            type: itemType,
            id: result[FCLib.Ids.Fields.Item.InternalId],
            values: {
                [FCLib.Ids.Fields.Item.StartJITQty]: result[FCLib.Ids.Fields.Item.StartJITQty],
                [FCLib.Ids.Fields.Item.RemainingJITQty]: result[FCLib.Ids.Fields.Item.RemainingJITQty],
            },
        });

        let summaryValue = {
            changeMsg: `Updated JIT quantity info for item ${result[FCLib.Ids.Fields.Item.Name]}: 
                Start JIT Qty: ${result[FCLib.Ids.Fields.Item.StartJITQty]}
                Remaining JIT Qty: ${result[FCLib.Ids.Fields.Item.RemainingJITQty]}
                From: Old Start (${result[FCLib.Ids.Fields.Item.OldStartJITQty]}) / Old Remaining (${result[FCLib.Ids.Fields.Item.OldRemainingJITQty]})`,
        };
        Object.assign(summaryValue(result));

        context.write({
            key: context.key,
            value: summaryValue
        });
    } catch (e) {
        log.error({ title: 'reduce - error', details: { 'context': context, 'error': e } });
    }
}


function summarize(context) {
    log.audit({ title: 'summarize - context', details: context });
    // Log details about the script's execution.
    log.audit({
        title: 'Usage units consumed',
        details: context.usage
    });
    log.audit({
        title: 'Concurrency',
        details: context.concurrency
    });
    log.audit({
        title: 'Number of yields',
        details: context.yields
    });

    var recordChangeCt = Object.keys(context.output).length;
    var itemsUpdated = [];

    context.output.iterator().each(function (key, value) {
        let thisVal = JSON.parse(value);
        itemsUpdated.push(thisVal[FCLib.Ids.Fields.Item.Name]);
        return true;
    });

    log.audit({
        title: 'Items updated with new JIT quantities',
        details: `Updated ${recordChangeCt} items. Item IDs: ${itemsUpdated.join(',')}`
    });
}