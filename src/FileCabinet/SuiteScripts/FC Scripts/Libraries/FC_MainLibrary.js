var query;

define(['N/query', 'N/task', 'N/runtime', 'N/email'], main);

function main(queryModule, taskModule, runtimeModule, emailModule) {
    query = queryModule;
    task = taskModule;
    runtime = runtimeModule;
    email = emailModule;

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
        Sublists: {
        }
    }
    var exports = {
        Form: {
        },
        Sublists: {
        },
        Searches: {
            // SoSearch: {
            //     FILTERS: [
            //         ["type", "anyof", "SalesOrd"],
            //         "AND",
            //         ["status", "anyof", "SalesOrd:D", "SalesOrd:B", "SalesOrd:E", "SalesOrd:F"],
            //         "AND",
            //         ["mainline", "is", "F"],
            //         "AND",
            //         ["closed", "is", "F"],
            //         "AND",
            //         ["taxline", "is", "F"],
            //         "AND",
            //         ["cogs", "is", "F"],
            //         "AND",
            //         ["shipping", "is", "F"]
            //     ]
            // }
        },
        Urls: {
            // PO_URL: '/app/accounting/transactions/purchord.nl?id=',
            // SO_URL: '/app/accounting/transactions/salesord.nl?id='
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
        }
    };
    exports.Ids = Ids;

    function lookupInternalItemType (itemType, isLotItem) {
        let itemLookupStr =  itemType + '.' + isLotItem;
        var convertedType = Lookups.ItemTypes[itemLookupStr];
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


    function writeCSVToFolder(fileName, contents, folderId) {
        let csvFile = file.create({
            name: fileName,
            contents: contents,
            folder: folderId,
            fileType: 'CSV'
        });
        let csvFileId = csvFile.save();

        return csvFileId;
    }
    exports.writeCSVToFolder = writeCSVToFolder;


    function sortObjValuesByKeyAsc(obj, ascending = true) {
        var keys = Object.keys(obj);
        var sortedKeys = keys.sort();
        if (!ascending) { sortedKeys.reverse(); }
        var sortedValues = new Array();
        for (var i = 0; i < sortedKeys.length; i++) {
            sortedValues.push(obj[sortedKeys[i]]);
        }
        return sortedValues;
    }
    exports.sortObjValuesByKeyAsc = sortObjValuesByKeyAsc;

    function stripBomFirstChar(str) {
        if (str.charCodeAt(0) === 0xfeff) {
            return str.substr(1);
        }
        return str;
    }
    exports.stripBomFirstChar = stripBomFirstChar;


    function submitMapReduceJob(scriptId, params) {
        var mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: scriptId,
            params: params
        });
        var mrTaskId = mrTask.submit();
        return mrTaskId;
    }

    function submitMapReduceTask(mrScriptId, mrDeploymentId, params) {
        // Store the script ID of the script to submit
        //
        // Update the following statement so it uses the script ID
        // of the map/reduce script record you want to submit
        const mapReduceScriptId = mrScriptId;

        // Create a map/reduce task
        //
        // Update the deploymentId parameter to use the script ID of
        // the deployment record for your map/reduce script
        let mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: mrScriptId,
            deploymentId: mrDeploymentId,
            params: params
        });

        // Submit the map/reduce task
        let mrTaskId = mrTask.submit();

        // Check the status of the task, and send an email if the
        // task has a status of FAILED
        //
        // Update the authorId value with the internal ID of the user
        // who is the email sender. Update the recipientEmail value
        // with the email address of the recipient.
        let taskStatus = task.checkStatus(mrTaskId);
        if (taskStatus.status === 'FAILED') {
            const authorId = -5;
            const recipientEmail = 'notify@myCompany.com';
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'Failure executing map/reduce job!',
                body: 'Map reduce task: ' + mapReduceScriptId + ' has failed.'
            });
        }

        // Retrieve the status of the search task
        let taskStatus2 = task.checkStatus({
            taskId: myTaskId
        });

        // Optionally, add logic that executes when the task is complete
        if (taskStatus.status === task.TaskStatus.COMPLETE) {
            // Add any code that is appropriate. For example, if this script created
            // a saved search, you may want to delete it.
        }
    }




    return exports;
}



