/**
 * Module Description...
 * @copyright 2023 Food Connects
 * @author Alex McCullough alex.mccullough@gmail.com
 * @description This Userevent script on the configuration auto-populates entities with multiple email recipients. It pulls email address from Contacts associated with the Transaction's associated Entity, filtered by whether that Contact has the "Email SO/Invoice/PO" flag set. 
 * 
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType UserEventScript
 */
 define([
    'N/record', 
    'N/search', 
    'N/runtime',
    '../Libraries/fc-main.library.module',

], function(record, search, runtime, FCLib) {

    function afterSubmit(context) {
        if ((context.type != context.UserEventType.CREATE) && (context.type != context.UserEventType.EDIT))
            return;

        log.debug('FC email script, start beforeSubmit');

        
        var entityId = context.newRecord.id;
        var entityType = context.newRecord.type;

        var rec = record.load({
            type: entityType,
            id: entityId,
            isDynamic: false
        });

        var entityMainEmail = rec.getValue({
            fieldId: 'email'
        });

        // var entityIsIndividual = rec.getValue({fieldId: 'type'}) == 'Individual';



        // var entityFields = search.lookupFields({
        //     type: search.Type.ENTITY,
        //     id: entityId,
        //     columns: ['email', 'type']
        // });

        // if (entityFields['type'] == 'Individual') {
        // if (entityIsIndividual == 'Individual') {
        //     return;
        // };

        var commTypeParam = runtime.getCurrentScript().getParameter('custscript_commtype_switch_entity');


        // var recEmails = rec.getValue({
        //     fieldId: 'email'
        // }).split(';');

        var entityEmails = entityMainEmail ? entityMainEmail.split(';') : [];
        
        // if (context.newRecord.type === k)
        
        try {
            var emailCbChecked = rec.getValue({
                fieldId: commTypeParam
            });

            // var emailCbChecked = search.lookupFields({
            //     type: search.Type.ENTITY,
            //     id: entityId,
            //     columns: [commTypeParam]
            // });

            log.debug("afterSubmit: emailCbChecked: " + emailCbChecked);

            if (FCLib.looksLikeNo(emailCbChecked)) {
                entityEmails = [];     
            } 

        } catch (e) {
            log.debug("No email switch found on Entity record: entityEmails: " + entityEmails);
        }

    
        try {
            var contactEmails = getEntityContactEmails(entityId, commTypeParam);
            var allEmails = contactEmails.concat(entityEmails);
            var dedupedEmails = dedupeList(allEmails);
    
            if (dedupedEmails) {
                log.debug("beforeSubmit: email list found -- updating field ");
                var comboEmailString = dedupedEmails.join(';');

                // Assign these email addresses to the Paystand Contacts field
                rec.setValue({
                    fieldId: 'custentity2',
                    value: comboEmailString,
                });
            }
            log.debug("beforeSubmit: Updated Email List: " + dedupedEmails)

            rec.save();

        } catch (e) {
            log.error('Error in beforeSubmit: ' + (e.name || e.getCode()) + ":" + (e.message || e.getDetails()));
        }
    
    }

    function getEntityContactEmails(entityId, commTypeParam){

        var companyFilter = [
            "company.internalid",
            search.Operator.IS,
            entityId
        ];
        var commTypeFilter = [
            commTypeParam,
            search.Operator.IS, 
            'T'
        ];

        var contactSearchObj = search.create({
            type: "contact",
            filters:
            [
               companyFilter, 
                'AND',
               commTypeFilter
            ],
            columns:
            [
               search.createColumn({name: "email", label: "Contact Email"})
            ]
         });
        
        var emailList = [];

        // Iterate over each page
        var myPagedData = contactSearchObj.runPaged({ pageSize: 1000 });
        myPagedData.pageRanges.forEach(function(pageRange){
            // Fetch the results on the current page
            var myPage = myPagedData.fetch({index: pageRange.index});

            // Iterate over the list of results on the current page
            // This iteration can probably be made faster. See Prolecto?
            myPage.data.forEach(function(result){
                var contactEmail = result.getValue({
                    name: 'email',
                    // join: 'company'
                });
                emailList.push(contactEmail);
            });
        });

        return emailList;
    }

    function dedupeList(myList) {
        var output = [];
        for(var i=0; i<myList.length; i++){
            if(output.indexOf(myList[i]) === -1) {  
                output.push(myList[i]);  
            }  
        }
        return output;
    }
     
    
    return {
        // beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});



   