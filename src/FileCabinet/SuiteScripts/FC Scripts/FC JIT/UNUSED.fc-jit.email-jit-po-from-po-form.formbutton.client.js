/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

var dialog;

define(['N/ui/dialog'], main);

function main(dialogModule) {
    dialog = dialogModule;


    function pageInit(context) {
    }

    function onButtonClick() {
        // var currentRecord = context.currentRecord;
        // var poId = currentRecord.getValue({
        //     fieldId: 'internalid'
        // });
        // var poExternalId = currentRecord.getValue({
        //     fieldId: 'externalid'
        // });

        dialog.alert({
            title: 'Clicked Send JIT PO',
            message: `parameters: `,
        });
    }

    return {
        pageInit: pageInit,
        onButtonClick: onButtonClick
    };
}