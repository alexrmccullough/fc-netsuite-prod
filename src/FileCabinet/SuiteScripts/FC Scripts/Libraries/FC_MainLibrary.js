var query,
    task,
    runtime,
    email,
    search;

define(['N/query', 'N/task', 'N/runtime', 'N/email', 'N/search'], main);

function main(queryModule, taskModule, runtimeModule, emailModule, searchModule) {
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;
    search = searchModule;

    var exports = {
        Form: {
        },
        Sublists: {
        },
        Searches: {
        },
        Urls: {
        },
        Lookups: {
            ItemTypes: {
                //General items
                'Assembly': 'assemblyitem',
                'Description': 'descriptionitem',
                'Discount': 'discountitem',
                'GiftCert': 'giftcertificateitem',
                'InvtPart': 'inventoryitem',
                'Group': 'itemgroup',
                'Kit': 'kititem',
                'Markup': 'markupitem',
                'NonInvtPart': 'noninventoryitem',
                'OthCharge': 'otherchargeitem',
                'Payment': 'paymentitem',
                'Service': 'serviceitem',
                'Subtotal': 'subtotalitem',

                //Non-lot items
                //  .F suffix is used for queries on item.isLotItem = F
                'Assembly.F': 'assemblyitem',
                'Description.F': 'descriptionitem',
                'Discount.F': 'discountitem',
                'GiftCert.F': 'giftcertificateitem',
                'InvtPart.F': 'inventoryitem',
                'Group.F': 'itemgroup',
                'Kit.F': 'kititem',
                'Markup.F': 'markupitem',
                'NonInvtPart.F': 'noninventoryitem',
                'OthCharge.F': 'otherchargeitem',
                'Payment.F': 'paymentitem',
                'Service.F': 'serviceitem',
                'Subtotal.F': 'subtotalitem',

                //Lot-numbered items
                //  .T suffix is used for queries on item.isLotItem = T
                'InvtPart.T': 'lotnumberedinventoryitem'

            }
        },
        ModulePaths: {
            'netsuite-task-status': '/SuiteScripts/FC Scripts/Libraries/netsuite-task-status-master/src/task-status/task_status_sl.ts',
        }
    };

    var Ids = {
        Scripts: {
        },
        Fields: {
            Item: {
                InternalId: 'id',
                Name: 'itemid',
                ItemType: 'itemtype',
                IsLotItem: 'islotitem',
                IsJIT: 'custitem_soft_comit',
                StandingJITQty: 'custitem_fc_zen_sft_comm_qty',
                StartJITQty: 'custitem_fc_am_jit_start_qty',
                RemainingJITQty: 'custitem_fc_am_jit_remaining',
                JITProducers: 'custitem_fc_zen_jit_producers',
            }
        },
        Folders: {
            MAIN_TEMP_CACHE_FOLDER: 9114,
        },
        Sublists: {
        }
    }
    exports.Ids = Ids;




    function lookupInternalItemType(itemType, isLotItem) {
        let itemLookupStr = itemType + '.' + isLotItem;
        let convertedType = exports.Lookups.ItemTypes[itemLookupStr];
        return convertedType;
    }
    exports.lookupInternalItemType = lookupInternalItemType;


    function sqlSelectAllRows(sql, queryParams = new Array()) {
        try {
            var moreRows = true;
            var rows = new Array();
            var paginatedRowBegin = 1;
            var paginatedRowEnd = 5000;

            do {
                var paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ' ) ) WHERE ( ROWNUMBER BETWEEN ' + paginatedRowBegin + ' AND ' + paginatedRowEnd + ')';
                var queryResults = query.runSuiteQL({ query: paginatedSQL, params: queryParams }).asMappedResults();
                rows = rows.concat(queryResults);
                if (queryResults.length < 5000) { moreRows = false; }
                paginatedRowBegin = paginatedRowBegin + 5000;
            } while (moreRows);

        } catch (e) {
            log.error({ title: 'selectAllRows - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } });
        }

        return rows;

    };
    exports.sqlSelectAllRows = sqlSelectAllRows;


    function sqlSelectAllRowsIntoDict(sql, dictKey, queryParams = new Array()) {
        // Note: This assumes that the key has no duplicates across all rows. 
        // Otherwise, we will overwrite the previous value.
        let rows;
        let dict;
        try {
            rows = sqlSelectAllRows(sql, queryParams);
            dict = Object.fromEntries(rows.map(row => [row[dictKey], row]));

        } catch (e) {
            log.error({ title: 'selectAllRows - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } });
        }

        return dict;
    }
    exports.sqlSelectAllRowsIntoDict = sqlSelectAllRowsIntoDict;


    function sqlSelectAllRowsIntoNestedDict(sql, keys = [], queryParams = new Array()) {
        let mappedResults;
        let dict;

        try {
            mappedResults = sqlSelectAllRows(sql, queryParams);
            dict = exports.createNestedDictFromObjArray(mappedResults, keys);

        } catch (e) {
            log.error({ title: 'sqlSelectAllRowsIntoNestedDict - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } });
        }

        return dict;
    }
    exports.sqlSelectAllRowsIntoNestedDict = sqlSelectAllRowsIntoNestedDict;


    function createNestedDictFromObjArray(objArray, keys = []) {
        // Assume that every key can have duplicate entries. 
        // Create nested dict structure with the nestedKeys.
        let dict = {};
        let key = keys[0];

        try {
            if (keys.length == 0) {
                return objArray;
            }

            for (let row of objArray) {
                if (row[key]) {
                    if (!dict[row[key]]) {
                        dict[row[key]] = [];
                    }
                    dict[row[key]].push(row);
                }
            }

            for (const [key, val] of Object.entries(dict)) {
                dict[key] = exports.createNestedDictFromObjArray(dict[key], keys.slice(1));
            }

            return dict;

        } catch (e) {
            log.error({ title: 'createNestedDictFromObjArray - error', details: { 'params': [objArray, keys], 'error': e } });
        }

        return dict;
    }
    exports.createNestedDictFromObjArray = createNestedDictFromObjArray;


    function simpleObjCopy(obj) {
        var newObj = {};
        for (k in obj) {
            newObj[k] = obj[k];
        }
        return newObj;
    }
    exports.simpleObjCopy = simpleObjCopy;


    function createFolderInFileCabinet(folderName, parentFolderId = null) {
        var objRecord = record.create(
            {
                type: record.Type.FOLDER,
                isDynamic: true
            }
        );

        // Set the folder name.
        objRecord.setValue({ fieldId: 'name', value: folderName });

        // If this is a subfolder...
        if (parentFolderId != null) {
            objRecord.setValue({ fieldId: 'parent', value: parentFolderId });
        }

        // Save the record.
        var folderId = objRecord.save();

        // Get the record.
        let result = record.load({ type: record.Type.FOLDER, id: folderId, isDynamic: false });

        return result;
    }
    exports.createFolderInFileCabinet = createFolderInFileCabinet;


    function moveFileToFolder({
        fileId = null,
        fileObj = null,
        folderId = null,
    } = {}) {
        try {
            if (fileObj === null) {
                if (fileId !== null) {
                    fileObj = file.load({ id: fileId });
                } else {
                    throw new Error('moveFileToFolderByID - fileId or fileObj must be provided');
                }
            }

            fileObj.folder = folderId;
            fileObj.save();
        } catch (e) {
            log.error({ title: 'moveFileToFolder - error', details: { 'fileId': fileId, 'folderId': folderId, 'error': e } });
        }
        return true;
    }
    exports.moveFileToFolder = moveFileToFolder;


    function writeFileToFileCabinet(type, fileName, contents, folderId) {
        type = type.toLowerCase();
        switch (type) {
            case 'csv':
                type = file.Type.CSV;
            case 'json':
                type = file.Type.JSON;
            case 'pdf':
                type = file.Type.PDF;
            case 'plain_text':
                type = file.Type.PLAINTEXT;
        }

        let fileObj = file.create({
            name: fileName,
            fileType: type,
            contents: contents,
            folder: folderId
        });
        let fileId = fileObj.save();

        return fileId;
    }
    exports.writeFileToFileCabinet = writeFileToFileCabinet;




    function mapObjToSortedListByKey(obj, ascending = true) {
        var keys = Object.keys(obj);
        var sortedKeys = keys.sort();
        if (!ascending) { sortedKeys.reverse(); }
        var sortedValues = new Array();
        for (var i = 0; i < sortedKeys.length; i++) {
            sortedValues.push(obj[sortedKeys[i]]);
        }
        return sortedValues;
    }
    exports.mapObjToSortedListByKey = mapObjToSortedListByKey;


    function sortArrayOfObjsByKey(arr, key, ascending = true) {
        var sortedArr = arr.sort(function (a, b) {
            if (a[key] < b[key]) {
                return ascending ? -1 : 1;
            }
            if (a[key] > b[key]) {
                return ascending ? 1 : -1;
            }
            return 0;
        });
        return sortedArr;
    }

    exports.sortArrayOfObjsByKey = sortArrayOfObjsByKey;


    function stripBomFirstChar(str) {
        if (str.charCodeAt(0) === 0xfeff) {
            return str.substr(1);
        }
        return str;
    }
    exports.stripBomFirstChar = stripBomFirstChar;


    function convertObjToHTMLTable({
        fields = [],
        data = [],
        headerBGColor = '#009879',
        headerTextColor = '#ffffff',
        tableElem = '<table>',
        theadTrElem = '<tr>',
        thElem = '<th>',
        tdElem = '<td>',
        tbodyTrElem = '<tr>',
        specialElems = []
    } = {}) {

        var tableHtml = '';

        if (data.length > 0) {
            var htmlHeader = '<thead>';
            htmlHeader += theadTrElem;

            for (var i = 0; i < fields.length; i++) {
                htmlHeader += thElem + fields[i] + '</th>';
            }

            htmlHeader += '</tr></thead>';

            var htmlBody = '<tbody>';
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                htmlBody += tbodyTrElem;
                for (var j = 0; j < fields.length; j++) {
                    let field = fields[j];
                    let val = '';
                    // Determine the value of what goes in here
                    if (field in specialElems) {
                        const elem = specialElems[field];

                        // Build element id
                        let elemId =
                            `${elem.idPrefixPart1Str}_${elem.idPrefixPart2Str}_${row[elem.idUniqueSuffixPart1Field]}`;

                        switch (elem.htmlElem) {
                            case 'input':
                                val = `<input type="${elem.type}" id="${elemId}" name="${elemId}" value="${row[elem.defaultValueField]}">`;
                        }

                    } else {
                        val = row[field];
                    }

                    htmlBody += tdElem + val + '</td>';
                }
                htmlBody += '</tr>';
            }
            htmlBody += '</tbody>';

            tableHtml = tableElem + htmlHeader + htmlBody + '</table>';
        }

        return tableHtml;
    }
    exports.convertObjToHTMLTable = convertObjToHTMLTable;


    function convertObjToHTMLTableStylized({
        fields = [],
        data = [],
        headerBGColor = '#009879',
        headerTextColor = '#ffffff',
        specialElems = []
    } = {}) {

        return exports.convertObjToHTMLTable({
            fields: fields,
            data: data,
            headerBGColor: headerBGColor,
            headerTextColor: headerTextColor,
            tableElem: `<table style="border-collapse: collapse; margin: 25px 0; font-size: 0.9em; font-family: sans-serif; min-width: 400px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.15)">`,
            theadTrElem: `<tr style="background-color: ${headerBGColor}; color: ${headerTextColor}; text-align: left">`,
            thElem: `<th style="padding: 12px 15px">`,
            tdElem: `<td style="padding: 12px 15px">`,
            tbodyTrElem: `<tr style="border-bottom: 1px solid #dddddd">`,
            specialElems: specialElems
        });

    }
    exports.convertObjToHTMLTableStylized = convertObjToHTMLTableStylized;


    function addDaysToDate(date, numDays) {
        let newDate = new Date(date);
        newDate.setDate(newDate.getDate() + numDays);
        return newDate;
    }
    exports.addDaysToDate = addDaysToDate;

    function convertCSVStringToHTMLTableStylized({
        csvString = '',
        headerBGColor = '#009879',
        headerTextColor = '#ffffff'
    } = {}) {

        let parsed = Papa.parse(
            csvString,
            {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: 'greedy',
            }
        );

        return exports.convertObjToHTMLTableStylized({
            fields: parsed.meta.fields,
            data: parsed.data,
            headerBGColor: headerBGColor,
            headerTextColor: headerTextColor,
        });
    }
    exports.convertCSVStringToHTMLTableStylized = convertCSVStringToHTMLTableStylized;


    function getTextFileContents(fileId) {
        var fileObj = file.load({ id: fileId });
        var fileContents = fileObj.getContents();
        return fileContents;
    }
    exports.getTextFileContents = getTextFileContents;


    function getFileUrl(fileId) {
        var fileObj = file.load({ id: fileId });
        var fileUrl = fileObj.url;
        return fileUrl;
    }
    exports.getFileUrl = getFileUrl;


    function pickFromObj(obj, keys) {
        return keys.reduce((acc, key) => {
            if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
                acc[key] = obj[key];
            }
            return acc;
        }, {});
    }
    exports.pickFromObj = pickFromObj;

    function generateRandomNumberXDigits(x) {
        return Math.floor(Math.random() * Math.pow(10, x));
    }
    exports.generateRandomNumberXDigits = generateRandomNumberXDigits;

    function getStandardDateString1(date) {
        let dateObj = new Date(date);
        let year = dateObj.getFullYear();
        let month = dateObj.getMonth() + 1;
        let day = dateObj.getDate();
        return `${year}${month}${day}`;
    }
    exports.getStandardDateString1 = getStandardDateString1;

    function getStandardDateTimeString1(date) {
        let dateObj = new Date(date);
        let year = dateObj.getFullYear();
        let month = dateObj.getMonth() + 1;
        let day = dateObj.getDate();
        let hours = dateObj.getHours();
        let minutes = dateObj.getMinutes();
        let seconds = dateObj.getSeconds();
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }
    exports.getStandardDateTimeString1 = getStandardDateTimeString1;


    function generateTimestampedFilename(prefix, fileExt, date = new Date()) {
        const curDateTimeStr = exports.getStandardDateTimeString1(date);
        // If fileExt doesn't start with ., add it
        if (fileExt.charAt(0) !== '.') {
            fileExt = '.' + fileExt;
        }
        return prefix + curDateTimeStr + fileExt;
    }
    exports.generateTimestampedFilename = generateTimestampedFilename;


    function runSearch(savedSearchId, filters = []) {
        let searchObj = search.load({
            id: savedSearchId
        });

        filters.forEach(filter => {
            searchObj.filters.push(filter);
        });

        let pagedData = searchObj.runPaged({ pageSize: 1000 });
        // let resultCount = pagedData.count;

        let mappedRows = [];
        let mappedColumns = {};

        let buildColumnKey = (columnObj) => {
            let currentColumnKeys = Object.keys(mappedColumns);
            let newColKey = columnObj.join ? columnObj.join + '.' + columnObj.name : columnObj.name;
            let colKeyExists = currentColumnKeys.includes(newColKey);
            if (colKeyExists) {
                let colKeyCount = currentColumnKeys.filter(key => key.startsWith(newColKey)).length;
                newColKey = newColKey + '_' + colKeyCount;
            }
            return newColKey;
        };

        let mappedColKeys = [];

        for (let pageRange of pagedData.pageRanges) {
            let page = pagedData.fetch({ index: pageRange.index });
            // Add result value / text to the mappedResults array
            for (let resultObj of page.data) {
                if (Object.keys(mappedColumns).length === 0) {
                    for (let columnObj of resultObj.columns) {
                        // Need to build a lookup of unique columnKey => columnObj
                        // Column key should append _1, _2, etc. if there are multiple columns with the same name
                        let colKey = buildColumnKey(columnObj);
                        mappedColumns[colKey] = {
                            KEY: colKey,
                            COLUMN_OBJ: columnObj,
                            name: columnObj.name,
                            label: columnObj.label,
                            join: columnObj.join,
                            formula: columnObj.formula,
                            function: columnObj.function,
                            summary: columnObj.summary,
                            sort: columnObj.sort,
                            group: columnObj.group,
                        };

                        mappedColKeys.push(colKey);
                    }
                }

                // Add result value / text to the mappedResults array
                let mappedRow = {};
                for (let colKey of mappedColKeys) {
                    let columnObj = mappedColumns[colKey].COLUMN_OBJ;
                    mappedRow[colKey] = {
                        value: resultObj.getValue(columnObj),
                        text: resultObj.getText(columnObj)
                    };
                }

                mappedRows.push(mappedRow);
                // }
            }
        }

        return {
            columns: mappedColumns,
            rows: mappedRows
        };
    }
    exports.runSearch = runSearch;


    function addPersistentParamsField(assistant, params) {
        // Add a hidden field to hold persistentParams
        let hiddenPersistentParamsField = assistant.addField({
            id: exports.Settings.Ui.Parameters.HIDDEN_PERSISTENT_PARAMS_ID,
            type: serverWidget.FieldType.LONGTEXT,
            label: exports.Settings.Ui.Fields.HIDDEN_PERSISTENT_PARAMS_LABEL,
        });
        hiddenPersistentParamsField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        hiddenPersistentParamsField.defaultValue = JSON.stringify(params);
    }
    exports.addPersistentParamsField = addPersistentParamsField;


    function getPersistentParams(context) {
        return JSON.parse(
            context.request.parameters[ThisAppLib.Settings.Ui.Parameters.HIDDEN_PERSISTENT_PARAMS_ID]
        );
    }
    exports.getPersistentParams = getPersistentParams;


    // function submitMapReduceTask(mrScriptId, mrDeploymentId, params) {
    //     // Store the script ID of the script to submit
    //     //
    //     // Update the following statement so it uses the script ID
    //     // of the map/reduce script record you want to submit
    //     const mapReduceScriptId = mrScriptId;

    //     // Create a map/reduce task
    //     //
    //     // Update the deploymentId parameter to use the script ID of
    //     // the deployment record for your map/reduce script
    //     let mrTask = task.create({
    //         taskType: task.TaskType.MAP_REDUCE,
    //         scriptId: mrScriptId,
    //         deploymentId: mrDeploymentId,
    //         params: params
    //     });

    //     // Submit the map/reduce task
    //     let mrTaskId = mrTask.submit();

    //     // Check the status of the task, and send an email if the
    //     // task has a status of FAILED
    //     //
    //     // Update the authorId value with the internal ID of the user
    //     // who is the email sender. Update the recipientEmail value
    //     // with the email address of the recipient.
    //     let taskStatus = task.checkStatus(mrTaskId);
    //     if (taskStatus.status === 'FAILED') {
    //         const authorId = -5;
    //         const recipientEmail = 'notify@myCompany.com';
    //         email.send({
    //             author: authorId,
    //             recipients: recipientEmail,
    //             subject: 'Failure executing map/reduce job!',
    //             body: 'Map reduce task: ' + mapReduceScriptId + ' has failed.'
    //         });
    //     }

    //     // Retrieve the status of the search task
    //     let taskStatus2 = task.checkStatus({
    //         taskId: myTaskId
    //     });

    //     // Optionally, add logic that executes when the task is complete
    //     if (taskStatus.status === task.TaskStatus.COMPLETE) {
    //         // Add any code that is appropriate. For example, if this script created
    //         // a saved search, you may want to delete it.
    //     }
    // }



    return exports;
}
