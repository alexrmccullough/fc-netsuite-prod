/**
 * Example Suitelet
 * 
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/ui/serverWidget', 'N/task', 'N/record', 'N/search'], function (ui, task, record, search) {

    var exports = {};

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var form = ui.createForm({ title: 'Hello World Suitelet' });
            alert("Entering GET");

            form.addSubmitButton({ label: 'Run Workflow with POST!' });
            var fieldgroupGeneral = form.addFieldGroup({
              id: 'fg_general', 
              label: 'General Settings'
            });

            var fieldgroupSODates = form.addFieldGroup({
              id: 'fg_sodates',
              label: 'Select SOs in Date Range for Labels...'
            });
            
            var poDueDate = form.addField({
              id: "select_po_duedate",
              label: "PO Due Date",
              type: ui.FieldType.DATE,
              container: 'fg_general'
            });
            var soDelivDateStart = form.addField({
              id: "select_so_deliverydate_start",
              label: "From",
              type: ui.FieldType.DATE,
              container: 'fg_sodates'
            });
            var soDelivDateEnd = form.addField({
              id: "select_so_deliverydate_end",
              label: "To",
              type: ui.FieldType.DATE, 
              container: 'fg_sodates'
            });

            // soDelivDateStart.updateLayoutType({
            //   layoutType: ui.FieldLayoutType.STARTROW
            // });
            // soDelivDateEnd.updateLayoutType({
            //   layoutType: ui.FieldLayoutType.STARTROW
            // });
            // soDelivDateStart.updateBreakType({
            //   breakType: ui.FieldLayoutType.STARTROW
            // });


            var sublist = form.addSublist({
                id : 'sublistid',
                type : ui.SublistType.LIST,
                label : 'Open JIT POs'
              });

              var fieldPrint = sublist.addField({
                id: 'custpage_rec_process',
                label: 'Process',
                type: ui.FieldType.CHECKBOX
              });
              var fieldId = sublist.addField({
                id: 'custpage_rec_id',
                label: 'Internal ID',
                type: ui.FieldType.TEXT
              });
              var fieldSupplierName = sublist.addField({
                id: 'custpage_rec_suppliername',
                label: 'Supplier Name',
                type: ui.FieldType.TEXT
              });
              var fieldDueDate = sublist.addField({
                id: 'custpage_rec_duedate',
                label: 'Due Date',
                type: ui.FieldType.DATE
              });
              var fieldPONum = sublist.addField({
                id: 'custpage_rec_ponum',
                label: 'PO Number',
                type: ui.FieldType.TEXT
              });
              var fieldAmount = sublist.addField({
                id: 'custpage_rec_amount',
                label: 'Amount',
                type: ui.FieldType.TEXT
              });
              var fieldQuantity = sublist.addField({
                id: 'custpage_rec_quantity',
                label: 'Quantity',
                type: ui.FieldType.TEXT
              });


            //empty Array to hold PO data
            var poIds = [];
            //run search to get PO  data
            var searchFilters = [
              ["type","anyof","PurchOrd"], 
              "AND", 
              ["vendorline.custentity_fc_zen_soft_com_vendor","is","T"], 
              "AND", 
              ["status","anyof","PurchOrd:B"]
            ];

            
            var purchaseorderSearchObj = search.create({
                type: "purchaseorder",
                filters: searchFilters,
                columns:
                [
                   search.createColumn({
                      name: "ordertype",
                      sort: search.Sort.ASC,
                      label: "Order Type"
                   }),
                   search.createColumn({name: "entity", label: "Name"}),
                   search.createColumn({name: "trandate", label: "Date"}),
                   search.createColumn({name: "tranid", label: "Document Number"}),
                   search.createColumn({name: "amount", label: "Amount"}),
                   search.createColumn({name: "quantity", label: "Quantity"})
                ]
             });
             var searchResultCount = purchaseorderSearchObj.runPaged().count;
             log.debug("purchaseorderSearchObj result count",searchResultCount);
             var counter = 0;
             purchaseorderSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results
                //add search column names as columns in the sublist
            
                //add each column value to the sublist
                log.debug("result", result);
                var customerName = result.getText('entity');
                var tranDate = result.getValue('trandate');
                sublist.setSublistValue({
                    id: 'custpage_rec_suppliername',
                    line: counter,
                    value: result.getText('entity')
                });
                sublist.setSublistValue({
                    id: 'custpage_rec_duedate',
                    line: counter,
                    value: result.getValue('trandate')
                });
                sublist.setSublistValue({
                    id: 'custpage_rec_ponum',
                    line: counter,
                    value: result.getValue('tranid')
                });
                sublist.setSublistValue({
                    id: 'custpage_rec_amount',
                    line: counter,
                    value: result.getValue('amount')
                });
                sublist.setSublistValue({
                    id: 'custpage_rec_quantity',
                    line: counter,
                    value: result.getValue('quantity')
                });
                counter++;
                return true;
             });

            
            //add buttons to sublist and form
            sublist.addMarkAllButtons();
            sublist.addRefreshButton();
            form.addResetButton({label: 'Reset'});


            // form.addButton({
            //     id: 'custpage_say_hello',
            //     label: 'Say Hello! WHAT!',
            //     functionName: 'sayHelloToUser'
            // });

            // form.addButton({
            //     id : 'runWorkflow1',
            //     label : 'Run a Workflow!',
            //     functionName: 'runWorkflow1'
            //  });
            // // form.clientScriptModulePath = 'SuiteScripts/test_suitelet1_handler.js';
                        
            // form.addField({
            //     id: 'custpage_test_field',
            //     label: 'Enter Hello...',
            //     type: ui.FieldType.TEXT,
            // });

            // form.clientScriptFileId = 24630;

            log.debug("Writing page.")

            context.response.writePage(form);

        } else if (context.request.method === 'POST') {

            log.debug("Suitelet is posting.")
            var workflowTask = task.create({taskType: task.TaskType.WORKFLOW_TRIGGER});
            // workflowTask.recordType = record.Type.INVENTORY_ITEM;
            // workflowTask.recordId = 26;
            workflowTask.workflowId = 320;
            var taskId = workflowTask.submit();
        }
    };

    exports.onRequest = onRequest;
    return exports;
});