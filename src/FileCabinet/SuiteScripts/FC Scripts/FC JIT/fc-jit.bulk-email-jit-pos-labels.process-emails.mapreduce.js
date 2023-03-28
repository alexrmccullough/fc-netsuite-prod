/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope SameAccount
* @copyright 2023 Food Connects
* @author Alex McCullough alex.mccullough@gmail.com
* @description 
*/

var modulePathJitPoUtilityLibrary = './fc-jit.send-jit-po-utility.library.module.js';
var modulePathJitBulkEmailLibrary = './fc-jit.bulk-email-jit-pos-labels.library.module.js';

var
    runtime,
    query,
    record,
    task,
    file,
    FCLib,
    FCJITBulkEmailLib,
    FCJITLib,
    Papa;



define(['N/runtime', 'N/query', 'N/record', 'N/task', 'N/file', '../Libraries/FC_MainLibrary', modulePathJitBulkEmailLibrary, modulePathJitPoUtilityLibrary, '../Libraries/papaparse.min.js'], main);

function main(runtimeModule, queryModule, recordModule, taskModule, fileModule, fcMainLibModule, fcBulkEmailLibModule, fcJITPoLibModule, papaParseModule) {

    runtime = runtimeModule;
    query = queryModule;
    record = recordModule;
    task = taskModule;
    file = fileModule;
    FCLib = fcMainLibModule;
    FCJITBulkEmailLib = fcBulkEmailLibModule;
    FCJITLib = fcJITPoLibModule;
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
    // log.debug({ title: 'getInputData', details: { posToEmailExternalIdsRaw: posToEmailExternalIdsRaw } });

    var currentScript = runtime.getCurrentScript();

    let posToEmailExternalIdsRaw = currentScript.getParameter({
        name: FCJITBulkEmailLib.Ids.Parameters.POS_TO_EMAIL_EXTERNAL_IDS
    });

    let posToEmailInternalIdsRaw = currentScript.getParameter({
        name: FCJITBulkEmailLib.Ids.Parameters.POS_TO_EMAIL_INTERNAL_IDS
    });

    let shippingLabelJsonFileId = currentScript.getParameter({
        name: FCJITBulkEmailLib.Ids.Parameters.SHIPPING_LABEL_JSON_FILE_ID
    });

    let targetSosStartDate = currentScript.getParameter({
        name: FCJITBulkEmailLib.Ids.Parameters.TARGET_SOS_START_DATE
    });

    let targetSosEndDate = currentScript.getParameter({
        name: FCJITBulkEmailLib.Ids.Parameters.TARGET_SOS_END_DATE
    });

    let sessionOutputFolderId = currentScript.getParameter({
        name: FCJITBulkEmailLib.Ids.Parameters.SESSION_OUTPUT_FOLDER_ID
    });

    // Accepting both internal and external IDs for POs to email.
    //    We will use both lists, if provided. But first we have to eliminate duplicates. 
    //    Build a single list of internal IDs to use for sending.posToEmailInternalIdsRaw
    let poInternalIds = null;
    let poExternalIds = null;

    if (posToEmailInternalIdsRaw) {
        poInternalIds = new Set(posToEmailInternalIdsRaw.split(','));
    }
    if (posToEmailExternalIdsRaw) {
        poExternalIds = new Set(posToEmailExternalIdsRaw.split(','));
    }

    // If we have a list of PO external IDs, we need to convert them to internal IDs
    let sqlQuery = FCJITBulkEmailLib.buildPOInfoQuery({
        poInternalIds: Array.from(poInternalIds),
        poExternalIds: Array.from(poExternalIds),
    });

    let queryResults = FCLib.sqlSelectAllRows(sqlQuery);

    // queryResults.forEach(function (row) {
    //     uniquePOInternalIds.add(row.id);
    // });


    // If we don't have a shipping label JSON file ID, run a search/query generate that data
    // FIX: DO LATER

    // We will pass rows of the following format to the map function:
    //    { id: 123, vendorid: 123, email: alex.mccullough@gmail, shippingLabelJsonFileId: 456 }
    //    Note that the shipping label JSON file ID is the same for all rows.
    let rows = [];
    for (let result of queryResults) {
        rows.push({
            id: result.id,
            vendorid: result.vendorid,
            email: result.email,
            shippingLabelJsonFileId: shippingLabelJsonFileId,
            // sessionFolderId: sessionOutputFolderId,
        });
    }

    return rows;
}


