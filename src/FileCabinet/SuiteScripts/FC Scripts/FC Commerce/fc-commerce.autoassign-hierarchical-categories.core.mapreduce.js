/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope SameAccount
* @copyright 2023 Food Connects
* @author Alex McCullough alex.mccullough@gmail.com
* @description 
*/

var
    runtime,
    record,
    log,
    email,
    FCLib,
    ThisAppLib;

define([
    'N/runtime',
    'N/record',
    'N/log',
    'N/email',
    '../Libraries/fc-main.library.module',
    './fc-commerce.autoassign-hierarchical-categories.library.module'
], main);

function main(
    runtimeModule,
    recordModule,
    logModule,
    emailModule,
    fcMainLibModule,
    thisAppLibModule
) {
    runtime = runtimeModule;
    record = recordModule;
    log = logModule;
    email = emailModule;
    FCLib = fcMainLibModule;
    ThisAppLib = thisAppLibModule;

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
}


function getInputData(context) {
    var currentScript = runtime.getCurrentScript();

    // TESTING
    log.debug({ title: 'getInputData - TEST QUERY', details: 'start' });

    // const testSQL = ThisAppLib.Queries.COMMERCE_CATEGORY_HIERARCHY.BuildQuery();
    // log.debug({ title: 'getInputData - TEST QUERY', details: testSQL });
    // let testResults = FCLib.sqlSelectAllRows(
    //     testSQL,
    // );
    // log.debug({ title: 'getInputData - TEST QUERY', details: testResults });


    // Run our main queries: 
    //   1. Full category hierarchy
    //   2. All items with their current category assignments
    const sqlCatHierarchy = ThisAppLib.Queries.COMMERCE_CATEGORY_HIERARCHY.BuildQuery();
    let catHierarchyResults = FCLib.sqlSelectAllRowsIntoNestedDict(
        sqlCatHierarchy,
        [
            ThisAppLib.Queries.COMMERCE_CATEGORY_HIERARCHY.Columns.Leaf,
        ]
    );
    log.debug({ title: 'getInputData - catHierarchyResults', details: catHierarchyResults })

    const sqlItemCategories = ThisAppLib.Queries.ITEM_ASSIGNED_CATEGORIES.BuildQuery();
    let itemCategoriesResults = FCLib.sqlSelectAllRows(
        sqlItemCategories
    );

    log.debug({ title: 'getInputData - itemCategoriesResults', details: itemCategoriesResults })

    let delim;

    // Unpack the Category Hierachy results by splitting the category string into individual category ids
    delim = ThisAppLib.Queries.COMMERCE_CATEGORY_HIERARCHY.Delimiters.CommerceCat;
    log.debug({ title: 'getInputData - delim', details: delim });
    const catStrKey = ThisAppLib.Queries.COMMERCE_CATEGORY_HIERARCHY.Columns.CatHierStr;
    const catListKey = ThisAppLib.Queries.COMMERCE_CATEGORY_HIERARCHY.Columns.CatHierList;

    log.debug({ title: 'START getInputData - splitting cat hierarchy in catHierarchyResults' });
    for (let [key, values] of Object.entries(catHierarchyResults)) {
        for (let value of values) {
            log.debug({ title: 'ITER START - splitting cat hierarchy in catHierarchyResults', details: `key: ${key}, value: ${JSON.stringify(value)}` });
            value[catListKey] = value[catStrKey] ? value[catStrKey].split(delim) : null;
            log.debug({ title: 'ITER END - splitting cat hierarchy in catHierarchyResults', details: `key: ${key}, value: ${JSON.stringify(value)}` });
        }
    }
    log.debug({ title: 'DONE getInputData - splitting cat hierarchy in catHierarchyResults', details: catHierarchyResults });

    // Unpack the Item Categories results
    //   Omit items if they don't need category processing. Items don't need category processing if: 
    //      1. categories == null
    //   OR 2. item category set does not include all parent categories

    //   For each item, store:
    //      1. missing categories
    //      2. 
    let itemsToProcess = [];
    delim = ThisAppLib.Queries.ITEM_ASSIGNED_CATEGORIES.Delimiters.CommerceCat;
    const itemCatKey = ThisAppLib.Queries.ITEM_ASSIGNED_CATEGORIES.Columns.ItemCategories;
    const itemIntIdKey = ThisAppLib.Queries.ITEM_ASSIGNED_CATEGORIES.Columns.ItemInternalId;


    log.debug({ title: 'getInputData - START processing all items' });
    for (let result of itemCategoriesResults) {
        let itemIntId = result[itemIntIdKey];
        let itemCategoriesRaw = result[itemCatKey];
        if (itemCategoriesRaw === null) {
            continue;
        }

        // log.debug({
        //     title: 'getInputData - processing item',
        //     details: itemIntId + ' - itemCategoriesRaw: ' + itemCategoriesRaw
        // });

        // Split the category string into individual category ids
        let itemCategories = itemCategoriesRaw ?
            itemCategoriesRaw.split(delim) :
            [];

        // log.debug({ title: 'getInputData - itemCategories', details: itemCategories });

        // Verify that the item's category set includes all relevant parent categories
        let missingCats = new Set();
        // log.debug({title:'START loop through itemCategories'});
        for (let itemCat of itemCategories) {
            // log.debug({ title: `IN loop through itemCategories`, details: `itemCat: ${itemCat}` });
            let itemCatInstances = catHierarchyResults[itemCat];
            // log.debug({ title: `got itemCatInstances`, details: `itemCat: ${itemCat}, itemCatInstances: ${JSON.stringify(itemCatInstances)}` });

            if (itemCatInstances === null || itemCatInstances === undefined) { continue; }

            for (let itemCatInstance of itemCatInstances) {
                let parentCats = itemCatInstance[catListKey];
                // log.debug({ title: `IN loop through itemCatInstances - got parentCats`, details: `itemCat: ${itemCat}, catStrKey: ${catStrKey}, parentCats: ${JSON.stringify(parentCats)}` });

                if (parentCats === null || parentCats === undefined) { continue; }

                for (let parentCat of parentCats) {
                    // log.debug({ title: `IN loop through parentCats`, details: `parentCat: ${parentCat}` });
                    let numericCat = Number(parentCat);
                    if (!itemCategories.includes(parentCat)) {
                        missingCats.add(numericCat);
                    }
                }
            }
        }

        // log.debug({ title: 'getInputData - missingCats', details: missingCats });

        // If we have missing categories, then add one line to itemsToProcess for each category
        //   to which this item needs to be assigned.
        if (missingCats.size > 0) {
            missingCats.forEach(cat => {
                itemsToProcess.push({
                    itemIntId: itemIntId,
                    catIntId: cat
                });
            });
        }
    }

    log.debug({ title: 'getInputData - DONE processing all items', details: itemsToProcess });

    // throw new Error('STOPPING HERE');
    return itemsToProcess;

}


