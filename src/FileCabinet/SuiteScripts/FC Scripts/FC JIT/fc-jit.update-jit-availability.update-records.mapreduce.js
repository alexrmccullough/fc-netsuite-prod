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
    query,
    record,
    task,
    file,
    FCLib,
    FCUpdateJITAvailLib,
    Papa;

define(['N/runtime', 'N/query', 'N/record', 'N/task', 'N/file', '../Libraries/fc-main.library.module', './fc-jit.update-jit-availablity.library.module.js', '../Libraries/papaparse.min.js'], main);

function main(runtimeModule, queryModule, recordModule, taskModule, fileModule, fcMainLibModule, fcJITUploadLibModule, papaParseModule) {

    runtime = runtimeModule;
    query = queryModule;
    record = recordModule;
    task = taskModule;
    file = fileModule;
    FCLib = fcMainLibModule;
    FCUpdateJITAvailLib = fcJITUploadLibModule;
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
        name: FCUpdateJITAvailLib.Ids.Parameters.JIT_ITEM_UPDATE_CSV_FILEID
        // name: 'custscript_csv_fileid'
    });

    // let itemUpdateCSVFileId2 = context.parameters[FCUpdateJITAvailLib.Ids.Parameters.JIT_ITEM_UPDATE_CSV_FILEID];
    log.debug({ title: 'getInputData - context', details: JSON.stringify(context)});
    log.debug({ title: 'getInputData', details: { itemUpdateCSVFileId: itemUpdateCSVFileId } });
    log.debug({ title: 'getInputData - csv param name', details: FCUpdateJITAvailLib.Ids.Parameters.JIT_ITEM_UPDATE_CSV_FILEID });
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
    try {

        //NOTE: We shouldn't ever have more than one value returned here due to how we designed the input. 
        // How should we deal with it if we do have > 1 result? 
        // Currently: Consider only the first result.
        let result = context.values.map(JSON.parse)[0];

        log.debug({ title: 'reduce - result', details: { item: context.key, result: result } });

        // Get the internal item type for this item
        let itemType = FCLib.lookupInternalItemType(
            result[FCLib.Ids.Fields.Item.ItemType],
            result[FCLib.Ids.Fields.Item.IsLotItem]
        );


        log.debug({ title: 'reduce - itemType', details: itemType });

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
        Object.assign(summaryValue, result);

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

    var itemsUpdated = [];

    context.output.iterator().each(function (key, value) {
        let thisVal = JSON.parse(value);
        itemsUpdated.push(thisVal[FCLib.Ids.Fields.Item.Name]);
        return true;
    });

    log.audit({
        title: 'Items updated with new JIT quantities',
        details: `Updated ${itemsUpdated.length} items. Item IDs: ${itemsUpdated.join(',')}`
    });
}