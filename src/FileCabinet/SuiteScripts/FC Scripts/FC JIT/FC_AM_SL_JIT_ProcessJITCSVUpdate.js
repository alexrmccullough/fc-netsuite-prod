/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var
    folderIDMain = 8138,
    folderIDInputJITCSV = 8142,
    folderIDUploadResults = 8141,
    csvOutErrorFieldName = 'Errors',
    csvRowErrorFlagField = '***HAS_ERROR',
    itemIdFieldName = "ExternalID",
    jitStartQtyFieldName = "Start Quantity",
    REQUIRED_FIELD_NAMES = [itemIdFieldName, jitStartQtyFieldName],
    csvOriginalsSubfolderName = "Originals",
    papaParsedExtraColName = "__parsed_extra";

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
    Papa;

define(['N/file', 'N/https', 'N/log', 'N/ui/message', 'N/query', 'N/record', 'N/render', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/FC_MainLibrary', '../Libraries/papaparse.min.js'], main);


function main(fileModule, httpsModule, logModule, messageModule, queryModule, recordModule, renderModule, runtimeModule, serverWidgetModule, urlModule, fcLibModule, papaparseModule) {
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
    Papa = papaparseModule;

    return {

        onRequest: function (context) {

            scriptURL = url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, returnExternalURL: false });

            if (context.request.method == 'POST') {
                postRequestHandle(context);
            } else {
                getRequestHandle(context);
            }
        }
    }

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
            [csvOutErrorFieldName]: errorMsg
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
        this.itemsToUpdate[lineData[itemIdFieldName]] = jitStartQty;
    }

    this.isErrorRow = function (row) {
        return (row in this.errors);
    }

    this.getErrorCSV = function () {
        if (!this.errors || !this.errors.length == 0) {
            return null;
        }

        // Output fields = Error column + the original fields from the meta output
        let outputFields = [csvOutErrorFieldName].concat(this.parsingMeta.fields);

        // Sort the error output by original row number
        let sortedErrorData = FCLib.sortObjValuesByKeyAsc(this.errors, true);

        // Add extra column headers to fit all __parsed_extra columns, if they exist
        let maxParsedExtra = 0;
        for (let errorLine of sortedErrorData) {
            if (papaParsedExtraColName in errorLine) {
                lineExtraCols = errorLine[papaParsedExtraColName].length;
                maxParsedExtra = Math.max(maxParsedExtra, lineExtraCols);
                for (let i = 0; i < maxParsedExtra; i++) {
                    errorLine[papaParsedExtraColName + `_${i}`] = errorLine[papaParsedExtraColName][i];
                }
                // Delete the original __parsed_extra column
                delete errorLine[papaParsedExtraColName];
            }
        }

        // Add enough headers to the output fields to fit all the extra columns
        let extraFields = [];
        for (let i = 0; i < maxParsedExtra; i++) {
            extraFields.push(papaParsedExtraColName + `_${i}`);
        }

        outputFields = outputFields.concat(extraFields);

        // Output to csv via PapaParse
        let csvOutput = Papa.unparse({
            fields: outputFields,
            data: sortedErrorData,
            quotes: true,
            // quoteChar: '"'
        });

        return {
            fileName: this.sourceFileNameNoExt + '_ERRORS.csv',
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
        let sql = "SELECT ID FROM File WHERE ( Folder = ? ) AND ( Name LIKE '%.csv' )";
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

            log.debug({ title: 'testParseJITCSVs - got data', details: { 'parsedData': parsedFile } });

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
    let sql = `
        SELECT
            Item.itemId as itemname,
            Item.id AS internalid,
            Item.itemtype AS itemtype,
            Item.isLotItem AS islotitem,
            Item.custitem_soft_comit AS isjit,
            Item.custitem_fc_zen_sft_comm_qty AS standingjitqty,
            Item.custitem_fc_am_jit_start_qty AS startjitqty,
            Item.custitem_fc_am_jit_remaining AS remainjitqty,
            Item.custitem_fc_zen_jit_producers AS jitproducers,		
        FROM
            Item
        WHERE
            Item.custitem_soft_comit = 'T'
    `;

    let queryParams = new Array();
    let items = FCLib.sqlSelectAllRowsIntoDict(sql, 'itemname', queryParams);
    return items;

}


function getJITItemsOnFutureSOs(context, itemIds) {
    let sql = `
        SELECT
            SUM(Abs(TransactionLine.quantity)) as totalQty,
            Item.itemId as itemId

        FROM
            TransactionLine

        JOIN Item ON Item.id = TransactionLine.item
        JOIN Transaction ON Transaction.id = TransactionLine.transaction

        WHERE
            (Transaction.type = 'SalesOrd')
            AND   
            (Item.custitem_soft_comit = 'T') 
            AND 
            (Transaction.shipDate >= (SELECT SYSDATE FROM Dual))
            AND
            (Item.itemId IN (?))

        GROUP BY 
            Item.itemId
    `;

    let queryParams = [itemIds];
    let items = FCLib.sqlSelectAllRowsIntoDict(sql, 'itemId', queryParams);
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
        for (let reqField of REQUIRED_FIELD_NAMES) {
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
                    let itemId = curLine[itemIdFieldName];
                    let jitStartQty = curLine[jitStartQtyFieldName];

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
                            `Invalid number in ${jitStartQtyFieldName}: ${jitStartQty}`
                        );
                    }

                    // LINE PASSED validation. Let's add it to this file's Items to Update
                    thisFile.addItemToUpdate({
                        lineData: curLine,
                        jitStartQty: jitStartQty,
                        origRow: i
                    });


                } catch (e) {
                    log.debug({ title: 'validateCSVData - error', details: { 'error': e } });
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
        futureSOCounts = getJITItemsOnFutureSOs(context, Object.keys(itemsToUpdateFromCSV));
    }

    for (let itemId in nsJITSnapshot) {
        // Determine new JIT start qty. If it's different than the old JIT start qty, then we need to update
        let oldJITStartQty = nsJITSnapshot[itemId].startjitqty;
        let newJITStartQty = resetJITQuantities ? 0 : nsJITSnapshot[itemId].startjitqty;

        // If item present in itemsToUpdateFromCSV, override the default value
        // Otherwise, if item has a standing qty set, use that value
        if (itemId in itemsToUpdateFromCSV) {
            newJITStartQty = itemsToUpdateFromCSV[itemId];
        } else if (nsJITSnapshot[itemId].standingjitqty) {
            newJITStartQty = nsJITSnapshot[itemId].standingjitqty;
        }

        let newJITRemainingQty = subtractFutureJITSOs ?
            newJITStartQty - futureSOCounts[itemId] : 
            newJITStartQty;

        // If the new JIT start qty is different from the old JIT start qty
        //     1. Calculate the remaining JIT qty
        //     2. Update NS item with jitstartqty, jitremainingqty
        if (newJITStartQty != oldJITStartQty) {
            itemUpdateMaster[itemId] = {
                newJITStartQty: newJITStartQty,
                newJITRemainingQty: newJITRemainingQty,
            };
        }
    }

    return itemUpdateMaster;
}


