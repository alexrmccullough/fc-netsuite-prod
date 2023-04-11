debugger;
require(['SuiteScripts\/FC Scripts\/Miscellaneous/fc-misc.general-lot-mgmt.library.module'], function (FCLotMgmtLib) {

    try {
        var soInternalId = 5334;

        log.debug({ title: 'reduce - soInternalId', details: soInternalId });

        // let soToUpdate = context.values[0];

        // Load the SO Record to pass to the autoAssignLotNumbers function
        var soRecord = record.load({
            type: record.Type.SALES_ORDER,
            id: soInternalId,
            isDynamic: false
        });

        soUpdateSummary = FCLotMgmtLib.doAssignSOLotNumbers(soRecord);

        soRecord.save();

        log.debug({ title: 'reduce - soRecord', details: soRecord });

        // var out = {
        //     key: context.key,
        //     value: {
        //         // poRecordId: poId,
        //         poExternalId: context.key,
        //         updateSummary: soUpdateSummary,
        //         success: true,
        //     },
        // };
    }

    catch (e) {
        log.error({ title: 'reduce - error', details: e });
        throw e;
    }

    log.debug({ title: 'reduce - result out 1', details: out });

    context.write(out);

});