function map(context) {
    // log.debug({ title: 'map - result', details: context });
    let itemToProcess = JSON.parse(context.value);

    try {
        context.write({
            key: itemToProcess.catIntId,
            value: itemToProcess.itemIntId,
        });

    } catch (e) {
        log.error({ title: 'map - error', details: { 'context': context, 'error': e } });
    }

}


function reduce(context) {
    log.audit({ title: 'reduce - context', details: context });

    let itemMappings = context.values.map(JSON.parse);
    log.debug({ title: 'reduce - itemMappings', details: `key: ${context.key}, items: ${itemMappings}` });

    // We have a list of objects mapping itemIntId to catIntId to which the item needs to be assigned. 
    //   For each item in the list, attempt to assign the item to the Commerce Category.

    let successfulMappings = [];
    let failedMappings = [];

    let commCatRec;
    let commCatRecId;
    let globalErrorMsg = '';

    try {
        log.debug({ title: `reduce - mapping item to comm category`, details: `key: ${context.key}, itemMappings: ${itemMappings}` });

        commCatRec = record.load({
            type: 'commercecategory',
            id: Number(context.key),
            isDynamic: true
        });

        // // Load the item sublist
        // let itemSublist = commCat.getSublist({
        //     sublistId: 'items'
        // });

    } catch (e) {
        log.error({ title: 'reduce - error loading comm category', details: { 'context': context, 'error': e.message } });
        failedMappings = [...successfulMappings, ...failedMappings, ...itemMappings];
        successfulMappings = [];
        itemMappings = [];
        globalErrorMsg += `${e.message}\n}`;
    }

    log.debug({title: 'reduce - itemMappings after loading comm category', details: itemMappings});
    let itemId;
    while (itemMappings.length > 0) {
        try {
            itemId = itemMappings.pop();

            // Add a new line to the item sublist
            commCatRec.selectNewLine({
                sublistId: 'items'
            });

            commCatRec.setCurrentSublistValue({
                sublistId: 'items',
                fieldId: 'item',
                value: Number(itemId)    // Item internal id
            });

            // Set the isprimary field
            commCatRec.setCurrentSublistValue({
                sublistId: 'items',
                fieldId: 'isprimary',
                value: false
            });

            commCatRec.commitLine({ sublistId: 'items' });

            successfulMappings.push({
                [ThisAppLib.OutputFields.ItemInternalId]: itemId,
                [ThisAppLib.OutputFields.CategoryId]: context.key,
                [ThisAppLib.OutputFields.IsPrimary]: false,
                [ThisAppLib.OutputFields.ErrorMessage]: null
            });

        } catch (e) {
            log.error({ title: 'reduce - error', details: { 'context': context, 'error': e } });

            failedMappings.push({
                [ThisAppLib.OutputFields.ItemInternalId]: itemId,
                [ThisAppLib.OutputFields.CategoryId]: context.key,
                [ThisAppLib.OutputFields.ErrorMessage]: e.message
            });
        }
    }

    if (commCatRec) {
        try {
            commCatRecId = commCatRec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });

        } catch (e) {
            // If we failed to save, then all items failed.
            failedMappings = [...successfulMappings, ...failedMappings, ...itemMappings];
            successfulMappings = [];
            globalErrorMsg += `${e.message}\n}`;
        }
    }

    let changeNotes = {
        successfullyProcessed: successfulMappings,
        unsuccessfullyProcessed: failedMappings,
        globalErrorMsg: globalErrorMsg
    };

    log.audit({ title: 'reduce - change summary', details: `catId: ${context.key}, commCatRecId: ${commCatRecId}, changeNotes: ${JSON.stringify(changeNotes)} ` });

    context.write({
        key: context.key,
        value: changeNotes
    });
}