function createSessionSubfolder(context) {
    const curDateTime = new Date();
    const curDateTimeStr = curDateTime.toISOString().replace(/:/g, '-');
    var resultsFolderName = `JIT_CSV_Upload_${curDateTimeStr}`;
    var resultsFolder = FCLib.createFolderInFileCabinet(resultsFolderName, folderIDUploadResults);
    var originalsFolder = FCLib.createFolderInFileCabinet(csvOriginalsSubfolderName, resultsFolder.id);

    return {
        sessionResultsFolder: resultsFolder,
        sessionOriginalsFolder: originalsFolder
    };
}


function getRequestHandle(context) {
    var parsedCSVs = parseJITCSVs(context, folderIDInputJITCSV);
    if (!parsedCSVs) {
        return false;
    }
    var jitItemSnapshot = getJITItemSnapshot(context);
    var validationOutput = validateCSVData(context, parsedCSVs, jitItemSnapshot);
    var itemUpdateMaster = buildItemUpdateMaster(context, jitItemSnapshot, validationOutput.itemsToUpdate);
    var sessionSubfolder = createSessionSubfolder(context);

    var errorTables = validationOutput.validatedFiles.map(function (parsedFile) {
        return parsedFile.getErrorCSV();
    });

    // REMOVE: Testing
    // Get the error table for the file named 'test1b.csv'
    // var testFile = validationOutput.validatedFiles.find(function (theFile) {
    //     return theFile.sourceFileName == 'test4.csv';
    // });

    // var testErrorTable = testFile.getErrorCSV();

    for (let errorTable of errorTables) {
        if (errorTable && errorTable.contents && !errorTable.isEmpty) {
            let fileId = FCLib.writeCSVToFolder(
                errorTable.fileName,
                errorTable.contents,
                sessionSubfolder.sessionResultsFolder.id
            );
        }
    }

    // Build a CSV of the items we're updating and save it as our "success" file
    // FIX: Prettify column headers
    // FIX: Add in original column headers? 
    let successHeaders = [newJITStartQty, newJITRemainingQty];
    let successOutputCSV = Papa.unparse({ 
        fields: successHeaders,
        data: itemUpdateMaster
    }); 

    let fileId = FCLib.writeCSVToFolder(
        'JIT_Upload_Success.csv',
        successOutputCSV,
        sessionSubfolder.sessionResultsFolder.id
    );





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

    var TEMP = 'Just pausing';
    // log.debug({ title: 'getRequestHandle - returning', details: { 'testCsvParseResults': testCsvParseResults } });

    return true;

    // if ( context.request.parameters.hasOwnProperty( 'function' ) ) {	
    // 	// if ( context.request.parameters['function'] == 'tablesReference' ) { htmlGenerateTablesReference( context ); }
    // 	if ( context.request.parameters['function'] == 'documentGenerate' ) { documentGenerate( context ); }				

    // } else {
    // 	var form = serverWidget.createForm( { title: `FC JIT PO Sending Tool`, hideNavBar: false } );		
    // 	var htmlField = form.addField(
    // 		{
    // 			id: 'custpage_field_html',
    // 			type: serverWidget.FieldType.INLINEHTML,
    // 			label: 'HTML'
    // 		}								
    // 	);

    // 	htmlField.defaultValue = htmlGenerateTool();						
    // 	context.response.writePage( form );					
    // }

}
