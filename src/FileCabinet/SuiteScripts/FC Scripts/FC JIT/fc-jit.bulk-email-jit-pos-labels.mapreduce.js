/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope SameAccount
* @copyright 2023 Food Connects
* @author Alex McCullough alex.mccullough@gmail.com
* @description 
*/

var modulePathJitPoUtilityLibrary = './fc-jit.send-jit-po-utility.library.module.js';

var
    runtime,
    query,
    record,
    task,
    file,
    FCLib,
    FCJITlib,
    Papa;

define(['N/runtime', 'N/query', 'N/record', 'N/task', 'N/file', '../Libraries/FC_MainLibrary', modulePathJitPoUtilityLibrary, '../Libraries/papaparse.min.js'], main);

function main(runtimeModule, queryModule, recordModule, taskModule, fileModule, fcMainLibModule, fcJITPoLibModule, papaParseModule) {

    runtime = runtimeModule;
    query = queryModule;
    record = recordModule;
    task = taskModule;
    file = fileModule;
    FCLib = fcMainLibModule;
    FCJITlib = fcJITPoLibModule;
    Papa = papaParseModule;

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
}


function getInputData(context) {
    // FIX: Can we go straight to context.parameters?
    
    var currentScript = runtime.getCurrentScript();

    let posToEmailExternalIdsRaw = currentScript.getParameter({
        name: FCJITlib.Ids.Parameters.POS_TO_EMAIL_EXTERNAL_IDS
    });

    let shippingLabelJsonFileId = currentScript.getParameter({
        name: FCJITlib.Ids.Parameters.SHIPPING_LABEL_JSON_FILE_ID
    });

    let targetSosStartDate = currentScript.getParameter({
        name: FCJITlib.Ids.Parameters.TARGET_SOS_START_DATE
    });

    let targetSosEndDate = currentScript.getParameter({
        name: FCJITlib.Ids.Parameters.TARGET_SOS_END_DATE
    });

    // If we don't have a shipping label JSON file ID, run a search/query generate that data
    
    // If we do have a shipping label JSON file ID, load and parse that data

    // Pass bulk PO data + shipping label data to map step







    log.debug({ title: 'getInputData', details: { posToEmailExternalIdsRaw: posToEmailExternalIdsRaw } });

    // Parse the input parameter into an array of PO external ids
    let posToEmailExternalIds = posToEmailExternalIdsRaw.split(',');
    
    // FIX: If we are going to attach shipping labels, we need to know the quantities specified on the submitted POs.
    //    How should we do this? 

    
    // Run query to get target PO internal IDs



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
    // let mapInfo = JSON.parse(context.value);

    // Verify vendor >> item quantities match between POs and shipping labels
    //      If they don't match, do not email that PO to vendor.
    //      Record the mismatch to email to user in summarize step.


    try {
        context.write({
            key: ,
            value: 
        });

    } catch (e) {
        log.error({ title: 'map - error', details: { 'context': context, 'error': e } });
    }

}


function reduce(context) {
    log.audit({ title: 'reduce - context', details: context });
    try {



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