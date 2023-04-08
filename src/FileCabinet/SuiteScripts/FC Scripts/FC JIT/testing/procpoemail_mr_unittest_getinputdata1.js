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
        
            // FIX: Can we go straight to context.parameters?
        // log.debug({ title: 'getInputData', details: { posToEmailExternalIdsRaw: posToEmailExternalIdsRaw } });

        // var currentScript = runtime.getCurrentScript();

        // let posToEmailExternalIdsRaw = currentScript.getParameter({
        //     name: exports.Ids.Parameters.POS_TO_EMAIL_EXTERNAL_IDS
        // });

        // let posToEmailInternalIdsRaw = currentScript.getParameter({
        //     name: exports.Ids.Parameters.POS_TO_EMAIL_INTERNAL_IDS
        // });

        // let shippingLabelJsonFileId = currentScript.getParameter({
        //     name: exports.Ids.Parameters.SHIPPING_LABEL_JSON_FILE_ID
        // });

        // let sessionOutputFolderId = currentScript.getParameter({
        //     name: exports.Ids.Parameters.SESSION_OUTPUT_FOLDER_ID
        // });


        // let posToEmailExternalIds = 

        // Accepting both internal and external IDs for POs to email.
        //    We will use both lists, if provided. But first we have to eliminate duplicates. 
        //    Build a single list of internal IDs to use for sending.posToEmailInternalIdsRaw
        let poInternalIds = null;
        let poExternalIds = null;

        if (nowParameters.POS_TO_EMAIL_INTERNAL_IDS) {
            poInternalIds = new Set(nowParameters.POS_TO_EMAIL_INTERNAL_IDS);    // FIX: Change to JSON.parse
        }
        if (nowParameters.POS_TO_EMAIL_EXTERNAL_IDS) {
            poExternalIds = new Set(nowParameters.POS_TO_EMAIL_EXTERNAL_IDS);
        }

        // Expected format: { vendorname: file_id}
        let shippingLabelJsonFileIds = nowParameters.SHIPPING_LABEL_JSON_FILE_ID;    // FIX; CHange to parsing real parameters


        // Validate requirements:
        //   Required: 
        //      - At least one of posToEmailInternalIdsRaw or posToEmailExternalIdsRaw
        //      - shippingLabelJsonFileId
        //   Optional: 
        //      - sessionOutputFolderId
        if (!shippingLabelJsonFileIds) {
            throw new Error('Missing required parameter: shippingLabelJsonFileId');
        }
        if (!poInternalIds && !poExternalIds) {
            throw new Error('Missing required parameter: posToEmailInternalIdsRaw or posToEmailExternalIdsRaw');
        }
        

        // If we have a list of PO external IDs, we need to convert them to internal IDs
        let sqlQuery = exports.buildPOInfoQuery({
            poInternalIds: Array.from(poInternalIds),
            poExternalIds: Array.from(poExternalIds),
        });

        let queryResults = FCLib.sqlSelectAllRows(sqlQuery);

        
        
        // We will pass rows of the following format to the map function:
        //    { id: 123, vendorid: 123, email: alex.mccullough@gmail, shippingLabelJsonFileId: 456 }
        //    Note that the shipping label JSON file ID is the same for all rows.
        let rows = [];
        for (let result of queryResults) {
            rows.push({
                poId: result.pointernalid,
                vendorid: result.vendorinternalid,
                email: result.email,
                shippingLabelJsonFileId: shippingLabelJsonFileIds[result.vendorinternalid],
                // sessionFolderId: sessionOutputFolderId,
            });
        }

        return rows;
    });