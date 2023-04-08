require(['N/record', 'N/render', 'SuiteScripts/FC Scripts/Libraries/fc-main.library.module.js', 'SuiteScripts/FC Scripts/FC Shipping Labels/fc-shipping-labels.library.module.js', 'SuiteScripts/FC Scripts/Libraries/dayjs.min.js'], function (record, render, FCLib, FCShipLabelLib, dayjs) {



    var exports = {
        Queries: {
            POInfoQuery: {
                SQL_IntExt: `
                        SELECT
                            Transaction.id,
                            Transaction.entity AS vendorid,
                            Transaction.email,
                            Transaction.duedate,
                            Transaction.tranid AS displayid
                    
                        FROM
                            Transaction
                        
                        WHERE
                            (Transaction.externalid IN (@@PO_EXT_IDS@@))
                            OR (Transaction.id IN (@@PO_INT_IDS@@))
                        `,
                SQL_Int: `
                        SELECT
                            Transaction.id,
                            Transaction.entity AS vendorid,
                            Transaction.email,
                            Transaction.duedate,
                            Transaction.tranid AS displayid
            
                        FROM
                            Transaction
                        
                        WHERE
                            (Transaction.id IN (@@PO_INT_IDS@@))            
                        `,
                SQL_Ext: `
                        SELECT
                            Transaction.id,
                            Transaction.entity AS vendorid,
                            Transaction.email,
                            Transaction.duedate,
                            Transaction.tranid AS displayid
            
            
                        FROM
                            Transaction
                        
                        WHERE
                            (Transaction.externalid IN (@@PO_EXT_IDS@@))
                        `,
                Placeholders: {
                    POExternalIds: '@@PO_EXT_IDS@@',
                    POInternalIds: '@@PO_INT_IDS@@',
                },
            }
        },
    };

    var Ids = {
        Scripts: {
            FC_BULK_EMAIL_JIT_POS_MR: 'custscript_fc_bulk_email_jit_pos_mr',
        },
        Deployments: {
            FC_BULK_EMAIL_JIT_POS_MR: 'custdeploy_fc_bulk_email_jit_pos_mr',
        },
        Parameters: {
            POS_TO_EMAIL_EXTERNAL_IDS: 'custscript_fc_am_pos_to_email_extids',
            POS_TO_EMAIL_INTERNAL_IDS: 'custscript_fc_am_pos_to_email_intids',
            SHIPPING_LABEL_JSON_FILE_ID: 'custscript_fc_am_ship_label_json_fileids',
            SESSION_OUTPUT_FOLDER_ID: 'custscript_fc_am_session_output_folderid',
        },

    };
    exports.Ids = Ids;


    var Content = {
        JIT_PO_EMAIL_SUBJECT: {
            Template: `Purchase Order {{poNumber}} for {{dueDate}} from Food Connects`,
            Placeholders: {
                DUEDATE: '{{dueDate}}',
                PONUMBER: '{{poNumber}}'
            }
        },

        JIT_PO_EMAIL_BODY: {
            Template: `
                    <p> Please find attached a Purchase Order from <strong>Food Connects</strong>, for pickup/delivery on {{dueDate}}. Shipping labels are attached in two formats: 1) 8x11' sheet labels for regular printers, 2) Single-roll 2x4' labels for label printers. </p>
                    <p> Please reach out to procurement@foodconnects.org ASAP with any questions you have.</p>
                    <p> Thank you! </p>
                    <p> Best, </p>
                    <p> The Procurement Team at Food Connects </p>
                `,
            Placeholders: {
                DUEDATE: '{{dueDate}}'
            }

        }

    };
    exports.Content = Content;


    function buildPOInfoQuery({
        poInternalIds = [],
        poExternalIds = [],
    } = {}) {

        let POInfoQuery = exports.Queries.POInfoQuery;

        let hasIntIds = (poInternalIds && poInternalIds.length > 0);
        let hasExtIds = (poExternalIds && poExternalIds.length > 0);

        if (hasIntIds && hasExtIds) {
            return POInfoQuery.SQL_IntExt
                .replace(POInfoQuery.Placeholders.POExternalIds, poExternalIds.join(','))
                .replace(POInfoQuery.Placeholders.POInternalIds, poInternalIds.join(','))
        } else if (hasIntIds) {
            return POInfoQuery.SQL_Int
                .replace(POInfoQuery.Placeholders.POInternalIds, poInternalIds.join(','))
        } else if (hasExtIds) {
            return POInfoQuery.SQL_Ext
                .replace(POInfoQuery.Placeholders.POExternalIds, poExternalIds.join(','))
        }
        else {
            return '';
        }
    }
    exports.buildPOInfoQuery = buildPOInfoQuery;



    var nowParameters = {
        POS_TO_EMAIL_EXTERNAL_IDS: [],
        POS_TO_EMAIL_INTERNAL_IDS: [918, 932],
        SHIPPING_LABEL_JSON_FILE_ID: {
            126: 29051,     // Against the Grain
            125: 29050,     // Snows Acquisition
        },
        SESSION_OUTPUT_FOLDER_ID: [],
    };


    let rowsRaw = [
        // JSON.stringify({
        //     key: 918,
        //     value: {
        //         poId: 918,        // Snows
        //         vendorid: 125,
        //         email: 'alex.mccullough@gmail.com',
        //         shippingLabelJsonFileId: 29050
        //         // sessionFolderId: sessionOutputFolderId,
        //     }
        // }),
        JSON.stringify(
            {
                poId: 932,
                vendorId: 125,
                email: 'alex.mccullough@gmail.com',
                shippingLabelJsonFileId: 29051,
                dueDate: '5/1/2023',
                displayId: 'PO-0000001',
            }

        )
    ];

    // let rowsStr = JSON.stringify(rowsRaw);

    let context = {
        key: 932,
        values: rowsRaw
    };

    //===============================================

    log.audit({ title: 'reduce - context', details: context });
    try {
        let poInternalId = context.key;
        let poInfo = JSON.parse(context.values[0]);


        let shippingLabelJsonFileId = poInfo.shippingLabelJsonFileId;        // Assuming a single value per poInternalId

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
            entityId: poInternalId,
            printMode: render.PrintMode.PDF
        });


        // Send email
        let emailRecipients = poInfo.email.split(/[,;]+/).map(email => email.trim());
        let formattedDueDate = dayjs(poInfo.dueDate).format('M/D/YYYY');

        // Build email subject
        // let emailSubject = FCJITBulkEmailLib.Content.JIT_PO_EMAIL_SUBJECT.Template;
        let emailSubject = exports.Content.JIT_PO_EMAIL_SUBJECT.Template;
        emailSubject = emailSubject.replace(
            // FCJITBulkEmailLib.Content.JIT_PO_EMAIL_SUBJECT.Placeholders.PONUMBER,
            exports.Content.JIT_PO_EMAIL_SUBJECT.Placeholders.PONUMBER,
            poInfo.displayId
        ).replace(
            exports.Content.JIT_PO_EMAIL_SUBJECT.Placeholders.DUEDATE,
            formattedDueDate
        );


        // Build email body
        // FIX: Add detail
        // let emailBody = FCJITBulkEmailLib.Content.JIT_PO_EMAIL_BODY.Template;
        let emailBody = exports.Content.JIT_PO_EMAIL_BODY.Template;
        emailBody = emailBody.replace(
            // FCJITBulkEmailLib.Content.JIT_PO_EMAIL_BODY.Placeholders.DUEDATE,
            exports.Content.JIT_PO_EMAIL_BODY.Placeholders.DUEDATE,
            formattedDueDate
        );
        // emailBody = emailBody.replace(JIT_PO_EMAIL_BODY.Placeholders.INSTRUCTIONS, emailInfo.instructions);

        let emailAttachments = [poPdf];
        if (shippingLabelPdf_1) { emailAttachments.push(shippingLabelPdf_1); }
        if (shippingLabelPdf_2) { emailAttachments.push(shippingLabelPdf_2); }

        email.send({
            author: runtime.getCurrentUser().id,
            recipients: emailRecipients,
            // cc: ,
            // bcc: ,
            body: emailBody,
            subject: emailSubject,
            attachments: emailAttachments,
            relatedRecords: {
                transactionId: poInternalId,
                entityId: poInfo.vendorId
            },
            // replyTo: ,
        });

        context.write({
            key: context.key,
            value: emailInfo
        });

    } catch (e) {
        log.error({ title: 'reduce - error', details: { 'context': context, 'error': e.message } });
    }
});