function summarize(context) {
    log.audit({ title: 'summarize - context', details: context });
    // Log details about the script's execution.
    log.audit({
        title: 'Metrics',
        details: `Usage: ${context.usage}, Concurrency: ${context.concurrency}, Yields: ${context.yields}`
    });

    // Send summary email to the user and to any default recipients. 
    // Build lists of succeeded and failed items
    let succeededItems = [];
    let failedItems = [];

    context.output.iterator().each((key, value) => {
        let changeInfo = JSON.parse(value);

        succeededItems = [...succeededItems, ...changeInfo.successfullyProcessed];
        failedItems = [...failedItems, ...changeInfo.unsuccessfullyProcessed];
    });

    // Build a formatted table for the email output
    let htmlSuccessTable = '';
    if (succeededItems.length > 0) {
        let successFieldDefs = [
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.ItemInternalId,
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.CommerceCategoryId,
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.IsPrimary,
        ];

        const successTableStyle = FCLib.Ui.TableStyles.Style1;

        succeededItems = FCLib.sortArrayOfObjsByKeys(
            succeededItems,
            [
                ThisAppLib.OutputFields.ItemInternalId,
                ThisAppLib.OutputFields.CategoryId,
            ]
        );

        htmlSuccessTable = FCLib.updatedConvertLookupTableToHTMLTable({
            data: succeededItems,
            fieldDefs: successFieldDefs,
            ...successTableStyle
        });
    }

    let htmlFailureTable = '';
    if (failedItems.length > 0) {
        let failureFieldDefs = [
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.ItemInternalId,
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.CommerceCategoryId,
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.SUCCESS_TABLE.Fields.IsPrimary,
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.FAILURE_TABLE.Fields.Error,
        ];

        const failureTableStyle = FCLib.Ui.TableStyles.Style1;

        failedItems = FCLib.sortArrayOfObjsByKeys(
            failedItems,
            [
                ThisAppLib.OutputFields.ItemInternalId,
                ThisAppLib.OutputFields.CategoryId,
            ]
        );

        htmlFailureTable = FCLib.updatedConvertLookupTableToHTMLTable({
            data: failedItems,
            fieldDefs: failureFieldDefs,
            ...failureTableStyle
        });
    }

    // Run a query or two to identify items that may have problematic Commerce Category setups that 
    //    can't be addressed within this script. 
    //    For example: 
    //      - Item is mapped to no categories
    //      - Item is mapped to Category 1 (Shop) and nothing else
    //      - Item is mapped to too many (4, 5, 6, 7+) categories
    const sqlOtherItemObservations = ThisAppLib.Queries.ITEMS_OTHER_OBSERVATIONS.BuildQuery();
    let otherObsResults = FCLib.sqlSelectAllRows(sqlOtherItemObservations);
    let htmlOtherObsTable = '';

    // Add a column to the results and populate it with a summarized observations
    if (otherObsResults.length > 0) {
        otherObsResults.forEach((row) => {
            let observations = [];
            const obsColumns = [
                ThisAppLib.Queries.ITEMS_OTHER_OBSERVATIONS.Columns.ErrItemNotAssigned,
                ThisAppLib.Queries.ITEMS_OTHER_OBSERVATIONS.Columns.ErrLowCategoryCount,
                ThisAppLib.Queries.ITEMS_OTHER_OBSERVATIONS.Columns.ErrItemNotLevel2,
                ThisAppLib.Queries.ITEMS_OTHER_OBSERVATIONS.Columns.ErrItemOverAssigned,
            ];

            obsColumns.forEach((col) => {
                if (row[col] !== null) {
                    observations.push(row[col]);
                }
            });

            row[ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.OTHER_OBSERVATIONS_TABLE.Fields.Observations.Id] = observations.join('; ');
        });

        let otherObsFieldDefs = [
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.OTHER_OBSERVATIONS_TABLE.Fields.ItemInternalId,
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.OTHER_OBSERVATIONS_TABLE.Fields.ItemName,
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.OTHER_OBSERVATIONS_TABLE.Fields.AssignedCategories,
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.OTHER_OBSERVATIONS_TABLE.Fields.MaxCatLevel,
            ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.OTHER_OBSERVATIONS_TABLE.Fields.Observations,
        ];

        const otherObsTableStyle = FCLib.Ui.TableStyles.Style1;

        otherObsResults = FCLib.sortArrayOfObjsByKeys(
            otherObsResults,
            [
                ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.OTHER_OBSERVATIONS_TABLE.Fields.ItemName,
            ]
        );

        htmlOtherObsTable = FCLib.updatedConvertLookupTableToHTMLTable({
            data: otherObsResults,
            fieldDefs: otherObsFieldDefs,
            ...otherObsTableStyle
        });
    }

    // Build the email body
    // const thisUserRec = runtime.getCurrentUser();
    // let userStr = `${thisUserRec.name} (${thisUserRec.id})`;

    let emailBody = ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.BuildBody(
        '',
        htmlSuccessTable,
        htmlFailureTable,
        htmlOtherObsTable,
    );

    log.debug({ title: 'summarize - emailBody', details: emailBody });

    let emailSubject = ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.BuildSubject();

    log.debug({ title: 'summarize - emailSubject', details: emailSubject });

    // Send the email
    email.send({
        author: ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.AuthorId,
        recipients: [
            // thisUserRec.email,
            ...ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.RecipientsEmails,
        ],
        cc: ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.CcEmails,
        bcc: ThisAppLib.EmailSettings.SUMMARIZE_EMAIL.BccEmails,
        body: emailBody,
        subject: emailSubject
    });


    log.audit({
        title: 'Assigned Commerce Categories to Items',
        details: `Successfully assigned ${succeededItems.length} categories. Failed to update ${failedItems.length} categories.}`
    });
}