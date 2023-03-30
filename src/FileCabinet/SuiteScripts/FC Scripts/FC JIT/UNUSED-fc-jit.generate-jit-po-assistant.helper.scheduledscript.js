/**
*@NApiVersion 2.x
*@NScriptType ScheduledScript
*/
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/task', 'N/file'],
    function (search, record, email, runtime, task, file) {
        function executeScript(context) {
            // if (context.type !== context.InvocationType.USER_INTERFACE) {
            //     return;
            // }

            try {
                // var tempVar = 'testing!';
                var tempCsvId = 28926;
                var csvFileId = runtime.getCurrentScript().getParameter({
                    name: 'custscript_fc_am_jitpo_import_csv_fileid'
                    // name: ThisAppLib.Ids.Parameters.JIT_PO_IMPORT_CSV_FILEID
                });

                var csvImportTask = task.create({
                    taskType: task.TaskType.CSV_IMPORT,
                    // FIX: Add pointer to CSV import
                });

                csvImportTask.mappingId = 'custimport_fc_static_jit_po_assistant_2';
                csvImportTask.importFile = file.load({
                    // id: csvFileId
                    id: tempCsvId
                });

                var csvImportTaskId = csvImportTask.submit();

                var csvTaskStatus = task.checkStatus({
                    taskId: csvImportTaskId
                });

                if (csvTaskStatus.status === task.TaskStatus.FAILED){
                    log.error({ title: 'Error in execute', details: csvTaskStatus.status });
                }


            } catch (e) {
                log.error({ title: 'Error in execute', details: e });
                // Send error email to user
                let currentUser = runtime.getCurrentUser();
                let currentUserEmail = currentUser.email;
                let currentUserFullName = currentUser.name;
                let emailSubject = 'Error in JIT PO Assistant';
                let emailBody = `An error occurred while attempting to import the JIT PO Assistant CSV file.
                    ${e.message}
                    Please contact your system administrator.`
                    ;

                email.send({
                    author: currentUser,
                    recipients: currentUserEmail,
                    body: emailBody,
                    subject: emailSubject,
                });

            }

        };



        return {
            execute: executeScript
        };
    }
); 