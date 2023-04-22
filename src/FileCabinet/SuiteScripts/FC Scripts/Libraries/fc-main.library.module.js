var record,
    query,
    task,
    runtime,
    email,
    search,
    file,
    serverWidget,
    dayjs;

define(['N/record', 'N/query', 'N/task', 'N/runtime', 'N/email', 'N/search', 'N/file', 'N/ui/serverWidget', './dayjs.min.js'], main);

function main(recordModule, queryModule, taskModule, runtimeModule, emailModule, searchModule, fileModule, serverWidgetModule, dayjsModule) {
    record = recordModule;
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;
    search = searchModule;
    file = fileModule;
    serverWidget = serverWidgetModule;
    dayjs = dayjsModule;

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
                DisplayName: 'displayname',
                ItemType: 'itemtype',
                IsLotItem: 'islotitem',
                IsJIT: 'custitem_soft_comit',
                StandingJITQty: 'custitem_fc_zen_sft_comm_qty',
                StartJITQty: 'custitem_fc_am_jit_start_qty',
                RemainingJITQty: 'custitem_fc_am_jit_remaining',
                JITProducers: 'custitem_fc_zen_jit_producers',
            },
            File: {
                InternalId: 'id',
                Name: 'name',
                LastModifiedDate: 'lastmodifieddate'
            },
            ItemVendor: {
                VendorInternalId: 'vendor',
                PreferredVendor: 'preferredvendor'
            },
            Vendor: {
                InternalId: 'id',
                CompanyName: 'companyname',
            },
            Transaction: {
                InternalId: 'id',
                EntityInternalId: 'entity',
                DisplayName: 'trandisplayname',
                DueDate: 'duedate',
                ExternalId: 'externalid',
                MainDate: 'trandate',

            }
        },
        Folders: {
            // MAIN_TEMP_CACHE_FOLDER: 9114,   // PROD
            MAIN_TEMP_CACHE_FOLDER: {
                GetId: function () { return getEnvSpecificFolderId( this.Sandbox, this.Prod ); },
                Sandbox: 8605,
                Prod: 9114
            },
        },
        Sublists: {
        }
    };
    exports.Ids = Ids;


    var Settings = {
        PapaParse: {
            EXTRAS_COL_NAME: '__parsed_extra'

        },
        Ui: {
            Parameters: {
                HIDDEN_PERSISTENT_PARAMS_ID: 'custpage_hidden_persistent_params',
            },
            Fields: {
                HIDDEN_PERSISTENT_PARAMS_LABEL: 'Hidden Persistent Params',
            }
        }
    }
    exports.Settings = Settings;


    var Ui = {
        TableStyles: {
            Style1: {
                trStyleFuncs: [],
                tdStyleFuncs: [],
                tableStyle: 'border-collapse: collapse; margin: 15px 0; font-size: 1.2em; font-family: sans-serif; min-width: 400px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.15)',
                theadStyle: '',
                tbodyStyle: '',
                theadTrStyle: 'background-color: #009879; color: #ffffff; text-align: left',
                tbodyTrStyle: 'border-bottom: 1px solid #dddddd',
                thStyle: 'padding: 8px 11px',
                tdStyle: 'padding: 8px 11px',
            },
            Style2: {
                trStyleFuncs: [],
                tdStyleFuncs: [],
                tableStyle: 'border-collapse: collapse; margin: 15px 0; font-size: 1.2em; font-family: sans-serif; min-width: 400px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.15)',
                theadStyle: '',
                tbodyStyle: '',
                theadTrStyle: 'background-color: #ebab34; color: #ffffff; text-align: left',
                tbodyTrStyle: 'border-bottom: 1px solid #dddddd',
                thStyle: 'padding: 8px 11px',
                tdStyle: 'padding: 8px 11px',
            },
        },
        RadioButtonStyles: {
            Style1: 'height: 20px; width: 20px; vertical-align:middle;'
        },
        CheckboxStyles: {
            Style1: 'height: 20px; width: 20px; vertical-align:middle;',
            Style2: 'height: 20px; width: 20px; vertical-align:middle; background-color:#FF0000;',
        },
    };
    exports.Ui = Ui;




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
                var paginatedSQL = `
                    SELECT * 
                    FROM ( 
                        SELECT 
                            ROWNUM AS ROWNUMBER, 
                            * 
                        FROM (${sql}) 
                        ) 
                    WHERE ( 
                        ROWNUMBER BETWEEN ${paginatedRowBegin} AND ${paginatedRowEnd}
                        )
                    `;

                var queryResults = query.runSuiteQL({ query: paginatedSQL, params: queryParams }).asMappedResults();
                // var queryResults = query.runSuiteQL({ query: paginatedSQL }).asMappedResults();
                rows = rows.concat(queryResults);
                if (queryResults.length < 5000) { moreRows = false; }
                paginatedRowBegin = paginatedRowBegin + 5000;
            } while (moreRows);

        } catch (e) {
            log.error({ title: 'selectAllRows - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } });
            throw e;
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
            throw e;
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
            throw e;
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
            throw e;
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
                // isDynamic: true
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
        return folderId;

        // // Get the record.
        // let result = record.load({ type: record.Type.FOLDER, id: folderId, isDynamic: false });

        // return result;
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
            throw e;
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


    function sortArrayOfObjsByKeys(arr, keys = [], ascending = true) {
        var sortedArr = arr.sort(function (a, b) {
            for (let key of keys) {
                if (a[key] < b[key]) {
                    return ascending ? -1 : 1;
                }
                if (a[key] > b[key]) {
                    return ascending ? 1 : -1;
                }
            }
            return 0;
        });
        return sortedArr;
    }
    exports.sortArrayOfObjsByKeys = sortArrayOfObjsByKeys;


    function stripBomFirstChar(str) {
        if (str.charCodeAt(0) === 0xfeff) {
            return str.substr(1);
        }
        return str;
    }
    exports.stripBomFirstChar = stripBomFirstChar;




    function updatedConvertLookupTableToHTMLTable({
        data = [],
        fieldDefs = [],
        trStyleFuncs = [],
        tdStyleFuncs = [],
        tableStyle = '',
        theadStyle = '',
        tbodyStyle = '',
        theadTrStyle = '',
        tbodyTrStyle = '',
        thStyle = '',
        tdStyle = '',


    }) {
        let tableHtml = '';
        const tableElem = `<table style="${tableStyle}">`;
        const theadElem = `<thead style="${theadStyle}">`;
        const tbodyElem = `<tbody style="${tbodyStyle}">`;
        const theadTrElem = `<tr style="${theadTrStyle}">`;
        const thElem = `<th style="${thStyle}">`;
        const tbodyTrElem = (style) => { return `<tr style="${style}">`; };
        const tdElem = (style) => { return `<td style="${style}">`; };

        const fdLabel = 'Label';
        const fdGetTableElem = 'GetTableElem';


        // Build the table + header row
        tableHtml += tableElem;
        tableHtml += theadElem;
        tableHtml += theadTrElem;

        for (let fieldDef of fieldDefs) {
            tableHtml += thElem;
            tableHtml += fieldDef[fdLabel];
            tableHtml += '</th>';
        }

        tableHtml += '</tr>';


        // Build the body rows
        tableHtml += tbodyElem;
        for (let row of data) {
            let rowDynamicStylings = [];
            for (let trStyleFunc of trStyleFuncs) {
                rowDynamicStylings.push(trStyleFunc(row));
            }
            let rowStylings = [tbodyTrStyle, ...rowDynamicStylings].filter(Boolean).join(';');

            tableHtml += tbodyTrElem(rowStylings);

            for (let fieldDef of fieldDefs) {
                let cellDynamicStylings = [];
                for (let tdStyleFunc of tdStyleFuncs) {
                    cellDynamicStylings.push(tdStyleFunc(row));
                }
                let cellStylings = [tdStyle, ...cellDynamicStylings].filter(Boolean).join(';');

                tableHtml += tdElem(cellStylings);
                tableHtml += fieldDef[fdGetTableElem](row);
                tableHtml += '</td>';
            }
            tableHtml += '</tr>';
        }

        tableHtml += '</tbody>';
        tableHtml += '</table>';

        return tableHtml;

    }
    exports.updatedConvertLookupTableToHTMLTable = updatedConvertLookupTableToHTMLTable;




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
        specialElems = [],
        headerNameMap = {},
        hideFields = {},
        trStyleFuncs = [],
    } = {}) {
        let tableHtml = '';

        let internalFieldsWithMapping = [];
        let trStyleStr = '';

        function addStylingToElem(elem, styleStr) {
            if (styleStr) {
                let curStyleTag = elem.match(/style="(.*?)"/);
                if (curStyleTag) {
                    elem = elem.replace(curStyleTag[1], `${curStyleTag[1]};${styleStr}`);
                } else {
                    elem = elem.replace('>', ` style="${styleStr}">`);
                }
            }
            return elem;
        }

        if (data.length > 0) {
            // Validate specialElems to ensure that source field is present
            for (let specialElem of specialElems) {
                const fieldId = specialElem.valueSourceField;
                if (!fields.includes(fieldId)) {
                    throw new Error(`convertObjToHTMLTable - specialElems.sourceFromField ${fieldId} not found in fields`);
                }
            }

            // Map the header names to special headers, if provided
            for (var i = 0; i < fields.length; i++) {
                let origFieldName = fields[i];
                if (origFieldName in hideFields) {
                    continue;
                }

                let mappedFieldName = origFieldName;

                if (fields[i] in headerNameMap) {
                    mappedFieldName = headerNameMap[origFieldName];
                }
                // fields[i] = {
                internalFieldsWithMapping.push({
                    orig: origFieldName,
                    mapped: mappedFieldName
                });
            }

            var htmlHeader = '<thead>';
            htmlHeader += theadTrElem;

            // Add in Special Elements as first columns
            for (let specialElem of specialElems) {
                htmlHeader += thElem + specialElem.fieldDisplayName + '</th>';
            }

            // Now add in the rest of the fields
            for (var i = 0; i < internalFieldsWithMapping.length; i++) {
                htmlHeader += thElem + internalFieldsWithMapping[i].mapped + '</th>';
            }

            htmlHeader += '</tr></thead>';

            var htmlBody = '<tbody>';
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                let curTrElem = tbodyTrElem;

                if (trStyleFuncs.length > 0) {
                    trStyleDefs = [];
                    for (var j = 0; j < trStyleFuncs.length; j++) {
                        trStyleDefs.push(trStyleFuncs[j](row));
                    }
                    trStyleStr = trStyleDefs.join(';');
                    curTrElem = addStylingToElem(curTrElem, trStyleStr);
                }

                htmlBody += curTrElem;

                // FIX: Combine this into single loop

                // First add in Special Elements as first columns
                for (let elem of specialElems) {
                    const fieldId = elem.sourceFromField;
                    const fieldDisplayName = elem.fieldDisplayName;

                    // Build element id
                    let elemId = 'idSourceField' in elem ?
                        row[elem.idSourceField] :
                        `${elem.idPrefixPart1Str}_${elem.idPrefixPart2Str}_${row[elem.idUniqueSuffixSourceField]}`;

                    let name = 'nameSourceField' in elem ? row[elem.nameSourceField] : elemId;
                    let value = 'valueSourceField' in elem ? row[elem.valueSourceField] : '';
                    let checked = 'checkedSourceField' in elem ? row[elem.checkedSourceField] : '';


                    let val = null;
                    switch (elem.htmlElem) {
                        case 'input':
                            val = `<input type="${elem.type}" id="${elemId}" name="${name}" value="${value}">`;
                            break;
                        case 'checkbox':
                            val = `<input type="checkbox" id="${elemId}" name="${name}" value="${value}" ${checked}>`;
                            break;
                        case 'radio':
                            val = `<input type="radio" id="${elemId}" name="${name}" value="${value}" ${checked}>`;
                            break;
                    }
                    htmlBody += tdElem + val + '</td>';
                }

                for (var k = 0; k < internalFieldsWithMapping.length; k++) {
                    let thisField = internalFieldsWithMapping[k];

                    if (thisField.orig in hideFields) {
                        continue;
                    }

                    let val = row[thisField.orig];

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
        specialElems = [],
        headerNameMap = {},
        hideFields = {},
        trStyleFuncs = [],
    } = {}) {

        return exports.convertObjToHTMLTable({
            fields: fields,
            data: data,
            headerBGColor: headerBGColor,
            headerTextColor: headerTextColor,
            tableElem: `<table style="border-collapse: collapse; margin: 15px 0; font-size: 1.2em; font-family: sans-serif; min-width: 400px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.15)">`,
            theadTrElem: `<tr style="background-color: ${headerBGColor}; color: ${headerTextColor}; text-align: left">`,
            thElem: `<th style="padding: 8px 11px">`,
            tdElem: `<td style="padding: 8px 11px">`,
            tbodyTrElem: `<tr style="border-bottom: 1px solid #dddddd">`,
            specialElems: specialElems,
            headerNameMap: headerNameMap,
            hideFields: hideFields,
            trStyleFuncs: trStyleFuncs,
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
        log.debug({ title: 'map - in FCLib.pickFromObj', details: `obj: ${obj}, keys: ${keys}` });

        return keys.reduce((acc, key) => {
            if (obj && (key in obj)) {
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

    function getStandardDateString1(date = new Date()) {
        let dateObj = new Date(date);
        let year = dateObj.getFullYear();
        let month = dateObj.getMonth() + 1;
        let day = dateObj.getDate();
        return `${year}${month}${day}`;
    }
    exports.getStandardDateString1 = getStandardDateString1;

    function getStandardDisplayDateString1(date = new Date()) {
        let dateObj = new Date(date);
        let year = dateObj.getFullYear();
        let month = dateObj.getMonth() + 1;
        let day = dateObj.getDate();
        return `${month}/${day}/${year}`;
    }
    exports.getStandardDisplayDateString1 = getStandardDisplayDateString1;

    function getStandardDateTimeString1(date = new Date()) {
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
            context.request.parameters[exports.Settings.Ui.Parameters.HIDDEN_PERSISTENT_PARAMS_ID]
        );
    }
    exports.getPersistentParams = getPersistentParams;


    function looksLikeYes(val) {
        if (val === true || ((typeof val == 'number') && (val !== 0))) { return true; }
        if (val === false || val === 0) { return false; }
        return val.match(/^(?:y(?:es)?|t(?:rue)?)$/i) !== null;
    }
    exports.looksLikeYes = looksLikeYes;

    function looksLikeNo(val) {
        if (val === false || val === 0) { return true; }
        if (val === true || ((typeof val == 'number') && (val !== 0))) { return false; }
        return val.match(/^(?:n(?:o)?|f(?:alse)?)$/i) !== null;
    }
    exports.looksLikeNo = looksLikeNo;


    function condenseSimplifyString(str, toLower = true) {
        str = str.replace(/[^a-zA-Z0-9]/g, '');
        if (toLower) { str = str.toLowerCase(); }
        return str;

    }
    exports.condenseSimplifyString = condenseSimplifyString;


    function formatQueryRowsOnFieldDefs(fieldDefs, queryResultsRows) {
        let formattedRows = [];
        for (let i = 0; i < queryResultsRows.length; i++) {
            let queryRow = queryResultsRows[i];
            let formattedRow = {};

            for (let fieldDef of Object.values(fieldDefs)) {
                let fieldLabel = fieldDef.Label;
                let fieldVal = ('DefaultValue' in fieldDef) ? fieldDef.DefaultValue : '';

                if ('QuerySource' in fieldDef) {
                    let lookupVal = queryRow[fieldDef.QuerySource.fieldid];
                    if ((lookupVal !== null) && (lookupVal !== undefined) && (lookupVal != '')) {
                        fieldVal = lookupVal;

                        if ('RecastFunc' in fieldDef) { fieldVal = fieldDef.RecastFunc(fieldVal); }

                    }
                }

                formattedRow[fieldLabel] = fieldVal;

            }
            formattedRows.push(formattedRow);
        }
        return formattedRows;
    }
    exports.formatQueryRowsOnFieldDefs = formatQueryRowsOnFieldDefs;


    function extractParametersFromRequest(
        params,
        matchFunc = (paramName) => { return true; },
        parseFunc = (paramName) => { return paramName; },
        valueTransformFunc = (paramValue) => { return paramValue; }
    ) {
        let output = Object.entries(params).reduce(
            (matched, [paramName, value]) => {
                if (matchFunc(paramName)) {
                    let key = parseFunc(paramName)
                    matched[key] = valueTransformFunc(value);
                    return matched;
                }
                return matched;
            }, {}
        );
        return output;
    }
    exports.extractParametersFromRequest = extractParametersFromRequest;

    function getEnvSpecificFolderId(folderIdSb, folderIdProd) {
        const env = runtime.envType;
        if (env === runtime.EnvType.SANDBOX) { return folderIdSb; }
        if (env === runtime.EnvType.PRODUCTION) { return folderIdProd; }
        return null;
    }
    exports.getEnvSpecificFolderId = getEnvSpecificFolderId;

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
