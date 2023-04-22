/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope SameAccount
* @copyright 2023 Food Connects
* @author Alex McCullough alex.mccullough@gmail.com
* @description 
*/

var modulePathJitPoUtilityLibrary = './fc-jit.generate-jit-po-assistant.library.module.js';
var modulePathJitBulkEmailLibrary = './fc-jit.bulk-email-jit-pos-labels.process-emails.library.module.js';
var modulePathShipLabelLibrary = '../FC Shipping Labels/fc-shipping-labels.library.module.js';

var
    runtime,
    query,
    file,
    FCLib,
    FCJITBulkEmailLib,
    FCJITGenPoLib,
    dayjs;



define(['N/runtime', 'N/query', 'N/render', 'N/file', '../Libraries/fc-main.library.module.js', modulePathJitBulkEmailLibrary, modulePathJitPoUtilityLibrary, modulePathShipLabelLibrary, '../Libraries/dayjs.min.js'], main);

function main(runtimeModule, queryModule, renderModule, fileModule, fcMainLibModule, fcBulkEmailLibModule, fcJITPoLibModule, fcShipLabelLibModule, dayjsModule) {

    runtime = runtimeModule;
    query = queryModule;
    render = renderModule;
    file = fileModule;
    FCLib = fcMainLibModule;
    FCJITBulkEmailLib = fcBulkEmailLibModule;
    FCJITGenPoLib = fcJITPoLibModule;
    FCShipLabelLib = fcShipLabelLibModule;
    dayjs = dayjsModule;

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

    log.debug({ title: 'getInputData - currentScript', details: { currentScript: currentScript } });
    let paramNameInternalIds = FCJITBulkEmailLib.Ids.Parameters.POS_TO_EMAIL_INTERNAL_IDS;
    let paramNameExternalIds = FCJITBulkEmailLib.Ids.Parameters.POS_TO_EMAIL_EXTERNAL_IDS;
    let paramNameShippingLabelJsonFileIds = FCJITBulkEmailLib.Ids.Parameters.SHIPPING_LABEL_JSON_FILE_IDS;

    log.debug({ title: 'getInputData - paramNameInternalIds', details: { paramNameInternalIds: paramNameInternalIds } });
    log.debug({ title: 'getInputData - paramNameExternalIds', details: { paramNameExternalIds: paramNameExternalIds } });
    log.debug({ title: 'getInputData - paramNameShippingLabelJsonFileIds', details: { paramNameShippingLabelJsonFileIds: paramNameShippingLabelJsonFileIds } });


    let posToEmailInternalIdsRaw = currentScript.getParameter({
        name:paramNameInternalIds
    });
    posToEmailInternalIdsRaw = JSON.parse(posToEmailInternalIdsRaw);

    log.debug({ title: 'getInputData - posToEmailInternalIdsRaw', details: { posToEmailInternalIdsRaw: posToEmailInternalIdsRaw } });

    let shippingLabelJsonFileIds = currentScript.getParameter({
        name: paramNameShippingLabelJsonFileIds
    });
    shippingLabelJsonFileIds = JSON.parse(shippingLabelJsonFileIds);

    log.debug({ title: 'getInputData - shippingLabelJsonFileIds', details: { shippingLabelJsonFileIds: shippingLabelJsonFileIds } });

    // Accepting both internal and external IDs for POs to email.
    //    We will use both lists, if provided. But first we have to eliminate duplicates. 
    //    Build a single list of internal IDs to use for sending.posToEmailInternalIdsRaw
    let poInternalIds = null;

    if (posToEmailInternalIdsRaw) {
        poInternalIds = new Set(posToEmailInternalIdsRaw);    // FIX: Change to JSON.parse
    }

    log.debug({ title: 'getInputData - poInternalIds', details: { poInternalIds: poInternalIds } })

    // Validate requirements:
    //   Required: 
    //      - At least one of posToEmailInternalIdsRaw or posToEmailExternalIdsRaw
    //      - shippingLabelJsonFileId
    //   Optional: 
    //      - sessionOutputFolderId
    if (!shippingLabelJsonFileIds) {
        throw new Error('Missing required parameter: shippingLabelJsonFileId');
    }
    if (!poInternalIds) {
        throw new Error('Missing required parameter: posToEmailInternalIdsRaw or posToEmailExternalIdsRaw');
    }

    // If we have a list of PO external IDs, we need to convert them to internal IDs
    let sqlQuery = FCJITBulkEmailLib.buildPOInfoQuery({
        poInternalIds: Array.from(poInternalIds),
        // poExternalIds: Array.from(poExternalIds),
    });

    log.debug({ title: 'getInputData - sqlQuery', details: { sqlQuery: sqlQuery } }
    )
    let queryResults = FCLib.sqlSelectAllRows(sqlQuery);

    log.debug({ title: 'getInputData - queryResults', details: { queryResults: queryResults } })


    // We will pass rows of the following format to the map function:
    //    { id: 123, vendorid: 123, email: alex.mccullough@gmail, shippingLabelJsonFileId: 456 }
    //    Note that the shipping label JSON file ID is the same for all rows.
    let rows = [];
    for (let result of queryResults) {
        // We can associate an email with only one PO, so rather than send multiple POs in a single email,
        //    we will send multiple emails, one per PO. We will attach the shipping label to the first matching PO 
        //    we encounter, and not to subsequent POs for that vendor. 
        let shippingLabelFileId = null;
        if (result.vendorinternalid in shippingLabelJsonFileIds) {
            shippingLabelFileId = shippingLabelJsonFileIds[result.vendorinternalid];
            delete shippingLabelJsonFileIds[result.vendorinternalid];  
        }

        rows.push({
            poId: result.pointernalid,
            vendorid: result.vendorinternalid,
            email: result.email,
            shippingLabelJsonFileId: shippingLabelFileId,
            dueDate: result.duedate,
            displayId: result.displayid,
            // sessionFolderId: sessionOutputFolderId,
        });
    }

    return rows;
}


