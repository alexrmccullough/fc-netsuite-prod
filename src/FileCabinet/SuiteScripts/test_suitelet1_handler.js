  /**
   * Sample Client Script
   * @NApiVersion 2.x
   * @NModuleScope SameAccount
   * @NScriptType ClientScript
   */

define(['N/currentRecord'], function(currentRecord) {

    function pageInit(context){
        alert("pageInit dummy!");
    };

    function buttonFunc1() {
        var rec = currentRecord.get();
        rec.setValue({
            fieldId: 'custpage_text',
            value: 'This message is from the attached client script'
        });
    };

    function runWorkflow1() {
        alert("Entering runWorkflow1");
        log.debug("Clicked Run Workflow 1 button");

        // function initiateWorkflow() {
        //     var workflowInstanceId = workflow.initiate({
        //         workflowId: 320
        //     });
        // };

        // initiateWorkflow();


        //     var workflowInstanceId = workflow.initiate({
        //         workflowId: 320
        //     });


        var workflowInstanceId = workflow.trigger({
            recordType: 'inventoryitem',
            // recordId: 1234,
            workflowId: 'customworkflow_fc_updatecomboitemname1',
            // actionId: workflowaction25
          });

          
        // return {
        //     initiateWorkflow: initiateWorkflow
        // };
    };

    return {
        pageInit: pageInit,
        buttonFunc1: buttonFunc1,
        runWorkflow1: runWorkflow1
    };
});



// define(['N/currentRecord', 'N/workflow'], function(currentRecord, workflow) {


//   /* === ALEX'S CUSTOM FUNCTIONS === */
//     function runWorkflow1() {
//         alert("Entering runWorkflow1");
//         console.log.debug("Clicked Run Workflow button");

//         function initiateWorkflow() {
//             var workflowInstanceId = workflow.initiate({
//                 workflowId: 'customworkflow_fc_updatecomboitemname1'
//             });
//         };

//         initiateWorkflow();
//         // return {
//         //     initiateWorkflow: initiateWorkflow
//         // };
//     };

//     function sayHelloToUser(){
//         alert("Entering sayHelloToUser!");
//         var rec = currentRecord.get();
//         rec.setValue({
//             fieldId: 'custpage_say_hello',
//             value: 'Just stopping by to say hello!'
//         });
//     };

    
//   /* === VARS === */


//   /* === EVENTS FUNCTIONS === */


//   /**
//    * Page Init
//    * @param {*} context 
//    */
//   function pageInit(context) {
//     alert("pageInit Triggered!");
//     console.log("pageInit Triggered!");
//     return;
//   };


// //   /**
// //    * Line Init
// //    * @param {*} context 
// //    */
// //   function lineInit(context) {
// //     console.log("lineInit Triggered!");
// //     return;
// //   }

// //   /**
// //    * Post Sourcing
// //    * @param {*} context 
// //    */
// //   function postSourcing(context) {
// //     console.log("postSourcing Triggered!");
// //     return;
// //   }

// //   /**
// //    * Save Record
// //    * @param {*} context 
// //    */
// //   function saveRecord(context) {
// //     console.log("saveRecord Triggered!");
// //     return true; //Return true if you want to continue saving the record.
// //   }

// //   /**
// //    * Sublist Changed
// //    * @param {*} context 
// //    */
// //   function sublistChanged(context) {
// //     console.log("sublistChanged Triggered!");
// //   }

// //   /**
// //    * Validate Delete
// //    * @param {*} context 
// //    */
// //   function validateDelete(context) {
// //     console.log("validateDelete Triggered!");
// //     return true; //Return true if the line deletion is valid.
// //   }

// //   /**
// //    * Validate Field
// //    * @param {*} context 
// //    */
// //   function validateField(context) {
// //     console.log("validateField Triggered!");
// //     return true; //Return true to continue with the change.
// //   }

// //   /**
// //    * Validate Insert
// //    * @param {*} context 
// //    */
// //   function validateInsert(context) {
// //     console.log("validateInsert Triggered!");
// //     return true; //Return true if the line insertion is valid.
// //   }

// //   /**
// //    * Validate Line
// //    * @param {*} context 
// //    */
// //   function validateLine(context) {
// //     console.log("validateLine Triggered!");
// //     return true; //Return true if the line is valid.
// //   }

// //   /**
// //    * Field Changed
// //    * @param {*} context 
// //    */
// //   function fieldChanged(context) {
// //     console.log("fieldChanged Triggered!");
// //     return;
// //   }

//   /**
//    * Export Events
//    */
//   var exports = {};
//   exports.pageInit = pageInit;
// //   exports.lineInit = lineInit;
// //   exports.postSourcing = postSourcing;
// //   exports.saveRecord = saveRecord;
// //   exports.sublistChanged = sublistChanged;
// //   exports.validateDelete = validateDelete;
// //   exports.validateField = validateField;
// //   exports.validateInsert = validateInsert;
// //   exports.validateLine = validateLine;
// //   exports.fieldChanged = fieldChanged;
//   exports.runWorkflow1 = runWorkflow1;
//   exports.sayHelloToUser = sayHelloToUser;
//   return exports;

// });
