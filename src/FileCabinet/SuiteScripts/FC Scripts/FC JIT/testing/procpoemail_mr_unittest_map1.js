    require(['N/record', 'SuiteScripts/FC Scripts/Libraries/fc-main.library.module.js'], function (record, FCLib) {



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
            POS_TO_EMAIL_INTERNAL_IDS: [918,932],
            SHIPPING_LABEL_JSON_FILE_ID: {
                126: 29051,     // Against the Grain
                125: 29050,     // Snows Acquisition
            },
            SESSION_OUTPUT_FOLDER_ID: [],
        };
        

        let rowRaw = {
            poId: 918,        // Snows
            vendorId: 125,
            email: 'alex.mccullough@gmail.com',
            shippingLabelJsonFileId: 29050
            // sessionFolderId: sessionOutputFolderId,
        };

        let rowStr = JSON.stringify(rowRaw);

        let context = {
            value: rowStr,
        };

        //===============================================

        // For now, assume PO Internal Ids, no external Ids
        log.debug({ title: 'map - result', details: context });

        let row = JSON.parse(context.value);
        let vendorInternalId = row.vendorId;
        // let poInternalId = row.poId;
        // let sessionFolderId = row.sessionFolderId;
    
        try {
            context.write({
                key: vendorInternalId,
                value: row
            });
    
        } catch (e) {
            log.error({ title: 'map - error', details: { 'context': context, 'error': e } });
        }
    });