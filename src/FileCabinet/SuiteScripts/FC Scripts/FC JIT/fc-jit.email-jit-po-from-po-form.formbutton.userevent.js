/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

var runtime,
    log,
    url;

define(['N/runtime', 'N/log', 'N/url'], main);

function main(runtimeModule, logModule, urlModule) {
    runtime = runtimeModule;
    log = logModule;
    url = urlModule;

    function beforeLoad(context) {
        try {
            const curRecord = context.newRecord;
            // const objForm = context.form;
            const poStatus = curRecord.getValue({
                fieldId: 'status'
            });

            if (poStatus === 'Pending Receipt' ||            // Pending Receipt
                poStatus === 'Partially Received' ||            // Partially Received
                poStatus === 'Pending Billing/Partially Received' ||            // Pending Billing/Partially Received
                poStatus === 'Pending Bill'               // Pending Billing
            ) {


                // let suiteletUrl = `https://6668932.app.netsuite.com/app/site/hosting/scriptlet.nl?script=1455&deploy=1`;
                let suiteletUrl = `https://debugger.na9.netsuite.com/app/site/hosting/scriptlet.nl?script=1455&deploy=1`;

                let params = buildParametersToPass(context, curRecord);
                // params.status = poStatus;

                suiteletUrl += '&' + Object.keys(params).map(key => key + '=' + params[key]).join('&');

                var launchSuitelet = `window.open('${suiteletUrl}', '_blank', 'width=800,height=600');`;

                context.form.addButton({
                    id: 'custpage_sendjitpo',
                    label: 'Send JIT PO',
                    // functionName : 'window.open(' + suiteUrl + ')',
                    // functionName : 'onButtonClick',
                    functionName: launchSuitelet
                });

            }


        } catch (error) {
            throw error;

            // log.error({
            //     title: 'beforeLoad_addButton',
            //     details: error.message
            // });
        }
    }

    return {
        beforeLoad: beforeLoad
    };
}


function buildParametersToPass(context, poRec) {
    let params = {
        custpage_param_po_internalid: poRec.id, // FIX: Needs to match module param name
        custpage_param_po_rectype: poRec.type,
        custpage_param_po_recipients: '',
        custpage_param_po_cc: '',
        custpage_param_po_bcc: '',
        // custpage_param_po_items_counts: '',
    };


    // Build list of PO recipients
    //  Should simply be the PO email field
    params.custpage_param_po_recipients = poRec.getValue({
        fieldId: 'email'
    });

    // Build list of PO CC, if applicable

    // Build list of PO BCC, if applicable


    return params;

}