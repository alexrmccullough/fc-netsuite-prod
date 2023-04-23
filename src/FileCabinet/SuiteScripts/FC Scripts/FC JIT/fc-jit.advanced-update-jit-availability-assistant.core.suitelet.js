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
    redirect,
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
    'N/redirect',
    '../Libraries/fc-main.library.module',
    './fc-jit.advanced-update-jit-availablity.library.module',
    '../Libraries/papaparse.min'
], main);


function main(fileModule, httpsModule, logModule, messageModule, queryModule, recordModule, renderModule, runtimeModule, serverWidgetModule, urlModule, redirectModule, fcLibModule, fcJITUploadLibModule, papaparseModule) {
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
    redirect = redirectModule;
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
                step4FinalChangeReview,
                null
            ];

            var stepWriteFunc = [
                writeCancel,
                writeStep1SelectCsvFiles,
                writeStep2ReviewCsvParse,
                writeStep3SelectUpdateOptions,
                writeStep4FinalChangeReview,
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
                    // if (assistant.getLastAction() == "next") {
                    //     assistant.currentStep = assistant.getNextStep();
                    // } else {
                    //     assistant.currentStep = assistant.getLastStep();
                    // }
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
        const inputFolderId = ThisAppLib.IO.FolderIds.INPUT.GetId();

        let sql = ThisAppLib.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID.BuildQuery(inputFolderId);
        let csvFileQueryResults = FCLib.sqlSelectAllRows(sql);

        let tableHtml = '';
        if (!csvFileQueryResults || csvFileQueryResults.length === 0) {
            tableHtml = '<p>No csv files found in the Input folder.</p>';
            log.debug({ title: 'parseJITCSVs - no files found', details: { 'folderId': inputFolderId } });
        }
        else {
            let fieldSet = [
                ThisAppLib.Settings.Ui.Step1.Sublists.FILE_TABLE_2.Fields.CB_Select,
                ThisAppLib.Settings.Ui.Step1.Sublists.FILE_TABLE_2.Fields.FileId,
                ThisAppLib.Settings.Ui.Step1.Sublists.FILE_TABLE_2.Fields.FileName,
                ThisAppLib.Settings.Ui.Step1.Sublists.FILE_TABLE_2.Fields.FileLastModifiedDate
            ];
            let styling = FCLib.Ui.TableStyles.Style1;

            tableHtml = FCLib.updatedConvertLookupTableToHTMLTable({
                data: csvFileQueryResults,
                fieldDefs: fieldSet,
                ...styling
            });

        }

        try {
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
        }
        catch (e) {
            log.debug({ title: 'writeStep1SelectCsvFiles - error in creating form fields', details: { 'error': e } });
        }

    }



    function writeStep2ReviewCsvParse(context, assistant) {
        let params = context.request.parameters;

        // Get the list of selected CSV file ids to start parsing
        let csvFileIdsSelected = Object.entries(params).reduce(
            (matched, [paramName, value]) => {
                if (ThisAppLib.Parameters.Step1.SELECT_CSV_CHECKBOX.looksLike(paramName)) {
                    return [...matched, value];
                }
                return matched;
            }, []
        );

        // If there are no selected files, display a simple message and return
        if (csvFileIdsSelected.length === 0) {
            // Create a form Field to hold the message
            var noFilesSelectedField = assistant.addField({
                id: 'custpage_no_files_selected',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'No Files Selected'
            });
            noFilesSelectedField.defaultValue = '<p>No files were selected for parsing. Click Next to continue without CSV data.</p>';
            return;
        }

        let parsedCSVs = parseJITCSVs(context, csvFileIdsSelected);
        if (!parsedCSVs) {
            return false;
        }

        // We want to display a summary of errors and successful parsing. 
        //   We will need to pull basic item data from the database so that we can verify
        //   whether the items exist. Otherwise, we're not doing any calculations yet. 

        // First, query NS for an overall JIT item summary
        let sqlJitItemList = ThisAppLib.Queries.GET_LIST_JIT_ITEMS.BuildQuery();
        let jitItemInfo = FCLib.sqlSelectAllRowsIntoDict(
            sqlJitItemList,
            ThisAppLib.Queries.GET_LIST_JIT_ITEMS.FieldSet1.ItemName.fieldid
        );


        let validationOutput = validateCSVData(context, parsedCSVs, jitItemInfo);
        let successfulItemsParsed = validationOutput.itemsToUpdate;


        // Run query to get details for successful itmes
        let successItemNames = Object.keys(successfulItemsParsed);
        let sqlGetItemDetails = ThisAppLib.Queries.GET_JIT_ITEM_DETAILS.BuildQuery(successItemNames);
        let itemDetailQueryResults = FCLib.sqlSelectAllRows(sqlGetItemDetails);


        // Inject the new JIT item quantities from the CSV uploads into the query results
        let itemNameFieldId = ThisAppLib.Queries.GET_JIT_ITEM_DETAILS.FieldSet1.ItemName.fieldid;
        let newJitQtyFieldId = ThisAppLib.Settings.Ui.Step2.Sublists.ITEMS_SUCCESSFULLY_PARSED_TABLE.Fields.NewJitStartQty.FieldId;


        for (let row of itemDetailQueryResults) {
            let itemName = row[itemNameFieldId];
            row[newJitQtyFieldId] = successfulItemsParsed[itemName];
        }

        // Create a folder to store output files for this session
        let sessionSubfolder = createSessionSubfolder(context);


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
        // let successCsvUrl = FCLib.getFileUrl(successfulItemsCsvFileId);
        // let successCsvLinkHtml = successCsvUrl ? `<a href="${successCsvUrl}" target="_blank">Download CSV</a>` : '';
        const successFieldDefObj = ThisAppLib.Settings.Ui.Step2.Sublists.ITEMS_SUCCESSFULLY_PARSED_TABLE.Fields;
        const successTableFieldIds = [
            successFieldDefObj.CB_Select,
            successFieldDefObj.ItemInternalId,
            successFieldDefObj.ItemName,
            successFieldDefObj.ItemDisplayName,
            successFieldDefObj.NewJitStartQty,
            successFieldDefObj.ItemStandingJitQty,
            successFieldDefObj.ItemStartJitQty,
            successFieldDefObj.ItemRemainJitQty,
        ];

        let successTableStyle = FCLib.Ui.TableStyles.Style1;

        let successTableHtml = FCLib.updatedConvertLookupTableToHTMLTable({
            data: itemDetailQueryResults,
            fieldDefs: successTableFieldIds,
            ...successTableStyle,
        });

        // 
        // let successHtml = buildCsvItemSelectList(context, itemDetailQueryResults);


        // Write the HTML to the Form fields
        try {
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

        }
        catch (e) {
            log.error({ title: 'writeStep2ReviewCsvParse - error in creating form fields', details: { 'error': e } });
        }


        errorResultsField.defaultValue = errorHtml;
        successfulResultsField.defaultValue = successTableHtml;


        // Save the selected CSV file IDs + our sessionSubfolder id to a persistentParams object
        let persistentParams = {
            csvFileIdsSelected: csvFileIdsSelected,
            sessionSubfolder: sessionSubfolder,
        };
        FCLib.addPersistentParamsField(assistant, persistentParams);
    }


    function writeStep3SelectUpdateOptions(context, assistant) {
        const params = context.request.parameters;
        var persistentParams = FCLib.getPersistentParams(context);

        // Get the list of selected item ids > new jit start qty.
        let itemsSelectedFromCsv = Object.entries(params).reduce(
            (matched, [paramName, value]) => {
                if (ThisAppLib.Parameters.Step2.SELECT_ITEM_CHECKBOX.looksLike(paramName)) {
                    let itemId = ThisAppLib.Parameters.Step2.SELECT_ITEM_CHECKBOX.parse(paramName);
                    matched[itemId] = value;
                    return matched;
                }
                return matched;
                /// PICK UP HERE: Need to figure out how to parse out Naem/Id AND Value from the param  
                // SHOULD DO: CHange "id" to "name" in all parameters. We don't really care about the id of these elements.

            }, {}
        );

        // Get the flat list of item ids
        const itemIds = Object.keys(itemsSelectedFromCsv);

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
        if (itemIds.length > 0) {
            // Query NS for the vendors matching the items in the CSV file.
            let sqlVendorsWithCsvItems = ThisAppLib.Queries.GET_VENDORS_WITH_SUCCESS_CSV_ITEMS.BuildQuery(itemIds);
            let vendorsWithCsvItemsQueryResults = FCLib.sqlSelectAllRows(sqlVendorsWithCsvItems);

            // Build interactive Input fields for the VENDORS-WITH-CSV table
            let table1FieldDefObj = ThisAppLib.Settings.Ui.Step3.Sublists.SUCCESS_VENDOR_TABLE_WITH_CSV.Fields;
            // let formattedRows = FCLib.formatQueryRowsOnFieldDefs(table1FieldDefObj, vendorsWithCsvItemsQueryResults);
            // let tableHeaders = Object.keys(table1FieldDefObj).map((key) => table1FieldDefObj[key].Label);


            // Build the HTML for the successful csv vendor table
            // Start by arranging all the  table fields we want into an array
            const table1FieldDefs = [
                table1FieldDefObj.VendorId,
                table1FieldDefObj.VendorName,
                table1FieldDefObj.StandingJitItemCount,
                table1FieldDefObj.ActionRadio_NoAction,
                table1FieldDefObj.ActionRadio_ZeroJitAvailability,
                table1FieldDefObj.ActionRadio_ZeroJitPlusApplyStanding,
                table1FieldDefObj.ActionRadio_ApplyStandingNoZero,
                table1FieldDefObj.SubtractFutureSosFromJitAvail,
                table1FieldDefObj.ApplyCsvAvailability,
            ];

            let table1Styles = FCLib.Ui.TableStyles.Style1;

            // Build the HTML for the table
            let table1Html = FCLib.updatedConvertLookupTableToHTMLTable({
                data: vendorsWithCsvItemsQueryResults,
                fieldDefs: table1FieldDefs,
                ...table1Styles,
            });


            // Create a Form field (inlinehtml) and insert the table
            let table1Field = assistant.addField({
                id: ThisAppLib.Settings.Ui.Step3.FormFields.VENDOR_TABLE_WITH_CSV_ITEMS.Id,
                label: ThisAppLib.Settings.Ui.Step3.FormFields.VENDOR_TABLE_WITH_CSV_ITEMS.Label,
                type: serverWidget.FieldType.INLINEHTML,
            });
            table1Field.defaultValue = table1Html;
        }


        // Move on to the non-CSV vendors
        // Query NS for the vendors NOT matching the items in the CSV file.
        let sqlVendorsWithoutCsvItems = ThisAppLib.Queries.GET_JIT_VENDORS_WITHOUT_SUCCESS_CSV_ITEMS.BuildQuery(itemIds);
        let vendorsWithoutCsvItemsQueryResults = FCLib.sqlSelectAllRows(sqlVendorsWithoutCsvItems);

        // Build the HTML for the non-CSV vendor table
        // Start by arranging all the  table fields we want into an array
        let table2FieldDefObj = ThisAppLib.Settings.Ui.Step3.Sublists.VENDOR_TABLE_NO_CSV.Fields;
        const table2FieldDefs = [
            table2FieldDefObj.VendorId,
            table2FieldDefObj.VendorName,
            table2FieldDefObj.StandingJitItemCount,
            table2FieldDefObj.ActionRadio_NoAction,
            table2FieldDefObj.ActionRadio_ZeroJitAvailability,
            table2FieldDefObj.ActionRadio_ZeroJitPlusApplyStanding,
            table2FieldDefObj.ActionRadio_ApplyStandingNoZero,
            table2FieldDefObj.SubtractFutureSosFromJitAvail,
        ];

        let table2Styles = FCLib.Ui.TableStyles.Style2;

        // Build the HTML for the table
        let table2Html = FCLib.updatedConvertLookupTableToHTMLTable({
            data: vendorsWithoutCsvItemsQueryResults,
            fieldDefs: table2FieldDefs,
            ...table2Styles,
        });

        // Create a Form field (inlinehtml) and insert the table
        let table2Field = assistant.addField({
            id: ThisAppLib.Settings.Ui.Step3.FormFields.VENDOR_TABLE_NON_CSV.Id,
            label: ThisAppLib.Settings.Ui.Step3.FormFields.VENDOR_TABLE_NON_CSV.Label,
            type: serverWidget.FieldType.INLINEHTML,
        });
        table2Field.defaultValue = table2Html;



        // Add hidden fields to the form to pass the selected items from the CSV file to the next step
        // Build the hidden field html, first
        let csvItemsSelectedHtml = Object.entries(itemsSelectedFromCsv).reduce(
            (html, [itemId, jitStartQty]) => {
                return html + ThisAppLib.Settings.Ui.Step3.Sublists.CSV_ITEMS_SELECTED_FROM_STEP2_HIDDEN.Fields.CsvItemSelected.GetTableElem(
                    itemId,
                    jitStartQty
                );
            }, ''
        );

        // Add the hidden fields to the form as a hidden field
        let csvItemsSelectedFormField = assistant.addField({
            id: ThisAppLib.Settings.Ui.Step3.FormFields.CSV_ITEMS_SELECTED_FROM_STEP2_HIDDEN.Id,
            label: ThisAppLib.Settings.Ui.Step3.FormFields.CSV_ITEMS_SELECTED_FROM_STEP2_HIDDEN.Label,
            type: serverWidget.FieldType.INLINEHTML,
        });
        // csvItemsSelectedFormField.updateDisplayType({
        //     displayType: serverWidget.FieldDisplayType.HIDDEN
        // });

        csvItemsSelectedFormField.defaultValue = csvItemsSelectedHtml;

        // Write persistentParams to a field to carry through to next step 
        FCLib.addPersistentParamsField(assistant, persistentParams);
    }


    function writeStep4FinalChangeReview(context, assistant) {
        const params = context.request.parameters;
        var persistentParams = FCLib.getPersistentParams(context);

        let debugHtml = '';

        // Extract info from the parameters
        let csvItemsSelected = {};
        let vendorOptions = {};
        let vendorsSubtractFutureSos = new Set();
        const actionOptions = ThisAppLib.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.Options;

        // Extract all the parameters into the two above lookup tables: csvItemsSelected and vendorOptions
        for (let [paramName, value] of Object.entries(params)) {
            if (ThisAppLib.Parameters.Step3.CSV_ITEMS_SELECTED_FROM_STEP2_HIDDENFIELD.looksLike(paramName)) {
                const itemId = ThisAppLib.Parameters.Step3.CSV_ITEMS_SELECTED_FROM_STEP2_HIDDENFIELD.parse(paramName);
                csvItemsSelected[itemId] = value;
            }
            else if (ThisAppLib.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.looksLike(paramName)) {
                const vendorId = ThisAppLib.Parameters.Step3.VENDOR_ACTION_RADIOBUTTON.parse(paramName);
                vendorOptions[vendorId] = vendorOptions[vendorId] || {};
                vendorOptions[vendorId].action = value;
            }
            else if (ThisAppLib.Parameters.Step3.VENDOR_SUBTRACTFUTURESOS_CHECKBOX.looksLike(paramName)) {
                const vendorId = ThisAppLib.Parameters.Step3.VENDOR_SUBTRACTFUTURESOS_CHECKBOX.parse(paramName);
                vendorOptions[vendorId] = vendorOptions[vendorId] || {};
                vendorOptions[vendorId].subtractFutureSos = true;
                vendorsSubtractFutureSos.add(vendorId);
            }

            else if (ThisAppLib.Parameters.Step3.VENDOR_APPLYCSV_CHECKBOX.looksLike(paramName)) {
                const vendorId = ThisAppLib.Parameters.Step3.VENDOR_APPLYCSV_CHECKBOX.parse(paramName);
                vendorOptions[vendorId] = vendorOptions[vendorId] || {};
                vendorOptions[vendorId].applyCsvAvailability = true;
            }
        }

        // Filter out any vendors that have no action selected
        vendorOptions = Object.entries(vendorOptions).reduce(
            (filteredVendorOptions, [vendorId, vendorOptionSet]) => {
                if ((vendorOptionSet.applyCsvAvailability === true) ||
                    (vendorOptionSet.action !== actionOptions.NO_ACTION)
                ) {
                    filteredVendorOptions[vendorId] = vendorOptionSet;
                }
                return filteredVendorOptions;
            }, {}
        );

        // If there are no vendors, write a simple message and return
        if (Object.keys(vendorOptions).length === 0) {
            assistant.addField({
                id: 'custpage_no_vendors',
                label: 'No Vendors',
                type: serverWidget.FieldType.INLINEHTML,
            }).defaultValue = 'No vendors were selected for any action.';
            return;
        }

        // Filter the vendorsSubtractFutureSos by vendors that remain after the above filter
        let vendorsSubtractFutureSosFiltered = Object.keys(vendorOptions).reduce(
            (filteredSet, vendorId) => {
                if (vendorsSubtractFutureSos.has(vendorId)) {
                    filteredSet.add(vendorId);
                }
                return filteredSet;
            }, new Set()
        );


        // Query the DB to get future SO quantities for items with the Subtract Future SOs box checked
        let futureSoLookup = {};
        if (vendorsSubtractFutureSosFiltered.size > 0) {
            const sqlSubtractFutureSoCounts = ThisAppLib.Queries.GET_JIT_ITEMS_ON_FUTURE_SOS.BuildQuery(
                Array.from(vendorsSubtractFutureSosFiltered)
            );
            futureSoLookup = FCLib.sqlSelectAllRowsIntoDict(
                sqlSubtractFutureSoCounts,
                ThisAppLib.Queries.GET_JIT_ITEMS_ON_FUTURE_SOS.FieldSet1.ItemInternalId.fieldid
            );
        }

        // Query the DB to get all current item info for all items represented by the vendors with an action selected
        const vendorIds = Object.keys(vendorOptions);

        let sqlJitItemsForVendors = ThisAppLib.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.BuildQuery(vendorIds);
        let resultsJitItemsForVendors = FCLib.sqlSelectAllRows(sqlJitItemsForVendors);


        // Build a map of all items to be updated, with their respective values: 
        // 1. New current JIT availability
        // 2. New start JIT availability
        let itemUpdateMaster = [];

        const jitItemFieldSet = ThisAppLib.Queries.GET_JIT_ITEM_DETAILS_FOR_VENDORS.FieldSet1;
        const futureSoTotalQtyField = ThisAppLib.Queries.GET_JIT_ITEMS_ON_FUTURE_SOS.FieldSet1.TotalQty.fieldid;

        for (let row of resultsJitItemsForVendors) {
            // Get the item ID
            const itemId = row[jitItemFieldSet.ItemInternalId.fieldid];
            const vendorId = row[jitItemFieldSet.VendorId.fieldid];
            const vendorOptionSet = vendorOptions[vendorId];

            let newJitValue = null;

            // Build the JIT value for this item, by order of ascendign priority:
            //   1. Zero, if the vendor has been selected to have zero JIT availability
            //   2. Standing, if the vendor has been selected to have standing JIT availability
            //   3. The value from the CSV, if the vendor has been selected to have the CSV value applied
            //   4. Future SOs subtracted, if the vendor has been selected to have future SOs subtracted
            if (!(vendorId in vendorOptions)) {
                continue;
            }

            if ((vendorOptionSet.applyCsvAvailability === true) && (itemId in csvItemsSelected)) {
                newJitValue = csvItemsSelected[itemId];
            }

            else if (vendorOptionSet.action === actionOptions.ZERO_JIT_AVAIL) {
                newJitValue = 0;
            }

            else if (vendorOptionSet.action === actionOptions.ZERO_AND_APPLY_STANDING) {
                let standingJitValue = Number(row[jitItemFieldSet.ItemStandingJitQty.fieldid]);
                newJitValue = standingJitValue ? standingJitValue : 0;
            }
            else if (vendorOptionSet.action === actionOptions.APPLY_STANDING_NO_ZEROING) {
                let standingJitValue = Number(row[jitItemFieldSet.ItemStandingJitQty.fieldid]);
                if (standingJitValue) {
                    newJitValue = row[jitItemFieldSet.ItemStandingJitQty.fieldid];
                }
            }

            if (newJitValue === null) { continue; }

            let newJitStart = newJitValue;
            let newJitRemain = newJitValue;

            // Subtract future SOs from the JIT value
            let futureSoCount = 0;
            if (vendorOptionSet.subtractFutureSos === true && itemId in futureSoLookup) {
                futureSoCount = Number(
                    futureSoLookup[itemId][futureSoTotalQtyField]
                );
                newJitRemain -= futureSoCount;
            }

            // Add the item to the update master
            itemUpdateMaster.push({
                newStartJitValue: newJitStart,
                newRemainingJitValue: newJitRemain,
                futureSoCount: futureSoCount,
                ...row
            });

        }


        // Build an HTML table to display the proposed changes
        //  Fields: Vendor Name, Vendor ID, Item ID, Item Name, Current JIT Remain, Current JIT Start, New JIT Remain, New JIT Start
        let tableFieldDefsRaw = ThisAppLib.Settings.Ui.Step4.Sublists.PROPOSED_JIT_CHANGES.Fields;
        // PICK UP HERE
        let outputFieldDefs = [
            tableFieldDefsRaw.CB_Select,
            tableFieldDefsRaw.VendorId,
            tableFieldDefsRaw.VendorName,
            tableFieldDefsRaw.ItemId,
            tableFieldDefsRaw.ItemName,
            tableFieldDefsRaw.ItemDisplayName,
            tableFieldDefsRaw.CurrentJitStart,
            tableFieldDefsRaw.CurrentJitRemaining,
            tableFieldDefsRaw.FutureSoCount,
            tableFieldDefsRaw.NewJitStart,
            tableFieldDefsRaw.NewJitRemaining,
        ];

        // Sort the table data by vendor name, then item name
        let sortKeys = [
            tableFieldDefsRaw.VendorName.fieldid,
            tableFieldDefsRaw.ItemName.fieldid
        ];

        itemUpdateMaster = FCLib.sortArrayOfObjsByKeys(
            itemUpdateMaster,
            sortKeys
        );

        // Build the table
        let tableHtml = '';
        const styling = FCLib.Ui.TableStyles.Style1;

        tableHtml = FCLib.updatedConvertLookupTableToHTMLTable({
            data: itemUpdateMaster,
            fieldDefs: outputFieldDefs,
            ...styling
        });

        // Add an inlinehtml Form field to the page to hold the table, then inject the table
        let tableContainer = assistant.addField({
            id: ThisAppLib.Settings.Ui.Step4.FormFields.PROPOSED_JIT_CHANGES_TABLE.Id,
            label: ThisAppLib.Settings.Ui.Step4.FormFields.PROPOSED_JIT_CHANGES_TABLE.Label,
            type: serverWidget.FieldType.INLINEHTML
        });
        tableContainer.defaultValue = tableHtml;


        // Add an inlinehtml form field to hold debug output
        let debugContainer = assistant.addField({
            id: 'custpage_debug_output',
            label: 'Debug',
            type: serverWidget.FieldType.INLINEHTML,
        });


        debugHtml += 'Params: <br>' + JSON.stringify(params, null, 4) + '<br><br>';
        debugHtml += 'ItemUpdateMaster: <br>' + JSON.stringify(itemUpdateMaster, null, 4) + '<br><br>';
        debugHtml += 'CSV Items Selected: <br>' + JSON.stringify(csvItemsSelected, null, 4) + '<br><br>';
        debugHtml += 'Future SO Lookup: <br>' + JSON.stringify(futureSoLookup, null, 4) + '<br><br>';
        debugHtml += 'Vendor Options: <br>' + JSON.stringify(vendorOptions, null, 4) + '<br><br>';
        debugContainer.defaultValue = debugHtml;


        log.debug({ title: 'itemUpdateMaster', details: itemUpdateMaster });
        let zero = 0;

        // Write the persistentParams to a field to carry to next step
        FCLib.addPersistentParamsField(assistant, persistentParams);

    }


    function writeResult(context, assistant) {
        const params = context.request.parameters;
        var persistentParams = FCLib.getPersistentParams(context);
        var sessionSubfolder = persistentParams.sessionSubfolder;

        // Parse the params and build an item JIT import list
        let itemsUpdateInfo = Object.entries(params).reduce(
            (matched, [paramName, value]) => {
                const cbParamDef = ThisAppLib.Parameters.Step4.SELECT_JIT_CHANGE_CHECKBOX;
                if (cbParamDef.looksLike(paramName)) {
                    let itemId = cbParamDef.parseName(paramName);
                    let newJitInfo = cbParamDef.parseValue(value);
                    matched[itemId] = newJitInfo;
                    return matched;
                }
                return matched;
                /// PICK UP HERE: Need to figure out how to parse out Naem/Id AND Value from the param  
                // SHOULD DO: CHange "id" to "name" in all parameters. We don't really care about the id of these elements.

            }, {}
        );

        // If there are no items to update, display a message and return
        if (Object.keys(itemsUpdateInfo).length === 0) {
            context.response.write(
                'No items were selected for JIT update. Aborting. Please restart the Assistant.'
            );
            return;
        }

        try {
            // Save the original CSV files, if any, to an Originals folder, for archive purposes.
            const origCsvFileIds = persistentParams.csvFileIdsSelected;
            if (origCsvFileIds) {
                origCsvFileIds.forEach((origCsvFileId) => {
                    fileObj = file.copy({
                        id: origCsvFileId,
                        folder: sessionSubfolder.sessionOriginalsFolderId,
                        conflictResolution: file.ConflictResolution.FAIL
                    });

                    // FIX: Convert to MOVE, rather than copy
                    // let moveSuccess = FCLib.moveFileToFolder({
                    //     fileId: origCsvFileId,
                    //     folderId: sessionSubfolder.sessionOriginalsFolder.id
                    // });
                });
            }
        } catch (e) {
            log.error({ title: 'Error saving original CSV files', details: e });
        }

        // Save the item update data to a CSV file to be used by the MR task
        // First, convert the itemsUpdateInfo object to an an array of objects to be fed to Papaparse
        let csvHeaderNames = [
            FCLib.Ids.Fields.Item.InternalId,
            FCLib.Ids.Fields.Item.StartJITQty,
            FCLib.Ids.Fields.Item.RemainingJITQty,
        ];

        let itemUpdateData = Object.entries(itemsUpdateInfo).map(
            ([itemId, jitInfo]) => {
                return {
                    [csvHeaderNames[0]]: itemId,
                    [csvHeaderNames[1]]: Number(jitInfo.newJitStart),
                    [csvHeaderNames[2]]: Number(jitInfo.newJitRemain)
                };
            }
        );

        let itemUpdateCSVStr = Papa.unparse(itemUpdateData, {
            columns: csvHeaderNames,
            skipEmptyLines: true,
            header: true
        });

        var finalUpdateCsvId;
        try {
            // Save the CSV string to a file
            finalUpdateCsvId = FCLib.writeFileToFileCabinet(
                'csv',
                ThisAppLib.IO.CSV_FINAL_CHANGES_FILENAME,
                itemUpdateCSVStr,
                sessionSubfolder.sessionResultsFolderId
            );
        } catch (e) {
            log.error({ title: 'Error saving final CSV file', details: e });
        }

        let mrTaskId = ThisAppLib.submitItemUpdateMRJob(finalUpdateCsvId);


        // var monitoringSuitelet = url.resolveScript({
        //     scriptId: 'customscript_fc_am_taskstatusmonitor',
        //     deploymentId: 'customdeploy_fc_am_taskstatusmonitor',
        //     params: {
        //         taskId: mrTaskId,
        //         // SuiteAnswers 68858
        //         ifrmcntnr: 'T',
        //         // rename the stages
        //         map: 'Parsing Import Data',
        //         reduce: 'Applying JIT Changes to Items',
        //         summarize: 'Wrapping Up'
        //     }
        // });

        // var monitorSuitelet = url.resolveScript({
        //     scriptId: 'customscript_fc_am_mrmonitoringinterface',
        //     deploymentId: 'customdeploy_fc_am_mrmonitoringinterface',
        //     params: {
        //         'custscript_fc_am_mrtaskid': mrTaskId,
        //     }
        // });

        // redirect.toSuitelet({
        //     scriptId: 'customscript_fc_am_mrmonitoringinterface',
        //     deploymentId: 'customdeploy_fc_am_mrmonitoringinterface',
        //     params: {
        //         'custscript_fc_am_mrtaskid': mrTaskId,
        //     }
        // });

        // log.debug({ title: 'MR Task ID', details: mrTaskId });


        // var monitorIframeHtml = '<iframe src="' + monitoringSuitelet + '" style="border:0;width:100%;height:200px;"></iframe>';

        let pageHtml =
            `Launching update script using itemUploadCSVId: ${finalUpdateCsvId}.
            MR Task ID: ${mrTaskId}
            `;

        return pageHtml;

    }

    function writeCancel(context) {
        context.response.write('Session cancelled. Please reload the Assistant to restart.');
        return;
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
        var resultsFolderId = FCLib.createFolderInFileCabinet(resultsFolderName, ThisAppLib.IO.FolderIds.RESULTS.GetId());
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
