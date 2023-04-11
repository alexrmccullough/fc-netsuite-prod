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


define(['N/file', 'N/https', 'N/log', 'N/ui/message', 'N/query', 'N/record', 'N/render', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/fc-main.library.module.js', './fc-jit.update-jit-availablity.library.module.js', '../Libraries/papaparse.min.js'], main);


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

            var stepSelectOptions = assistant.addStep({
                id: 'custpage_step_select_options',
                label: 'Select Options',
            });

            var stepReviewAndCommit = assistant.addStep({
                id: 'custpage_step_commit_upload',
                label: 'Review & Commit Upload',
            });


            if (context.request.method === 'GET') //GET method means starting the assistant
            {
                writeStepSelectOptions(context, assistant);
                assistant.currentStep = stepSelectOptions;
                context.response.writePage(assistant);

            } else //POST method - process step of the assistant
            {
                if (context.request.parameters.next === 'Finish') //Finish was clicked
                    writeResult(context, assistant);
                else if (context.request.parameters.cancel) //Cancel was clicked
                    writeCancel();
                else if (assistant.currentStep.stepNumber === 1) { //transition from step 1 to step 2
                    writeStepReviewAndCommit(context, assistant);
                    assistant.currentStep = assistant.getNextStep();
                    context.response.writePage(assistant);
                } else { //transition from step 2 back to step 1
                    writeStepSelectOptions(context, assistant);
                    assistant.currentStep = assistant.getNextStep();
                    context.response.writePage(assistant);
                }
            }
        }
    }

}

function writeStepSelectOptions(context, assistant) {

    // Add a checkbox to switch on/off Subtract Future JIT SOs from Remaining JIT Qty
    var subtractFutureSOsCheckbox = assistant.addField({
        id: ThisAppLib.Settings.Ui.Parameters.SUBTRACT_FUTURE_SOS_CHECKBOX_ID,
        type: serverWidget.FieldType.CHECKBOX,
        label: ThisAppLib.Settings.Ui.Buttons.SUBTRACT_FUTURE_SOS_CHECKBOX_LABEL,
        // container: FCJITUploadLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
    });
    subtractFutureSOsCheckbox.defaultValue = 'T';

    // Add a checkbox to switch on/off Reset all JIT
    var resetAllJITCheckbox = assistant.addField({
        id: ThisAppLib.Settings.Ui.Parameters.RESET_ALL_JIT_CHECKBOX_ID,
        type: serverWidget.FieldType.CHECKBOX,
        label: ThisAppLib.Settings.Ui.Buttons.RESET_ALL_JIT_CHECKBOX_LABEL,
        // container: FCJITUploadLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
    });
    resetAllJITCheckbox.defaultValue = 'T';


    // Get the list of files currently in the Input folder and display
    let sql = ThisAppLib.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID;
    let queryResults = FCLib.sqlSelectAllRows(sql, params = [ThisAppLib.Ids.Folders.INPUT]);
    // let queryResults = query.runSuiteQL({ query: sql, params: [FCUpdateJITAvailLib.Ids.Folders.INPUT] });
    // let files = queryResults.asMappedResults();

    let tableHtml = ''
    if (!queryResults || queryResults.length === 0) {
        tableHtml = '<p>No csv files found in the Input folder.</p>';
        log.debug({ title: 'parseJITCSVs - no files found', details: { 'folderId': folderId } });
    }
    else{
        tableHtml += FCLib.convertObjToHTMLTableStylized({
            fields: ['id', 'name', 'lastmodifieddate'],
            data: queryResults,
            headerNameMap: {
                id: 'File ID',
                name: 'File Name',
                lastmodifieddate: 'Last Modified Date',
            }
        });
    }

    // Add a field group and an inlinehtml field to display the table of files
    var fileTableFieldGroup = assistant.addFieldGroup({
        id: ThisAppLib.Settings.Ui.FieldGroups.FILE_TABLE_FIELD_GROUP_ID,
        label: ThisAppLib.Settings.Ui.FieldGroups.FILE_TABLE_FIELD_GROUP_LABEL
    });

    var fileTableField = assistant.addField({
        id: ThisAppLib.Settings.Ui.Fields.FILE_TABLE_FIELD_ID,
        type: serverWidget.FieldType.INLINEHTML,
        label: ThisAppLib.Settings.Ui.Fields.FILE_TABLE_FIELD_LABEL,
        container: ThisAppLib.Settings.Ui.FieldGroups.FILE_TABLE_FIELD_GROUP_ID
    });
    fileTableField.defaultValue = tableHtml;

    // var testFileUploadField = assistant.addField({
    //     id: 'custpage_test_file_upload',
    //     type: serverWidget.FieldType.FILE,
    //     label: 'Test File Upload'
    // });

}

