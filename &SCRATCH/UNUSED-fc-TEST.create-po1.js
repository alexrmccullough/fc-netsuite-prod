/**
*@NApiVersion 2.x
*@NScriptType ScheduledScript
*/
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/task', 'N/file'],
    function (search, record, email, runtime, task, file) {
        function executeScript(context) {

            var poInfo = {
                vendorId: '126',
                externalId: 'JITPO_001enwiewaoinef',
                memo: 'This is a test memo, brotha!',
                createdDate: new Date('3/29/2023'),
                dueDate: new Date('4/3/2023'),
                sendEmail: false,
            };

            var items = [
                { internalid: 'BAR001', quantity: 1, receiptlotnum: 'LOT001' },
                { itemid: 'BAR003', quantity: 1, receiptlotnum: 'LOT001' },
                { itemid: 'ATG001', quantity: 1, receiptlotnum: 'LOT001' },
                { itemid: 'ATG002', quantity: 1, receiptlotnum: 'LOT001' },
            ];



            var rec = record.create({
                type: record.Type.PURCHASE_ORDER,
                isDynamic: false
            });

            // Set body fields on the purchase order. Replace both of these
            // hardcoded values with valid values from your NetSuite account.
            rec.setValue({
                fieldId: 'entity',
                value: '126',
            });

            rec.setValue({
                fieldId: 'location',
                value: '1'
            });

            rec.setValue({
                fieldId: 'externalid',
                value: poInfo.externalId
            });

            rec.setValue({
                fieldId: 'memo',
                value: poInfo.memo
            });

            rec.setValue({
                fieldId: 'trandate',
                value: poInfo.createdDate
            });

            rec.setValue({
                fieldId: 'duedate',
                value: poInfo.dueDate
            });


            for (var i = 0; i < items.length; i++) {

                // Insert a line in the item sublist.
                rec.insertLine({
                    sublistId: 'item',
                    line: i
                });

                // Set the required fields on the line. Replace the hardcoded value
                // for the item field with a valid value from your NetSuite account.
                rec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i,
                    value: '114'
                });

                rec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i,
                    value: items[i].quantity
                });


                // Instantiate the subrecord. To use this method, you must 
                // provide the ID of the sublist, the number of the line you want  
                // to interact with, and the ID of the summary field. 

                var subrec = rec.getSublistSubrecord({
                    sublistId: 'item',
                    line: i,
                    fieldId: 'inventorydetail'
                });

                // Insert a line in the subrecord's inventory assignment sublist.
                subrec.insertLine({
                    sublistId: 'inventoryassignment',
                    line: 0
                });

                subrec.setSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'quantity',
                    line: 0,
                    value: 1
                });

                // Set the lot number for the item. Although this value is
                // hardcoded, you do not have to change it, because it doesn't 
                // reference a record in your account. For this example, 
                // the value can be any string.
                subrec.setSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'receiptinventorynumber',
                    line: 0,
                    value: 'lot123'
                });

            }

            // Save the record. Note that the subrecord object does
            // not have to be explicitly saved.

            try {
                var recId = rec.save();
                log.debug({
                    title: 'Record created successfully',
                    details: 'Id: ' + recId
                });

            } catch (e) {
                log.error({
                    title: e.name,
                    details: e.message
                });
            }
        }



        return {
            execute: executeScript
        };
    }
);


"{"next":"Next > ","_button":"","custpage_email_po_126":"on","nsapiFC":"","nsapiLI":"","custpage_email_po_125":"on","custpage_item_final_qty_125_BAR002":"0","custpage_item_final_qty_125_BAR001":"1","custpage_item_final_qty_126_ATG001":"2","externalid":"","_eml_nkey_":"6668932_SB1~-5~3~N","type":"scriptableassistant","nsapiPS":"","deploy":"1","nsapiRC":"","nsapiCT":"1680206382083","customwhence":"","nsapiVF":"","nsapiVD":"","sesstrackerid":"assistant_custom_1451_1","nsapiPI":"","nsbrowserenv":"istop = T","clickedback":"","nsapiLC":"","id":"","nsapiVL":"","custpage_po_memo_126":"","nsapiVI":"","custpage_hidden_persistent_params":"{ \"custpage_capture_sos_start_date\":\"3/1/2023\",\"custpage_capture_sos_end_date\":\"4/1/2023\",\"custpage_capture_po_delivery_due_date\":\"3/31/2023\"}", "custpage_po_memo_125": "", "nsapiPD": "", "curstep": "2", "nsapiSR": "", "whence": "", "entryformquerystring": "", "navigateto": "", "_csrf": "EekllYZNZ2WdiFudmePKYxQW-AqnvYwxXh-Exv-QAW1DCo4O9FPMLZPve1mowtTMtDKxqmbRApcRp7_npsxw-Fuv54xUWmvty1hJdPg5Ix9CTHT4qtwiamB8adPygLxXSyBwyd-lTqiBznF4edaaaSJVwh6mfj3HH2gMAzzWHNo=", "script": "1451", "formdisplayview": "NONE", "submitted": "T", "_multibtnstate_": "", "currentstepname": "custpage_step_initial_edit", "total_steps": "3", "selectedtab": "" } "