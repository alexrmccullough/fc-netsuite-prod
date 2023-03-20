/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var
    jitCSVFolderID = 8138,
    csvOutErrorFieldName = 'Errors',
    csvRowErrorFlagField = '***HAS_ERROR',
    itemIdFieldName = "Item ID",
    jitStartQtyFieldName = "JIT Start Qty",
    REQUIRED_FIELD_NAMES = [itemIdFieldName, jitStartQtyFieldName];

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


function ParsedFile(
    sourceFileId = null,
    sourceFileName = null,
    sourceFileUrl = null,
    parsedData = [],
    parsingErrors = [],
    parsingMeta = {},
    errorOutput = [],
    itemsToUpdate = {}
) {
    this.sourceFileId = sourceFileId;
    this.sourceFileName = sourceFileName;
    this.sourceFileUrl = sourceFileUrl;
    this.parsedData = parsedData;
    this.parsingErrors = parsingErrors;
    this.parsingMeta = parsingMeta;
    this.errorOutput = errorOutput;
    this.itemsToUpdate = itemsToUpdate;
    this.rowsWithErrors = {};
    this.rowsWithDups = {};

    this.addErrorOutputLine = function (origRow = -1, errorMsg = '') {
        this.errorOutput.push({
            origRow: origRow,
            errorMsg: errorMsg
        });

        this.rowsWithErrors[origRow] = true;
    }

    this.addItemToUpdate = function (
        jitStartQty = -1,
        rowNum = -1,
        lineData = {}
    ){
        // FIX: Not sure how best to key this
        this.itemsToUpdate[rowData[itemIdFieldName]] = jitStartQty;
    }

    this.isErrorRow = function (row) {
        return (row in this.rowsWithErrors);
    }

    this.isDuplicateRow = function (row) {
        return (row in this.rowsWithDups);
    }
}



function parseJITCSVs(context, folderId) {
    var parsedFiles = [];
    try {
        let sql = "SELECT ID FROM File WHERE ( Folder = ? ) AND ( Name LIKE '%.csv' )";
        let queryResults = query.runSuiteQL({ query: sql, params: [folderId] });
        let files = queryResults.asMappedResults();

        for (let f of files) {
            let curFileObj = file.load({ id: f.id })
            // let rawErrors = [];

            let parsedFile = Papa.parse(curFileObj.getContents(), {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: 'greedy',
                // complete: function (results, theFile) {
                //     log.debug(results);
                // },
                // error: function (error) {
                    // rawErrors.push(error);
                // }
            });

            log.debug({ title: 'testParseJITCSVs - got data', details: { 'parsedData': parsedFile } });
            log.debug({ title: 'testParseJITCSVs - PapaParse errors', details: { 'errors': rawErrors } });

            parsedFiles.push(new ParsedFile(
                soureFileId = f.id,
                sourceFileName = curFileObj.name,
                sourceFileUrl = curFileObj.url,
                parsedData = parsedFile.data,
                parsingErrors = parsedFile.errors,
                parsingMeta = parsedFile.meta
            ));

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

function LineValidationError(message) {
    this.name = "LineValidationError";
    this.message = message;
}

function validateCSVData(context, parsedFiles, nsItemData) {
    var globalDupsDetected = {};

    for (let thisFile of parsedFiles) {
        // If csv data has no rows, create an error output row using the returned info from PapaParse
        if (!thisFile.parsedData.length) {
            if (thisFile.errors) {
                for (let err of thisFile.errors) {
                    thisFile.addErrorOutputLine(
                        origRow = err.row,
                        errorMsg = `${err.code}: ${err.message}`,
                    );
                }
            } else {
                thisFile.addErrorOutputLine(
                    origRow = -1,
                    errorMsg = 
                        `File name: ${thisFile.sourceFileName} 
                            Parsing this file failed. No extra info provided by the parser.`,
                );
            }

        } else { // We have errors and/or, so let's validate all of it
            // Loop through all error rows. Reject all error rows.
            for (let err of thisFile.errors) {
                // Add error ouput row, including new error description field 
                thisFile.addErrorOutputLine(
                    origRow = err.row,
                    errorMsg = `${err.code}: ${err.message}`,
                );
            }

            // Validate all data rows 
            for (let i = 0; i < thisFile.parsedData.length; i++) {
                let curLine = thisFile.parsedData[i];

                // Skip if row has pre-set error flag (we've already logged a PapaParse error)
                if (thisFile.isErrorRow(i)) {
                    continue;
                }

                try {
                    // Skip if line doesn't have all required fields?
                    for (let reqField of REQUIRED_FIELD_NAMES) {
                        if (!(reqField in curLine)) {
                            throw new LineValidationError(
                                `Missing required field: ${reqField}`
                            );
                        }
                    }

                    let itemId = curLine[itemIdFieldName];
                    let jitStartQty = curLine[jitStartQtyFieldName];

                    // Skip if Item ID is not recognized
                    if (!(itemId in nsItemData)) {
                        throw new LineValidationError(
                            `Unrecognized Item ID. Doesn't exist in database: ${itemId}`
                        );
                    }

                    // Skip if item is a duplicate.
                    // Also, remove 
                    if (itemId in thisFile.itemsToUpdate || itemId in globalDupsDetected) {
                        // FIX: Need to check for instantiated array before pushing
                        dupsDetected[itemId].push({
                            fileName: parsedFile.fileName,
                            row: i,
                        });

                        // FIX: Throw different kind of error? Or continue?
                        continue;
                    }

                    // Skip if invalid start qty
                    if (isNaN(jitStartQty)) {
                        throw new LineValidationError(
                            `Invalid number in ${jitStartQtyFieldName}: ${jitStartQty}`
                        );
                    }

                    // LINE PASSED validation. Let's add it to this file's Items to Update
                    thisFile.addItemToUpdate (
                        lineData = curLine,
                        jitStartQty =  jitStartQty,
                        rowNum = i
                    );


                } catch (e) {
                    log.debug({ title: 'validateCSVData - error', details: { 'error': e } });
                    thisFile.addErrorOutputLine(
                        origRow = i,
                        errorMsg = e.message,
                    );
                }
            }
        }
    }

    // DO: Review all ParseFile metadata to finish constructing error files and items to update

    return parsedFiles;
}

function getRequestHandle(context) {
    var parsedCSVs = parseJITCSVs(context, jitCSVFolderID);
    var jitItemSnapshot = getJITItemSnapshot(context);
    var results = validateCSVData(context, parsedCSVs, jitItemSnapshot);


    log.debug({ title: 'getRequestHandle - returning', details: { 'testCsvParseResults': testCsvParseResults } });

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
