/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(["N/record", "N/error", "N/currentRecord", "N/search"],
    function (record, error, currentRecord, search) {
        function fieldChanged(context) {
            var sublistName = context.sublistId;
            var sublistFieldName = context.fieldId;
            log.debug({ title: "adjusting jit qty", details: "in fieldChanged" })

            if (sublistName === "item" && sublistFieldName === "item") {
                var currentRecord = context.currentRecord;
                let itemJitQtyRemain;


                log.debug({ title: "adjusting jit qty", details: sublistName });
                let itemIntId = currentRecord.getCurrentSublistValue({ sublistId: "item", fieldId: "item", });

                log.debug({ title: "adjusting jit qty", details: itemIntId });

                itemJitQtyRemain = search.lookupFields({
                    type: search.Type.ITEM,
                    id: itemIntId,
                    columns: 'custitem_fc_am_jit_remaining'
                });
                log.debug({ title: "adjusting jit qty", details: itemJitQtyRemain });

                if (itemJitQtyRemain !== null && itemJitQtyRemain !== undefined && itemJitQtyRemain !== "" && itemJitQtyRemain !== "NaN") {
                    currentRecord.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_fc_jitremainqty",
                        value: itemJitQtyRemain.custitem_fc_am_jit_remaining
                    });
                }
                log.debug({ title: "adjusting jit qty", details: "done" });
            }
        }

        return {
            fieldChanged: fieldChanged,
        };
    }
);