function map(context) {
    // For now, assume PO Internal Ids, no external Ids
    log.debug({ title: 'map - result', details: context });

    let thisPoInfo = JSON.parse(context.value);
    let poInternalId = thisPoInfo.poId;
    // let vendorInternalId = row.vendorId;
    // let poInternalId = row.poId;
    // let sessionFolderId = row.sessionFolderId;

    try {
        context.write({
            key: poInternalId,
            value: thisPoInfo
        });

    } catch (e) {
        log.error({ title: 'map - error', details: { 'context': context, 'error': e } });
    }

}


function reduce(context) {
    log.audit({ title: 'reduce - context', details: context });
    try {
        let poInternalId = context.key;
        let thisPoInfo = JSON.parse(context.values[0]);


        let shippingLabelJsonFileId = thisPoInfo.shippingLabelJsonFileId;        // Assuming a single value per poInternalId

        let shippingLabelData = null;
        let shippingLabelPdf_1 = null;
        let shippingLabelPdf_2 = null;

        if (shippingLabelJsonFileId) {
            let jsonContents = FCLib.getTextFileContents(shippingLabelJsonFileId);
            shippingLabelData = JSON.parse(jsonContents);
            shippingLabelSearchResults = {
                data: shippingLabelData
            };

            // Generate and save the shipping label PDF file
            let shippingLabelPdfXml_1 = FCShipLabelLib.generateShippingLabelXmlFromSearchResults(
                shippingLabelSearchResults,
                'PDF_AVERY_8X11'
            );

            let shippingLabelPdfXml_2 = FCShipLabelLib.generateShippingLabelXmlFromSearchResults(
                shippingLabelSearchResults,
                'PDF_ZEBRA_2X4'
            );

            shippingLabelPdf_1 = render.xmlToPdf({
                xmlString: shippingLabelPdfXml_1
            });

            shippingLabelPdf_2 = render.xmlToPdf({
                xmlString: shippingLabelPdfXml_2
            });
        }


        // Generate the PO PDF file
        let poPdf = render.transaction({
            entityId: Number(poInternalId),
            printMode: render.PrintMode.PDF
        });


        // Send email
        let emailRecipients = thisPoInfo.email.split(/[,;]+/).map(email => email.trim());
        let formattedDueDate = dayjs(thisPoInfo.dueDate).format('M/D/YYYY');

        log.debug({ title: 'reduce - emailRecipients', details: emailRecipients });
        log.debug({ title: 'reduce - formattedDueDate', details: formattedDueDate })


        // Build email subject
        let emailSubject = FCJITBulkEmailLib.Emails.JIT_PO_EMAIL.Subject.Template;
        emailSubject = emailSubject.replace(
            FCJITBulkEmailLib.Emails.JIT_PO_EMAIL.Subject.Placeholders.PONUMBER,
            thisPoInfo.displayId
        ).replace(
            FCJITBulkEmailLib.Emails.JIT_PO_EMAIL.Subject.Placeholders.DUEDATE,
            formattedDueDate
        );

        log.debug({ title: 'reduce - emailSubject', details: emailSubject });

        // Build email body
        // FIX: Add detail
        let emailBody = FCJITBulkEmailLib.Emails.JIT_PO_EMAIL.Body.Template;
        emailBody = emailBody.replace(
            FCJITBulkEmailLib.Emails.JIT_PO_EMAIL.Body.Placeholders.DUEDATE,
            formattedDueDate
        );
        // emailBody = emailBody.replace(JIT_PO_EMAIL_BODY.Placeholders.INSTRUCTIONS, emailInfo.instructions);
        log.debug({ title: 'reduce - emailBody', details: emailBody });


        let emailAttachments = [poPdf];
        if (shippingLabelPdf_1) { emailAttachments.push(shippingLabelPdf_1); }
        if (shippingLabelPdf_2) { emailAttachments.push(shippingLabelPdf_2); }

        log.debug({ title: 'reduce - emailAttachments', details: emailAttachments });


        email.send({
            author: FCJITBulkEmailLib.Emails.JIT_PO_EMAIL.AuthorId,
            recipients: emailRecipients,
            // cc: ,
            // bcc: ,
            body: emailBody,
            subject: emailSubject,
            attachments: emailAttachments,
            relatedRecords: {
                transactionId: poInternalId,
                entityId: thisPoInfo.vendorId
            },
            // replyTo: ,
        });

        context.write({
            key: context.key,
            value: thisPoInfo,
            success: true,
        });

    } catch (e) {
        log.error({ title: 'reduce - error', details: { 'context': context, 'error': e.message } });
        context.write({
            key: context.key,
            value: thisPoInfo,
            success: false,
        });
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

    var posSuccessful = [];
    var posFailed = [];

    context.output.iterator().each(function (key, value) {
        let thisPo = JSON.parse(value);
        if (thisPo.success === true) { posSuccessful.push(thisPo); }
        else { posFailed.push(thisPo); }

        return true;
    });


    // Assemble summary email and send to user
    let emailBody = FCJITBulkEmailLib.Emails.SUMMARIZE_EMAIL.Body.Template;
    let successfulPoNames = posSuccessful.map(po => po.displayId).join(', ');
    let failedPoNames = posFailed.map(po => po.displayId).join(', ');

    emailBody = emailBody.replace(
        FCJITBulkEmailLib.Emails.SUMMARIZE_EMAIL.Body.Placeholders.POS_SENT,
        successfulPoNames
    ).replace(
        FCJITBulkEmailLib.Emails.SUMMARIZE_EMAIL.Body.Placeholders.POS_FAILED,
        failedPoNames
    );

    let emailSubject = FCJITBulkEmailLib.Emails.SUMMARIZE_EMAIL.Subject.Template;
    emailSubject = emailSubject.replace(
        FCJITBulkEmailLib.Emails.SUMMARIZE_EMAIL.Subject.Placeholders.TIMESTAMP,
        dayjs().format('M/D/YYYY h:mm A')
    );

    let thisUserRec = runtime.getCurrentUser();

    email.send({
        author: thisUserRec.id,
        recipients: [
            thisUserRec.email,
            ...FCJITBulkEmailLib.Emails.SUMMARIZE_EMAIL.RecipientsEmails
        ],
        cc: FCJITBulkEmailLib.Emails.SUMMARIZE_EMAIL.CcEmails,
        bcc: FCJITBulkEmailLib.Emails.SUMMARIZE_EMAIL.BccEmails,
        body: emailBody,
        subject: emailSubject,
    });


    log.audit({
        title: 'JIT Purchase Orders sent',
        details: `Sent ${posSuccessful.length} Purchase Orders. PO IDs: ${posSent.join(', ')}. <br>
             Failed to send ${posFailed.length} Purchase Orders. PO IDs: ${posFailed.join(', ')}
             `
    });
}