function writeStepReviewAndCommit(context, assistant) {
    var allParams = JSON.stringify(context.request.parameters);
    // Get parameters
    var subtractFutureJITSOs = context.request.parameters[ThisAppLib.Settings.Ui.Parameters.SUBTRACT_FUTURE_SOS_CHECKBOX_ID];
    var resetAllJIT = context.request.parameters[ThisAppLib.Settings.Ui.Parameters.RESET_ALL_JIT_CHECKBOX_ID];

    subtractFutureJITSOs = subtractFutureJITSOs == 'T' ? true : false;
    resetAllJIT = resetAllJIT == 'T' ? true : false;

    // Add a field group for the error results
    var errorResultsFieldGroup = assistant.addFieldGroup({
        id: ThisAppLib.Settings.Ui.FieldGroups.ERROR_RESULTS_FIELD_GROUP_ID,
        label: ThisAppLib.Settings.Ui.FieldGroups.ERROR_RESULTS_FIELD_GROUP_LABEL
    });

    // Add a field group for the item update results
    var itemUpdateResultsFieldGroup = assistant.addFieldGroup({
        id: ThisAppLib.Settings.Ui.FieldGroups.ITEM_UPDATE_RESULTS_FIELD_GROUP_ID,
        label: ThisAppLib.Settings.Ui.FieldGroups.ITEM_UPDATE_RESULTS_FIELD_GROUP_LABEL
    });

    // Add a field to display the results of the file validation
    var errorResultsField = assistant.addField({
        id: ThisAppLib.Settings.Ui.Fields.ERROR_RESULTS_FIELD_ID,
        type: serverWidget.FieldType.INLINEHTML,
        label: ThisAppLib.Settings.Ui.Fields.ERROR_RESULTS_FIELD_LABEL,
        container: ThisAppLib.Settings.Ui.FieldGroups.ERROR_RESULTS_FIELD_GROUP_ID
    });
    errorResultsField.updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
    });
    errorResultsField.updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTCOL
    });

    // Add a field to display the results of the item update
    var itemUpdateResultsField = assistant.addField({
        id: ThisAppLib.Settings.Ui.Fields.ITEM_UPDATE_RESULTS_FIELD_ID,
        type: serverWidget.FieldType.INLINEHTML,
        label: ThisAppLib.Settings.Ui.Fields.ITEM_UPDATE_RESULTS_FIELD_LABEL,
        container: ThisAppLib.Settings.Ui.FieldGroups.ITEM_UPDATE_RESULTS_FIELD_GROUP_ID
    });
    itemUpdateResultsField.updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
    });
    itemUpdateResultsField.updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTCOL
    });


    // Add a hidden field to hold the ID of the JIT CSV upload file
    var itemUploadCSVIdField = assistant.addField({
        id: ThisAppLib.Settings.Ui.Parameters.ITEM_UPLOAD_CSV_FIELD_ID,
        type: serverWidget.FieldType.INTEGER,
        label: ThisAppLib.Settings.Ui.Fields.ITEM_UPLOAD_CSV_FIELD_LABEL
    });
    itemUploadCSVIdField.updateDisplayType({
        displayType: serverWidget.FieldDisplayType.HIDDEN
    });


    uploadPreviewResults = loadUploadPreview(context, subtractFutureJITSOs, resetAllJIT);
    // uploadPreviewResults.errorHtml += uploadPreviewResults.debugOut;
    uploadPreviewResults.errorHtml += uploadPreviewResults.uploadCSVFileId;

    errorResultsField.defaultValue = uploadPreviewResults.errorHtml;
    itemUpdateResultsField.defaultValue = uploadPreviewResults.itemUpdateHtml;
    itemUploadCSVIdField.defaultValue = uploadPreviewResults.uploadCSVFileId;

}

