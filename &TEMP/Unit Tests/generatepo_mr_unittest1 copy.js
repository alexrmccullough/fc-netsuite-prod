debugger;
require([
    'SuiteScripts/FC Scripts/FC JIT/fc-jit.generate-jit-po-assistant.library.module'
], function (FCJITGenPoLib) {

    let context = {
        key: 'JITPO_127_2023412_3028',
        values: ["{\"Final Item Qty\":\"5\",\"Receipt Lot Number\":\"JIT2023412a\",\"Receipt Lot Quantity\":\"5\",\"PO Memo\":\"\",\"PO External ID\":\"JITPO_127_2023412_3028\",\"PO Sequence Counter\":\"7\",\"Receive By Date\":\"4/12/2023\",\"Item Internal ID\":\"2235\",\"Vendor ID\":\"127\"}"]
    };

    let result = reduce(context);


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
    
            // context.write(out);
    
    
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
    
            // context.write(out);
        }
    
    }
});

