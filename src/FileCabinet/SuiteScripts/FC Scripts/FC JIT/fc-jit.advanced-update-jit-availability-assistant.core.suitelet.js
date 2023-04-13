/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var
    file,
    https,
    log,
    page,
    query,
    record,
    render,
    runtime,
    scriptURL,
    url,
    FCLib,
    ThisAppLib,
    Papa;
// assistant, 
// stepSelectOptions;


define([
    'N/file',
    'N/https',
    'N/log',
    'N/ui/message',
    'N/query',
    'N/record',
    'N/render',
    'N/runtime',
    'N/ui/serverWidget',
    'N/url',
    '../Libraries/fc-main.library.module.js',
    './fc-jit.advanced-update-jit-availablity.library.module',
    '../Libraries/papaparse.min.js'
], main);


function main(fileModule, httpsModule, logModule, messageModule, queryModule, recordModule, renderModule, runtimeModule, serverWidgetModule, urlModule, fcLibModule, fcJITUploadLibModule, papaparseModule) {
    file = fileModule;
    https = httpsModule;
    log = logModule;
    message = messageModule;
    query = queryModule;
    record = recordModule;
    render = renderModule;
    runtime = runtimeModule;
    serverWidget = serverWidgetModule;
    url = urlModule;
    FCLib = fcLibModule;
    ThisAppLib = fcJITUploadLibModule;
    Papa = papaparseModule;

    return {

        onRequest: function (context) {
            scriptURL = url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, returnExternalURL: false });

            var assistant = serverWidget.createAssistant({
                title: 'JIT Upload Assistant',
                hideNavBar: false
            });

            var step1SelectCsvFiles = assistant.addStep({
                id: 'custpage_step_select_csv_files',
                label: 'Select CSV Files',
            });

            var step2ReviewCsvParse = assistant.addStep({
                id: 'custpage_step_review_csv_parse',
                label: 'Review CSV Parse',
            });

            var step3SelectUpdateOptions = assistant.addStep({
                id: 'custpage_step_select_update_options',
                label: 'Select Update Options',
            });

            var step4FinalChangeReview = assistant.addStep({
                id: 'custpage_step_final_change_review',
                label: 'Final Change Review',
            });


            assistant.isNotOrdered = false;

            var steps = [
                null,
                step1SelectCsvFiles,
                step2ReviewCsvParse,
                step3SelectUpdateOptions,
                // step4FinalChangeReview,
                null
            ];

            var stepWriteFunc = [
                writeCancel,
                writeStep1SelectCsvFiles,
                writeStep2ReviewCsvParse,
                writeStep3SelectUpdateOptions,
                // writeStep4FinalChangeReview,
                writeResult
            ];


            if (context.request.method === 'GET') //GET method means starting the assistant
            {
                stepWriteFunc[1](context, assistant);
                assistant.currentStep = steps[1];
                context.response.writePage(assistant);

            } else { //POST method - process step of the assistant

                if (assistant.getLastAction() == "next" || assistant.getLastAction() == "back") {
                    assistant.currentStep = assistant.getNextStep();
                    let curStepNum = assistant.currentStep.stepNumber;
                    // assistant.sendRedirect(response);
                    stepWriteFunc[curStepNum](context, assistant);
                    context.response.writePage(assistant);
                }

                else if (assistant.getLastAction() == 'finish') {
                    let finishedHtml = writeResult(context, assistant);
                    context.response.write(finishedHtml);
                    //use   nlapiSetRedirectURL if you want to redirect user to any page
                }

                else if (assistant.getLastAction() == 'cancel') {
                    let cancelHtml = writeCancel(context, assistant);
                    context.response.write(cancelHtml);

                }

                else {
                    // FIX: Write unknown error
                }
            }
        }
    }



    function writeStep1SelectCsvFiles(context, assistant) {
        // Get the list of files currently in the Input folder and display
        let sql = ThisAppLib.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID.BuildQuery(
            ThisAppLib.IO.FolderIds.INPUT,
        );
        let csvFileQueryResults = FCLib.sqlSelectAllRows(sql);



        let tableHtml = '';
        if (!csvFileQueryResults || csvFileQueryResults.length === 0) {
            tableHtml = '<p>No csv files found in the Input folder.</p>';
            log.debug({ title: 'parseJITCSVs - no files found', details: { 'folderId': folderId } });
        }
        else {
            tableHtml = buildCsvSelectList(context, csvFileQueryResults);
        }

        // Add a field group and an inlinehtml field to display the table of files
        var fileTableFieldGroup = assistant.addFieldGroup({
            id: ThisAppLib.Settings.Ui.Step1.FieldGroups.FILE_TABLE_FIELD_GROUP_ID,
            label: ThisAppLib.Settings.Ui.Step1.FieldGroups.FILE_TABLE_FIELD_GROUP_LABEL
        });

        var fileTableField = assistant.addField({
            id: ThisAppLib.Settings.Ui.Step1.Fields.FILE_TABLE_FIELD_ID,
            type: serverWidget.FieldType.INLINEHTML,
            label: ThisAppLib.Settings.Ui.Step1.Fields.FILE_TABLE_FIELD_LABEL,
            container: ThisAppLib.Settings.Ui.Step1.FieldGroups.FILE_TABLE_FIELD_GROUP_ID
        });
        fileTableField.defaultValue = tableHtml;


        function buildCsvSelectList(context, csvQueryResults) {
            let fieldDefs = ThisAppLib.Settings.Ui.Step1.Sublists.FILE_TABLE.Fields;
            let formattedRows = FCLib.formatQueryRowsOnFieldDefs(fieldDefs, csvQueryResults);
            let tableHeaders = Object.keys(fieldDefs).map((key) => fieldDefs[key].Label);

            let selectCheckboxInputSpecs = {
                htmlElem: 'checkbox',
                valueSourceField: fieldDefs.FileId.Label,
                checkedSourceField: fieldDefs.Select.Label,
                fieldDisplayName: fieldDefs.Select.Label,
                idPrefixPart1Str: ThisAppLib.Settings.Ui.Step1.Parameters.SELECT_CSV_CHECKBOX_ID.prefix,
                idPrefixPart2Str: '',
                idUniqueSuffixSourceField: fieldDefs.FileId.Label,
            };

            tableHtml = FCLib.convertObjToHTMLTableStylized({
                fields: tableHeaders,
                data: formattedRows,
                specialElems: [selectCheckboxInputSpecs],
                hideFields: {
                    [fieldDefs.Select.Label]: true,
                },
            });

            return tableHtml;
        }
    }



    function writeStep2ReviewCsvParse(context, assistant) {
        let params = context.request.parameters;

        // Add a field group for the error results
        var errorResultsFieldGroup = assistant.addFieldGroup({
            id: ThisAppLib.Settings.Ui.Step2.FieldGroups.CSV_ERROR_RESULTS_FIELD_GROUP_ID,
            label: ThisAppLib.Settings.Ui.Step2.FieldGroups.CSV_ERROR_RESULTS_FIELD_GROUP_LABEL
        });

        // Add a field group for the item update results
        var itemUpdateResultsFieldGroup = assistant.addFieldGroup({
            id: ThisAppLib.Settings.Ui.Step2.FieldGroups.CSV_SUCCESS_RESULTS_FIELD_GROUP_ID,
            label: ThisAppLib.Settings.Ui.Step2.FieldGroups.CSV_SUCCESS_RESULTS_FIELD_GROUP_LABEL
        });

        // Add a field to display the results of the file validation
        var errorResultsField = assistant.addField({
            id: ThisAppLib.Settings.Ui.Step2.Fields.CSV_ERROR_RESULTS_FIELD_ID,
            type: serverWidget.FieldType.INLINEHTML,
            label: ThisAppLib.Settings.Ui.Step2.Fields.CSV_ERROR_RESULTS_FIELD_LABEL,
            container: ThisAppLib.Settings.Ui.Step2.FieldGroups.CSV_ERROR_RESULTS_FIELD_GROUP_ID
        });
        errorResultsField.updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
        });
        errorResultsField.updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTCOL
        });

        // Add a field to display the results of the item update
        var successfulResultsField = assistant.addField({
            id: ThisAppLib.Settings.Ui.Step2.Fields.CSV_SUCCESS_RESULTS_FIELD_ID,
            type: serverWidget.FieldType.INLINEHTML,
            label: ThisAppLib.Settings.Ui.Step2.Fields.CSV_SUCCESS_RESULTS_FIELD_LABEL,
            container: ThisAppLib.Settings.Ui.Step2.FieldGroups.CSV_SUCCESS_RESULTS_FIELD_GROUP_ID
        });
        successfulResultsField.updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
        });
        successfulResultsField.updateBreakType({
            breakType: serverWidget.FieldBreakType.STARTCOL
        });


        // Add a hidden field to hold the ID of the JIT CSV upload file
        var successItemCSVIdField = assistant.addField({
            id: ThisAppLib.Settings.Ui.Step2.Parameters.SUCCESSFUL_ITEM_CACHE_FILE_FIELD_ID,
            type: serverWidget.FieldType.INTEGER,
            label: ThisAppLib.Settings.Ui.Step2.Fields.SUCCESSFUL_ITEM_CACHE_FILE_FIELD_LABEL
        });
        successItemCSVIdField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });



        // Get the list of selected CSV file ids to start parsing
        let csvFileIdsSelected = Object.entries(params).reduce(
            (matched, [paramName, value]) => {
                if (ThisAppLib.Settings.Ui.Step1.Parameters.SELECT_CSV_CHECKBOX_ID.looksLike(paramName)) {
                    return [...matched, value];
                }
                return matched;
            }, []
        );

        let parsedCSVs = parseJITCSVs(context, csvFileIdsSelected);
        if (!parsedCSVs) {
            return false;
        }

        // We want to display a summary of errors and successful parsing. 
        //   We will need to pull basic item data from the database so that we can verify
        //   whether the items exist. Otherwise, we're not doing any calculations yet. 

        // First, query NS for an overall JIT item summary
        let sqlJitItemList = ThisAppLib.Queries.GET_LIST_JIT_ITEMS.BuildQuery();
        let jitItemList = FCLib.sqlSelectAllRowsIntoDict(
            sqlJitItemList,
            ThisAppLib.Queries.GET_LIST_JIT_ITEMS.FieldSet1.ItemName.fieldid
        );


        let validationOutput = validateCSVData(context, parsedCSVs, jitItemList);
        let successfulItemsParsed = validationOutput.itemsToUpdate;
        let sessionSubfolder = createSessionSubfolder(context);


        // Build and save a CSV file of the successful items. We'll pass this to the next step
        let successfulItemsCsvString = buildParseSuccessCsvString(
            context,
            successfulItemsParsed,
        );

        let successfulItemsCsvFileId = FCLib.writeFileToFileCabinet(
            'csv',
            ThisAppLib.CsvFormats.ITEMS_TO_UPDATE_CSV.FileName,
            successfulItemsCsvString,
            sessionSubfolder.sessionResultsFolderId
        );


        // Build HTML for error tables
        let errorTables = validationOutput.validatedFiles.map(function (parsedFile) {
            return parsedFile.getErrorCSV();
        });

        let errorHtml = '';

        for (let errorTable of errorTables) {
            if (errorTable && errorTable.contents && !errorTable.isEmpty) {
                let fileId = FCLib.writeFileToFileCabinet(
                    'csv',
                    errorTable.outputFileName,
                    errorTable.contents,
                    sessionSubfolder.sessionResultsFolderId
                );

                // Build HTML for table
                //   Yes, we are re-parsing the CSV. This is because it's too messy to try to do it all sequentially. Better readability.
                let fileUrl = FCLib.getFileUrl(fileId);
                let fileNameHtml = fileUrl ? `<a href="${fileUrl}" target="_blank">${errorTable.sourceFileName}</a>` : errorTable.outputFileName;

                let thisHTMLTable = FCLib.convertCSVStringToHTMLTableStylized({
                    csvString: errorTable.contents,
                    headerBGColor: '#c23041',
                });
                errorHtml += `<h3>${fileNameHtml}</h3>`;
                errorHtml += thisHTMLTable;
            }
        }


        // Build HTML selection table for successful items
        let successCsvUrl = FCLib.getFileUrl(successfulItemsCsvFileId);
        let successCsvLinkHtml = successCsvUrl ? `<a href="${successCsvUrl}" target="_blank">Download CSV</a>` : '';

        // Run query to get details for successful itmes
        let successItemNames = Object.keys(successfulItemsParsed);
        let sqlGetItemDetails = ThisAppLib.Queries.GET_JIT_ITEM_DETAILS.BuildQuery(successItemNames);

        let itemDetailQueryResults = FCLib.sqlSelectAllRows(sqlGetItemDetails);

        // Inject the new JIT item quantities from the CSV uploads into the query results
        let newJitQtyFieldId = ThisAppLib.Settings.Ui.Step2.Sublists.SUCCESS_ITEM_TABLE.Fields.NewJitStartQty.QuerySource.fieldid;
        let itemNameFieldId = ThisAppLib.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemName.fieldid;

        for (let row of itemDetailQueryResults) {
            let itemName = row[itemNameFieldId];
            row[newJitQtyFieldId] = successfulItemsParsed[itemName];
        }

        let successHtml = buildCsvItemSelectList(context, itemDetailQueryResults);


        // Write the HTML to the Form fields
        errorResultsField.defaultValue = errorHtml;
        successfulResultsField.defaultValue = successHtml;

        // Pass the successful items CSV file ID to the next step as a param
        successItemCSVIdField.defaultValue = successfulItemsCsvFileId;


        function buildParseSuccessCsvString(
            context,
            itemsParsed,
        ) {
            let fields = [
                ThisAppLib.CsvFormats.ITEMS_TO_UPDATE_CSV.FieldSet1.ItemName.label,
                ThisAppLib.CsvFormats.ITEMS_TO_UPDATE_CSV.FieldSet1.JitStartQuantity.label,
            ];

            let data = [];

            for (let [itemName, jitStartQty] of Object.entries(itemsParsed)) {
                data.push([itemName, jitStartQty]);
            }

            let csvString = Papa.unparse({
                fields: fields,
                data: data,
            });

            return csvString;
        }


        function buildCsvItemSelectList(context, itemDetailQueryResults) {
            let fieldDefs = ThisAppLib.Settings.Ui.Step2.Sublists.SUCCESS_ITEM_TABLE.Fields;
            let formattedRows = FCLib.formatQueryRowsOnFieldDefs(fieldDefs, itemDetailQueryResults);
            let tableHeaders = Object.keys(fieldDefs).map((key) => fieldDefs[key].Label);

            let selectCheckboxInputSpecs = {
                htmlElem: 'checkbox',
                valueSourceField: fieldDefs.ItemInternalId.Label,
                checkedSourceField: fieldDefs.Select.Label,
                fieldDisplayName: fieldDefs.Select.Label,
                idPrefixPart1Str: ThisAppLib.Settings.Ui.Step2.Parameters.SELECT_ITEM_CHECKBOX_ID.prefix,
                idPrefixPart2Str: '',
                idUniqueSuffixSourceField: fieldDefs.ItemInternalId.Label,
            };

            tableHtml = FCLib.convertObjToHTMLTableStylized({
                fields: tableHeaders,
                data: formattedRows,
                specialElems: [selectCheckboxInputSpecs],
                hideFields: {
                    [fieldDefs.Select.Label]: true,
                },
            });

            return tableHtml;
        }

    }

    function writeStep3SelectUpdateOptions(context, assistant) {
        let params = context.request.parameters;

        // Load the CSV file of successful items from the previous step
        let successItemCsvId = params[ThisAppLib.Settings.Ui.Step2.Parameters.SUCCESSFUL_ITEM_CACHE_FILE_FIELD_ID];
        let successItemCsvContents = FCLib.getTextFileContents(successItemCsvId);

        let successItemCsvParsed = Papa.parse(successItemCsvContents, {
            header: true,
        });

        // Query NS for the vendors matching the items in the CSV file.
        //      These vendors will make up our first of two tables. 

        // Get the list of items from the CSV file
        let itemIds = successItemCsvParsed.data.map((row) =>
            row[ThisAppLib.CsvFormats.ITEMS_TO_UPDATE_CSV.FieldSet1.ItemInternalId.label]
        );

        // See jit_availability_mockup.xls file

        // Build two tables
        //   Table 1: Vendors with items in the CSV uploads
        //   Table 2: Vendors with items NOT in the CSV uploads
        //  Each table will have the following interactive columns:
        //      - No action (checkbox): default YES for vendors w/CSV, NO for vendors w/o CSV
        //      - Radio button (3 options):
        //          - Zero Jit Items
        //          - Zero JIT Items + Apply Standing JIT Avail
        //          - Apply Standing JIT Avail w/o Zeroing 
        //      - Checkbox: Subtract Future SOs from Updated Values 

        // Query NS for the vendors matching the items in the CSV file.
        let sqlVendorsWithCsvItems = ThisAppLib.Queries.GET_JIT_VENDORS_WITH_CSV_ITEMS.BuildQuery(itemIds);
        let vendorsWithCsvItemsQueryResults = FCLib.sqlSelectAllRows(sqlVendorsWithCsvItems);

        // Query NS for the vendors NOT matching the items in the CSV file.
        let sqlVendorsWithoutCsvItems = ThisAppLib.Queries.GET_JIT_VENDORS_WITHOUT_CSV_ITEMS.BuildQuery(itemIds);
        let vendorsWithoutCsvItemsQueryResults = FCLib.sqlSelectAllRows(sqlVendorsWithoutCsvItems);


        // Build interactive Input fields for the VENDORS-WITH-CSV table
        let table1FieldDefs = ThisAppLib.Settings.Ui.Step3.Sublists.SUCCESS_ITEM_TABLE.Fields;
        let formattedRows = FCLib.formatQueryRowsOnFieldDefs(table1FieldDefs, vendorsWithCsvItemsQueryResults);
        let tableHeaders = Object.keys(table1FieldDefs).map((key) => table1FieldDefs[key].Label);


        // PICK UP HERE

        let table1ActionRbSpecsCol1 = {
            htmlElem: 'radio',
            valueSourceField: fieldDefs.VendorId.Label,
            checkedSourceField: fieldDefs.Select.Label,
            fieldDisplayName: fieldDefs.Select.Label,
            idPrefixPart1Str: ThisAppLib.Settings.Ui.Step3.Parameters.TABLE1_ACTION_RADIOBUTTON.prefix,
            idPrefixPart2Str: '',
            idUniqueSuffixSourceField: fieldDefs.VendorId.Label,
        };

        let table1ActionRbSpecsCol2 = {
            htmlElem: 'radio',
            valueSourceField: fieldDefs.VendorId.Label,
            checkedSourceField: fieldDefs.Select.Label,
            fieldDisplayName: fieldDefs.Select.Label,
            idPrefixPart1Str: ThisAppLib.Settings.Ui.Step3.Parameters.TABLE1_ACTION_RADIOBUTTON.prefix,
            idPrefixPart2Str: '',
            idUniqueSuffixSourceField: fieldDefs.VendorId.Label,
        };
        
        let table1ActionRbSpecsCol3 = {
            htmlElem: 'radio',
            valueSourceField: fieldDefs.VendorId.Label,
            checkedSourceField: fieldDefs.Select.Label,
            fieldDisplayName: fieldDefs.Select.Label,
            idPrefixPart1Str: ThisAppLib.Settings.Ui.Step3.Parameters.TABLE1_ACTION_RADIOBUTTON.prefix,
            idPrefixPart2Str: '',
            idUniqueSuffixSourceField: fieldDefs.VendorId.Label,
        };


        // 



    }


    function writeStep4FinalChangeReview(context, assistant) {

    }



    function writeResult(context, assistant) {
        // Launch the MR task using the JIT CSV upload ID passed as a parameter
        // Display a message to the user that the task has been launched
        // Display a link to the task status page
        let itemUploadCSVId = context.request.parameters[ThisAppLib.Settings.Ui.Parameters.ITEM_UPLOAD_CSV_FIELD_ID];

        let mrTaskId = ThisAppLib.submitItemUpdateMRJob(
            itemUploadCSVId
        );

        // if (Object.keys(itemUpdateMaster).length > 0) {
        //     let mrTaskId = submitItemUpdateMRJob(
        //         context,
        //         itemUpdateData,
        //         itemUpdateMaster,
        //         jitItemSnapshot,
        //         false,
        //         sessionSubfolder.sessionResultsFolder.id
        //     );

        // }

        // Resolve URL for MR Task monitoring suitelet


        context.response.write(
            `Launching update script using itemUploadCSVId: ${itemUploadCSVId}.
           MR Task ID: ${mrTaskId}
           Monitor the status of the task at: `
        );

    }

    function writeCancel(context) {
        return;
    }




    function getJITItemsOnFutureSOs(context, itemIds) {
        let sql = ThisAppLib.Queries.GET_JIT_ITEMS_ON_FUTURE_SOS;
        // let queryParams = [itemIds];
        let items = FCLib.sqlSelectAllRowsIntoDict(sql, 'itemId');
        return items;
    }




    function validateCSVData(context, parsedFiles, nsItemData) {
        var dupesDetected = {};

        for (let thisFile of parsedFiles) {
            let isValidFile = true;

            // Test whether file has all required fields
            // Error if file doesn't have all required fields
            for (let reqField of ThisAppLib.CsvFormats.INPUT_JIT_ITEM_CSV.GetFileHeaders()) {
                if (!(thisFile.parsingMeta.fields.includes(reqField))) {
                    thisFile.addError({
                        origRow: -1,
                        errorMsg: `File is missing required field: ${reqField}`,
                    });
                    isValidFile = false;
                }
            }

            // If csv data has no rows, create an error output row using the returned info from PapaParse
            if (!thisFile.parsedData.length) {
                thisFile.addError({
                    origRow: -1,
                    errorMsg: `File has no data or parsing failed completely with no feedback.`,
                });
                isValidFile = false;
            }

            for (let err of thisFile.parsingErrors) {
                thisFile.addError({
                    origRow: err.row,
                    errorMsg: `${err.code}: ${err.message}`,
                });
            }

            if (!isValidFile) {
                continue;
            } else { // Validate the rest of the file
                // Validate all data rows 
                for (let i = 0; i < thisFile.parsedData.length; i++) {
                    let curLine = thisFile.parsedData[i];

                    // Skip if row has pre-set error flag (we've already logged a PapaParse error)
                    if (thisFile.isErrorRow(i)) {
                        continue;
                    }

                    try {
                        let itemId = curLine[ThisAppLib.CsvFormats.INPUT_JIT_ITEM_CSV.RequiredFieldSet.ExternalId];
                        let jitStartQty = curLine[ThisAppLib.CsvFormats.INPUT_JIT_ITEM_CSV.RequiredFieldSet.JitStartQty];

                        // Skip if Item ID is not recognized
                        if (!(itemId in nsItemData)) {
                            throw new LineValidationError(
                                `Unrecognized Item ID. Doesn't exist in database: ${itemId}`
                            );
                        }

                        // Skip if item is a duplicate.
                        if (itemId in thisFile.itemsToUpdate || itemId in dupesDetected) {
                            if (!(itemId in dupesDetected)) { dupesDetected[itemId] = []; }

                            dupesDetected[itemId] = true;

                            // We will handle knock-on duplicate errors as a final summary step. 
                            continue;
                        }

                        // Skip if invalid start qty
                        if (isNaN(jitStartQty)) {
                            throw new LineValidationError(
                                `Invalid number in ${ThisAppLib.CsvFormats.INPUT_JIT_ITEM_CSV.RequiredFieldSet.JitStartQty}: ${jitStartQty}`
                            );
                        }

                        // LINE PASSED validation. Let's add it to this file's Items to Update
                        thisFile.addItemToUpdate({
                            lineData: curLine,
                            jitStartQty: jitStartQty,
                            origRow: i
                        });


                    } catch (e) {
                        // log.debug({ title: 'validateCSVData - error', details: { 'error': e } });
                        thisFile.addError({
                            origRow: i,
                            errorMsg: e.message,
                        });
                    }
                }
            }
        }

        // Review ParsedFiles for all duplicate errors
        //   For each ItemID with duplicates, build a list of places where the duplicate was found
        //   Delete the Item from the list of items to update
        let dupeLocations = {};

        for (let itemId in dupesDetected) {
            thisItemDupes = [];

            for (let parsedFile of parsedFiles) {
                if (itemId in parsedFile.itemsToUpdate) {
                    thisItemDupes.push({
                        parsedFile: parsedFile,
                        origRow: parsedFile.itemsToUpdate[itemId].origRow,
                    });

                    // Remove this item from the list of items to update
                    delete parsedFile.itemsToUpdate[itemId];
                }
            }
            dupeLocations[itemId] = thisItemDupes;
        }

        // Now we're ready to construct detailed error messages that point to all locatinos of every duplicate item
        for (let itemId in dupeLocations) {
            // Build list of file names + row numbers where the duplicate was found
            let itemDupStr = '';
            for (let dup of dupeLocations[itemId]) {
                itemDupStr += `${dup.parsedFile.fileName} - Row ${dup.origRow}`;
                itemDupStr += '\n';
            }

            // Add error message to each file that had the duplicate
            for (let dup of dupeLocations[itemId]) {
                dup.parsedFile.addError({
                    origRow: dup.origRow,
                    errorMsg: `This item is a duplicate: ${itemId}
                            Found in the following locations:
                            ${itemDupStr}`,
                });
            }
        }

        // Consolidate all items to update into a single object
        let itemsToUpdate = {};
        for (let parsedFile of parsedFiles) {
            Object.assign(itemsToUpdate, parsedFile.itemsToUpdate);
        }

        return {
            validatedFiles: parsedFiles,
            itemsToUpdate: itemsToUpdate
        };
    }


    function createSessionSubfolder(context, date = new Date()) {
        const curDateTimeStr = FCLib.getStandardDateTimeString1(date);
        var resultsFolderName = ThisAppLib.IO.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
        var resultsFolderId = FCLib.createFolderInFileCabinet(resultsFolderName, ThisAppLib.IO.FolderIds.RESULTS);
        var originalsFolderId = FCLib.createFolderInFileCabinet(ThisAppLib.IO.CSV_ORIGINALS_SUBFOLDER_NAME, resultsFolderId);

        return {
            sessionResultsFolderId: resultsFolderId,
            sessionOriginalsFolderId: originalsFolderId
        };
    }


    function LineValidationError(message) {
        this.name = "LineValidationError";
        this.message = message;
    }

    function FileValidationError(message) {
        this.name = "FileValidationError";
        this.message = message;
    }

    function ParsedFile({
        sourceFileId = null,
        sourceFileName = null,
        sourceFileNameNoExt = null,
        sourceFileUrl = null,
        sourceFileObj = null,
        parsedData = [],
        parsingErrors = [],
        parsingMeta = {},
        errors = {},
        itemsToUpdate = {}
    } = {}) {

        this.sourceFileId = sourceFileId;
        this.sourceFileName = sourceFileName;
        this.sourceFileNameNoExt = sourceFileNameNoExt;
        this.sourceFileUrl = sourceFileUrl;
        this.sourceFileObj = sourceFileObj;
        this.parsedData = parsedData;
        this.parsingErrors = parsingErrors;
        this.parsingMeta = parsingMeta;
        this.errors = errors;
        this.itemsToUpdate = itemsToUpdate;
        // this.rowsWithErrors = {};

        this.addError = function ({
            origRow = -1,
            errorMsg = '' } = {}
        ) {
            let newError = {
                [ThisAppLib.CsvFormats.PARSE_ERROR_CSV.FieldSet1.Error.label]: errorMsg
            };

            if (origRow >= 0) {
                // Add the original row data to the error output
                Object.assign(newError, this.parsedData[origRow]);
            }

            this.errors[origRow] = newError;
            // this.rowsWithErrors[origRow] = true;
        }

        this.addItemToUpdate = function ({
            jitStartQty = -1,
            origRow = -1,
            lineData = {}
        } = {}) {
            // FIX: Not sure how best to key this
            this.itemsToUpdate[
                lineData[ThisAppLib.CsvFormats.ITEMS_TO_UPDATE_CSV.FieldSet1.ItemName.InputHeader]
            ] = jitStartQty;
        }

        this.isErrorRow = function (row) {
            return (row in this.errors);
        }

        this.getSortedErrorData = function () {
            if (!this.errors || !this.errors.length == 0) {
                return null;
            }

            // Output fields = Error column + the original fields from the meta output
            let outputFields = [ThisAppLib.CsvFormats.PARSE_ERROR_CSV.FieldSet1.Error.label];
            outputFields.push(...this.parsingMeta.fields);

            // Sort the error output by original row number
            let sortedErrorData = FCLib.mapObjToSortedListByKey(this.errors, true);

            // Add extra column headers to fit all __parsed_extra columns, if they exist
            let maxParsedExtra = 0;
            let extrasColName = FCLib.Settings.PapaParse.EXTRAS_COL_NAME;
            for (let errorLine of sortedErrorData) {
                if (extrasColName in errorLine) {
                    lineExtraCols = errorLine[extrasColName].length;
                    maxParsedExtra = Math.max(maxParsedExtra, lineExtraCols);
                    for (let i = 0; i < maxParsedExtra; i++) {
                        errorLine[extrasColName + `_${i}`] = errorLine[extrasColName][i];
                    }
                    // Delete the original __parsed_extra column
                    delete errorLine[extrasColName];
                }
            }

            // Add enough headers to the output fields to fit all the extra columns
            let extraFields = [];
            for (let i = 0; i < maxParsedExtra; i++) {
                extraFields.push(extrasColName + `_${i}`);
            }

            outputFields.push(...extraFields);

            return {
                fields: outputFields,
                data: sortedErrorData,
                isEmpty: (!sortedErrorData || sortedErrorData.length == 0)
            }
        }

        this.getErrorCSV = function (sortedErrorFields, sortedErrorData) {
            if (!sortedErrorData || !sortedErrorFields) {
                let sortedErrors = this.getSortedErrorData();
                sortedErrorFields = sortedErrors.fields;
                sortedErrorData = sortedErrors.data;
            }

            // Output to csv via PapaParse
            let csvOutput = Papa.unparse({
                fields: sortedErrorFields,
                data: sortedErrorData,
                quotes: true,
                // quoteChar: '"'
            });

            return {
                sourceFileName: this.sourceFileName,
                outputFileName: this.sourceFileNameNoExt + '_ERRORS.csv',
                contents: csvOutput,
                isEmpty: (!sortedErrorData || sortedErrorData.length == 0)
            }
        }

        this.errorCount = function () {
            return this.errors.length;
        }

        this.itemsToUpdateCount = function () {
            return Object.keys(this.itemsToUpdate).length;
        }

    }


    function parseJITCSVs(context, fileIds) {
        var parsedFiles = [];
        try {
            for (let fileId of fileIds) {
                let curFileObj = file.load({ id: fileId })
                let curFileContents = curFileObj.getContents();
                curFileContents = FCLib.stripBomFirstChar(curFileContents);

                let parsedFile = Papa.parse(
                    curFileContents,
                    {
                        header: true,
                        dynamicTyping: true,
                        skipEmptyLines: 'greedy',
                    }
                );

                // log.debug({ title: 'testParseJITCSVs - got data', details: { 'parsedData': parsedFile } });

                parsedFiles.push(new ParsedFile({
                    sourceFileId: fileId,
                    sourceFileName: curFileObj.name,
                    sourceFileNameNoExt: curFileObj.name.replace(/\.[^/.]+$/, ""),
                    sourceFileUrl: curFileObj.url,
                    sourceFileObj: curFileObj,
                    parsedData: parsedFile.data,
                    parsingErrors: parsedFile.errors,
                    parsingMeta: parsedFile.meta
                }));

            }

        } catch (e) {
            log.debug({ title: 'parseJITCSVs - error', details: { 'error': e } });
        }

        return parsedFiles;
    }

}
