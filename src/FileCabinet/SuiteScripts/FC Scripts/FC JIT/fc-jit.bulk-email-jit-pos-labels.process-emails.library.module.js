var query,
    task,
    runtime,
    email;


define(['N/query', 'N/task', 'N/runtime', 'N/email'], main);

function main(queryModule, taskModule, runtimeModule, emailModule) {
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;

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
        Fields: {
        },
        Folders: {
        },
        Files: {
        },
        Parameters: {
            POS_TO_EMAIL_EXTERNAL_IDS: 'custscript_fc_am_jitpo_pos_to_email_extids',
            POS_TO_EMAIL_INTERNAL_IDS: 'custscript_fc_am_jitpo_pos_to_email_intids',
            SHIPPING_LABEL_JSON_FILE_ID: 'custscript_fc_am_jitpo_shipping_label_json_file_id',
            TARGET_SOS_START_DATE: 'custscript_fc_am_jitpo_target_sos_start_date',
            TARGET_SOS_END_DATE: 'custscript_fc_am_jitpo_target_sos_end_date',
            SESSION_OUTPUT_FOLDER_ID: 'custscript_fc_am_jitpo_session_output_folder_id',
        },
        CSVImportMappings: {
        }

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