function writeResult (context, assistant) {
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
            [ThisAppLib.Settings.CSV_OUT_ERROR_FIELDNAME]: errorMsg
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
        this.itemsToUpdate[lineData[ThisAppLib.Settings.ITEM_ID_FIELDNAME]] = jitStartQty;
    }

    this.isErrorRow = function (row) {
        return (row in this.errors);
    }

    this.getSortedErrorData = function () {
        if (!this.errors || !this.errors.length == 0) {
            return null;
        }

        // Output fields = Error column + the original fields from the meta output
        let outputFields = [ThisAppLib.Settings.CSV_OUT_ERROR_FIELDNAME];
        outputFields.push(...this.parsingMeta.fields);

        // Sort the error output by original row number
        let sortedErrorData = FCLib.mapObjToSortedListByKey(this.errors, true);

        // Add extra column headers to fit all __parsed_extra columns, if they exist
        let maxParsedExtra = 0;
        let extrasColName = ThisAppLib.Settings.PAPAPARSE_EXTRA_COL_NAME;
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

function parseJITCSVs(context, folderId) {
    var parsedFiles = [];
    try {
        let sql = ThisAppLib.Queries.GET_ALL_CSV_FILES_IN_FOLDER_BY_ID;
        let queryResults = query.runSuiteQL({ query: sql, params: [folderId] });
        let files = queryResults.asMappedResults();
        if (files.length == 0) {
            log.debug({ title: 'parseJITCSVs - no files found', details: { 'folderId': folderId } });
            return null;
        }

        for (let f of files) {
            let curFileObj = file.load({ id: f.id })
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
                sourceFileId: f.id,
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


function getJITItemSnapshot(context) {
    let sql = ThisAppLib.Queries.GET_JIT_ITEM_SNAPSHOT;
    let queryParams = new Array();
    let items = FCLib.sqlSelectAllRowsIntoDict(sql, 'itemname', queryParams);
    return items;

}


function getJITItemsOnFutureSOs(context, itemIds) {
    let sql = ThisAppLib.Queries.GET_JIT_ITEMS_ON_FUTURE_SOS;
    // let queryParams = [itemIds];
    let items = FCLib.sqlSelectAllRowsIntoDict(sql, 'itemId');
    return items;
}


function LineValidationError(message) {
    this.name = "LineValidationError";
    this.message = message;
}

function FileValidationError(message) {
    this.name = "FileValidationError";
    this.message = message;
}

function validateCSVData(context, parsedFiles, nsItemData) {
    var dupesDetected = {};

    for (let thisFile of parsedFiles) {
        let isValidFile = true;

        // Test whether file has all required fields
        // Error if file doesn't have all required fields
        for (let reqField of ThisAppLib.Settings.REQUIRED_FIELD_NAMES) {
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
                    let itemId = curLine[ThisAppLib.Settings.ITEM_ID_FIELDNAME];
                    let jitStartQty = curLine[ThisAppLib.Settings.JIT_START_QTY_FIELDNAME];

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
                            `Invalid number in ${ThisAppLib.Settings.JIT_START_QTY_FIELDNAME}: ${jitStartQty}`
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

function buildItemUpdateMaster(
    context,
    nsJITSnapshot,
    itemsToUpdateFromCSV,
    resetJITQuantities = false,
    subtractFutureJITSOs = false
) {

    var itemUpdateMaster = {};
    var futureSOCounts = {};

    // If subtractFutureJITSOs is true, then query NS for all future JIT SO transaction counts by item
    if (subtractFutureJITSOs) {
        futureSOCounts = getJITItemsOnFutureSOs(context);
    }

    for (let itemId in nsJITSnapshot) {
        // Determine new JIT start qty. If it's different than the old JIT start qty, then we need to update
        let oldJITStartQty = nsJITSnapshot[itemId].startjitqty;
        let newJITStartQty = resetJITQuantities ? 0 : nsJITSnapshot[itemId].startjitqty;

        // If item present in itemsToUpdateFromCSV, override the standing quantity
        // Otherwise, if item has a standing qty set, use that value
        if (itemId in itemsToUpdateFromCSV) {
            newJITStartQty = itemsToUpdateFromCSV[itemId];
        } else if (nsJITSnapshot[itemId].standingjitqty) {
            newJITStartQty = nsJITSnapshot[itemId].standingjitqty;
        }

        // If subtractFutureJITSOs is true, then subtract the future JIT SO counts from the new JIT start qty
        let newJITRemainingQty = newJITStartQty;

        if (subtractFutureJITSOs && itemId in futureSOCounts) {
            newJITRemainingQty -= futureSOCounts[itemId];
        }

        // If the new JIT start qty is different from the old JIT start qty
        //     1. Calculate the remaining JIT qty
        //     2. Update NS item with jitstartqty, jitremainingqty
        if (newJITStartQty != oldJITStartQty) {
            itemUpdateMaster[itemId] = {
                // FIXME: Get these to module library
                newJITStartQty: newJITStartQty,
                newJITRemainingQty: newJITRemainingQty,
            };
        }
    }

    return itemUpdateMaster;
}


function buildSuccessfulUploadsData(context, itemUpdateMaster, jitItemSnapshot) {
    var data = [];
    var fields = [
        FCLib.Ids.Fields.Item.InternalId,
        FCLib.Ids.Fields.Item.Name,
        // FCLib.Ids.Fields.Item.ItemType,
        // FCLib.Ids.Fields.Item.IsLotItem,
        ThisAppLib.TempFields.ItemOldStartJITQty,
        ThisAppLib.TempFields.ItemOldRemainingJITQty,
        FCLib.Ids.Fields.Item.StartJITQty,
        FCLib.Ids.Fields.Item.RemainingJITQty,
    ];

    for (let itemId in itemUpdateMaster) {
        let itemUpdateData = itemUpdateMaster[itemId];
        let nsItemData = jitItemSnapshot[itemId];

        data.push({
            [FCLib.Ids.Fields.Item.InternalId]: nsItemData.internalid,
            [FCLib.Ids.Fields.Item.Name]: itemId,
            // [FCLib.Ids.Fields.Item.ItemType]: nsItemData.itemtype,
            // [FCLib.Ids.Fields.Item.IsLotItem]: nsItemData.islotitem,
            [ThisAppLib.TempFields.ItemOldStartJITQty]: nsItemData.startjitqty,
            [ThisAppLib.TempFields.ItemOldRemainingJITQty]: nsItemData.remainjitqty,
            [FCLib.Ids.Fields.Item.StartJITQty]: itemUpdateData.newJITStartQty,
            [FCLib.Ids.Fields.Item.RemainingJITQty]: itemUpdateData.newJITRemainingQty,
        });
    }

    return {
        fields: fields,
        data: data
    };
}

function buildSuccessfulUploadsCSVContent(context, itemUpdateMaster, jitItemSnapshot, fields, data) {
    if (!fields || !data) {
        let allData = buildSuccessfulUploadsData(context, itemUpdateMaster, jitItemSnapshot);
        fields = allData.fields;
        data = allData.data;
    }

    let uploadCSVContent = Papa.unparse({
        fields: fields,
        data: data
    });

    return uploadCSVContent;
}

function buildSuccessfulUploadsCSV(context, itemUpdateMaster, jitItemSnapshot, csvDataFolderId) {
    let uploadData = buildSuccessfulUploadsData(context, itemUpdateMaster, jitItemSnapshot);

    const curDateTimeStr = FCLib.getStandardDateTimeString1(new Date());

    // const curDateTime = new Date();
    // const curDateTimeStr = curDateTime.toISOString().replace(/:/g, '-');

    var uploadFileName =
        ThisAppLib.Settings.JIT_UPLOAD_UTILITY_CSV_FILENAME_PREFIX +
        curDateTimeStr +
        '.csv';

    // Save a temporary CSV file to File Cabinet holding the itemUpdateMaster data
    var csvContent = buildSuccessfulUploadsCSVContent(
        context,
        itemUpdateMaster,
        jitItemSnapshot,
        uploadData.fields,
        uploadData.data
    );

    var csvFileId = FCLib.writeFileToFileCabinet(
        'csv',
        uploadFileName,
        csvContent,
        csvDataFolderId
    );

    return {
        uploadData: uploadData,
        csvFileId: csvFileId
    }
}



function createSessionSubfolder(context, date = new Date()) {
    const curDateTimeStr = FCLib.getStandardDateTimeString1(date);
    // const curDateTime = new Date();
    // const curDateTimeStr = curDateTime.toISOString().replace(/:/g, '-');
    var resultsFolderName = ThisAppLib.Settings.SESSION_RESULTS_FOLDER_NAME_PREFIX + curDateTimeStr;
    var resultsFolderId = FCLib.createFolderInFileCabinet(resultsFolderName, ThisAppLib.Ids.Folders.RESULTS);
    var originalsFolderId = FCLib.createFolderInFileCabinet(ThisAppLib.Settings.CSV_ORIGINALS_SUBFOLDER_NAME, resultsFolderId);

    return {
        sessionResultsFolderId: resultsFolderId,
        sessionOriginalsFolderId: originalsFolderId
    };
}


// function getRequestHandle(context) {
function loadUploadPreview(context, subtractFutureJITSOs, resetAllJIT) {
    var debugOut = [];
    // debugOut.push(`loadUploadPreview / params: subtractFutureJITSOs: ${subtractFutureJITSOs}, resetAllJIT: ${resetAllJIT}`);

    var parsedCSVs = parseJITCSVs(context, ThisAppLib.Ids.Folders.INPUT);
    if (!parsedCSVs) {
        return false;
    }
    var jitItemSnapshot = getJITItemSnapshot(context);
    var validationOutput = validateCSVData(context, parsedCSVs, jitItemSnapshot);
    
    
    var itemUpdateMaster = buildItemUpdateMaster(
        context,
        jitItemSnapshot,
        validationOutput.itemsToUpdate,
        resetAllJIT,
        subtractFutureJITSOs,
    );

    // debugOut.push(`loadUploadPreview / itemUpdateMaster: ${JSON.stringify(itemUpdateMaster)}`);

    var sessionSubfolder = createSessionSubfolder(context);


    var errorTables = validationOutput.validatedFiles.map(function (parsedFile) {
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

    // DEBUG
    // errorHtml += JSON.stringify(context.request.parameters);


    // let itemUpdateData = buildSuccessfulUploadsData(context, itemUpdateMaster, jitItemSnapshot);
    let uploadCSVResults = buildSuccessfulUploadsCSV(
        context,
        itemUpdateMaster,
        jitItemSnapshot,
        sessionSubfolder.sessionResultsFolderId
    );


    // debugOut.push(`loadUploadPreview / itemUpdateData: ${JSON.stringify(itemUpdateData)}`);

    let itemUpdateCSVUrl = FCLib.getFileUrl(uploadCSVResults.csvFileId);

    let itemUpdateHtml = `<h5><a href="${itemUpdateCSVUrl}" target="_blank">Download CSV</a></h5>`;
    let sortedData = FCLib.sortArrayOfObjsByKey(
        uploadCSVResults.uploadData.data,
        FCLib.Ids.Fields.Item.Name,
        true
    );
    // debugOut.push(`loadUploadPreview / sortedData: ${JSON.stringify(sortedData)}`);

    itemUpdateHtml += FCLib.convertObjToHTMLTableStylized({
        fields: uploadCSVResults.uploadData.fields,
        data: sortedData
        // data: FCLib.sortArrayOfObjsByKey(
        //     uploadCSVResults.uploadData.data,
        //     FCLib.Ids.Fields.Item.Name,
        //     true
        // )
        // headerBGColor: '#c23041',
    });
    // debugOut.push(`loadUploadPreview / itemUpdateHtml: ${itemUpdateHtml}`);


    // debugOut.push(`uploadCSVFileId: ${uploadCSVResults.csvFileId}`);

    return {
        errorHtml: errorHtml,
        itemUpdateHtml: itemUpdateHtml,
        uploadCSVFileId: uploadCSVResults.csvFileId,
        debugOut: debugOut,
    };

    // formElements.errorResultsField.defaultValue = errorHtml;
    // formElements.itemUpdateResultsField.defaultValue = itemUpdateHtml;


    // log.debug({ title: 'get - itemUpdateData', details: itemUpdateData });
    // log.debug({ title: 'get - itemUpdateHtml', details: itemUpdateHtml });


    // context.response.writePage(formElements.form);




    // Submit to our map/reduce script to update the items



    // FIXME: Enable this code once we're ready to move the original files to the session subfolder

    // var sourceFileObjs = validationOutput.validatedFiles.map(function (parsedFile) {
    //     return parsedFile.sourceFileObj;
    // });

    // for (let sourceFile of sourceFileObjs) {
    //     if (sourceFile) {
    //         var fileId = FCLib.moveFileToFolder({
    //             fileObj: sourceFile,
    //             folderId: sessionSubfolder.sessionOriginalsFolder.id
    //         });
    //     }
    // }



    return true;



}
