
define([], main);

function main() {

    var exports = {
        Queries: {
            POInfoQuery: {
                SQL_IntExt: `
                    SELECT
                        Transaction.id as pointernalid,
                        Transaction.entity AS vendorinternalid,
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
                        Transaction.id as pointernalid,
                        Transaction.entity AS vendorinternalid,
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
                        Transaction.id as pointernalid,
                        Transaction.entity AS vendorinternalid,
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
            FC_BULK_EMAIL_JIT_POS_MR: 'customscript_fc_am_procbulk_jit_po_email',
        },
        Deployments: {
            FC_BULK_EMAIL_JIT_POS_MR: 'customdeploy_fc_am_procbulk_jit_po_email',
        },
        Parameters: {
            POS_TO_EMAIL_EXTERNAL_IDS: 'custscript_fc_am_pos_to_email_extids',
            POS_TO_EMAIL_INTERNAL_IDS: 'custscript_fc_am_pos_to_email_intids',
            SHIPPING_LABEL_JSON_FILE_IDS: 'custscript_fc_am_ship_label_json_fileids',
            SESSION_OUTPUT_FOLDER_ID: 'custscript_fc_am_session_output_folderid',
        },

    };
    exports.Ids = Ids;


    var Emails = {

        JIT_PO_EMAIL: {
            NSEmailTemplateId: 24,
            // Subject: {
            //     Template: `Purchase Order {{poNumber}} for {{dueDate}} from Food Connects`,
            //     Placeholders: {
            //         DUEDATE: '{{dueDate}}',
            //         PONUMBER: '{{poNumber}}'
            //     }
            // },
            // Body: {
            //     Template: `
            //     <p> Please find attached a Purchase Order from <strong>Food Connects</strong>, for pickup/delivery on {{dueDate}}. Shipping labels are attached in two formats: 1) 8x11' sheet labels for regular printers, 2) Single-roll 2x4' labels for label printers. </p>
            //     <p> Please reach out to procurement@foodconnects.org ASAP with any questions you have.</p>
            //     <p> Thank you! </p>
            //     <p> Best, </p>
            //     <p> The Procurement Team at Food Connects </p>
            //     `,
            //     Placeholders: {
            //         DUEDATE: '{{dueDate}}'
            //     }
            // },
        },

        SUMMARIZE_EMAIL: {
            Subject: {
                Template: `Food Connects - JIT POs Summary -- Sent on {{TIMESTAMP}}`,
                Placeholders: {
                    TIMESTAMP: '{{TIMESTAMP}}'
                }
            },
            Body: {
                Template: `
                     These JIT POs were successfully emailed: <br>
                        {{POS_SENT}}
                    
                    These JIT POs failed to email: <br>
                        {{POS_FAILED}}
                `,
                Placeholders: {
                    POS_SENT: '{{POS_SENT}}',
                    POS_FAILED: '{{POS_FAILED}}',
                }
            },
            RecipientsEmails: ['procurement@foodconnects.org', 'operations@foodconnects.org'],
            CcEmails: [],
            BccEmails: [],

        }
    };
    exports.Emails = Emails;



    // exports.Settings = Settings;


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


    return exports;
}