function map(context) {
    log.debug({ title: 'map - result', details: context });

    let row = JSON.parse(context.value);
    let poInternalId = row.poInternalId;
    let shippingLabelJsonFileId = row.shippingLabelJsonFileId;
    // let sessionFolderId = row.sessionFolderId;

    try {
        context.write({
            key: poInternalId,
            value: {
                shippingLabelJsonFileId: shippingLabelJsonFileId,
                // sessionFolderId: sessionFolderId,
            }
        });

    } catch (e) {
        log.error({ title: 'map - error', details: { 'context': context, 'error': e } });
    }

}


function reduce(context) {
    log.audit({ title: 'reduce - context', details: context });
    try {
        let poInternalId = context.key;
        let emailInfo = context.values[0];
        let shippingLabelJsonFileId = emailInfo.shippingLabelJsonFileId;        // Assuming a single value per poInternalId
        // let sessionFolderId = context.values[0].sessionFolderId;                        // Assuming a single value per poInternalId

        let shippingLabelJson = JSON.parse(FCLib.getTextFileContents(shippingLabelJsonFileId));
        let poShippingLabelInfo = (poInternalId in shippingLabelJson) ? shippingLabelJson[poInternalId] : null;

        // Generate the PO PDF file
        let poPdf = render.transaction({
            entityId: poInternalId,
            printMode: render.PrintMode.PDF
        });

        let shippingLabelPdf_1 = null;
        let shippingLabelPdf_2 = null;

        if (poShippingLabelInfo) {
            // Generate and save the shipping label PDF file
            let shippingLabelPdfXml_1 = FCShipLabelLib.generateShippingLabelXmlFromSearchResults(
                poShippingLabelInfo,
                'PDF_AVERY_8X11'
            );

            let shippingLabelPdfXml_2 = FCShipLabelLib.generateShippingLabelXmlFromSearchResults(
                poShippingLabelInfo,
                'PDF_ZEBRA_2X4'
            );

            shippingLabelPdf_1 = render.xmlToPdf({
                xmlString: shippingLabelPdfXml_1
            });

            shippingLabelPdf_2 = render.xmlToPdf({
                xmlString: shippingLabelPdfXml_2
            });
        }

        // Send email
        // Build email subject
        let emailSubject = FCJITBulkEmailLib.Content.JIT_PO_EMAIL_SUBJECT.Template;
        emailSubject = emailSubject.replace(
            FCJITBulkEmailLib.Content.JIT_PO_EMAIL_SUBJECT.Placeholders.PONUMBER,
            emailInfo.displayid
        );

        // Build email body
        // FIX: Add detail
        let emailBody = FCJITBulkEmailLib.Content.JIT_PO_EMAIL_BODY.Template;
        emailBody = emailBody.replace(
            FCJITBulkEmailLib.Content.JIT_PO_EMAIL_BODY.Placeholders.DUEDATE,
            emailInfo.duedate
        );
        // emailBody = emailBody.replace(JIT_PO_EMAIL_BODY.Placeholders.INSTRUCTIONS, emailInfo.instructions);

        let attachments = [poPdf];
        if (poShippingLabelInfo) {
            attachments.push(shippingLabelPdf_1);
            attachments.push(shippingLabelPdf_2);
        }

        email.send({
            author: runtime.getCurrentUser().id,
            recipients: emailInfo.email,
            // cc: ,
            // bcc: ,
            body: emailBody,
            subject: emailSubject,
            attachments: attachments,
            relatedRecords: {
                transactionId: poInternalId,
                entityId: emailInfo.vendorid
            },
            // replyTo: ,
        });

        context.write({
            key: context.key,
            value: emailInfo
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

    var posSent = [];

    context.output.iterator().each(function (key, value) {
        let thisVal = JSON.parse(value);
        posSent.push(thisVal.displayid);
        return true;
    });

    log.audit({
        title: 'JIT Purchase Orders sent',
        details: `Sent ${posSent.length} Purchase Orders. PO IDs: ${posSent.join(', ')}`
    });
}




