/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var modulePathJitPoUtilityLibrary = './fc-jit.send-jit-po-utility.library.module.js';

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
    FCJITLib,
    Papa;


define(['N/file', 'N/https', 'N/log', 'N/ui/message', 'N/query', 'N/record', 'N/render', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/FC_MainLibrary', modulePathJitPoUtilityLibrary, '../Libraries/papaparse.min.js'], main);


function main(fileModule, httpsModule, logModule, messageModule, queryModule, recordModule, renderModule, runtimeModule, serverWidgetModule, urlModule, fcLibModule, fcJITLibModule, papaparseModule) {
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
    FCJITLib = fcJITLibModule;
    Papa = papaparseModule;


    function onRequest(context) {
        scriptURL = url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, returnExternalURL: false });



        if (context.request.method === 'GET')   //GET method means starting the assistant
        {
            let params = context.request.parameters;
            let form = serverWidget.createForm({
                title: 'Email JIT PO w/Shipping Labels'
            });

            // Add submit button
            form.addSubmitButton({
                label: 'Compare PO vs Labels'
            });


            let debugHtml = '';
            debugHtml += `<pre>params: ${JSON.stringify(params)}</pre><br><br>`;

            // Build date input fields for target SO start/end dates
            var captureSosStartDate = form.addField({
                id: FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID,
                type: serverWidget.FieldType.DATE,
                label: FCJITLib.Settings.Ui.Fields.CAPTURE_SOS_START_DATE_LABEL,
                // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
            });
            captureSosStartDate.isMandatory = true;


            // Set default value to today
            // captureSosStartDate.defaultValue = today;

            var captureSosEndDate = form.addField({
                id: FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID,
                type: serverWidget.FieldType.DATE,
                label: FCJITLib.Settings.Ui.Fields.CAPTURE_SOS_END_DATE_LABEL,
                // container: FCJITLib.Settings.Ui.FieldGroups.OPTIONS_FIELD_GROUP_ID
            });
            captureSosEndDate.isMandatory = true;


            // Make inlinehtml field to display debug info
            var debugField = form.addField({
                id: 'custpage_debug_field',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Debug'
            });
            debugField.defaultValue = debugHtml;

            // Build hidden field for persistent params
            params.custpage_last_action = 'enter_dates';
            FCJITLib.addPersistentParamsField(form, params);

            context.response.writePage(form);

        } else {                                //POST method - process step of the assistant
            let params = context.request.parameters;
            let persistentParams = JSON.parse(params[FCJITLib.Settings.Ui.Parameters.HIDDEN_PERSISTENT_PARAMS_ID]);

            let debugHtml = '';
            debugHtml += `<pre>params: ${JSON.stringify(params)}</pre><br><br>`;

            if (params.custpage_last_action === 'enter_dates') {
                // Build page to compare PO vs labels
                let form = buildPageComparePOvsLabels(context, persistentParams);

                FCJITLib.addPersistentParamsField(form, persistentParams);
                context.response.writePage(form);

            } else if (params.custpage_last_action === 'compare_po_vs_labels') {
                // Trigger email PO and write confirmation
                sendJITPOEmail(context, params);
                context.response.writePage(context)
            }

            context.response.write(debugHtml)


        }
    }

    return {
        onRequest: onRequest,
    };

}

function buildPageComparePOvsLabels(context, persistentParams) {

    let debugHtml = '';
    // let params = context.request.parameters;

    let form = serverWidget.createForm({
        title: 'Email JIT PO w/Shipping Labels'
    });

    // Add submit button
    form.addSubmitButton({
        label: 'Send Email'
    });

    // Build list of PO items counts
    //   Item Internal ID / Item Quantity
    //   Filter by:
    //      Is JIT?
    //      Doesn't already have Lot Number assigned

    // Steps: 
    //  1. Run query on PO items for JIT items
    //  2. Run query/search for JIT label data
    let sqlQuery = FCJITLib.buildQueryGetItemInfoFromPO(
        persistentParams.custpage_param_po_internalid
    );

    debugHtml += `<pre>sqlQuery: ${sqlQuery}</pre><br><br>`;

    let nestingKeys = ['itemid'];

    let queryResults = FCLib.sqlSelectAllRowsIntoNestedDict(
        sqlQuery,
        nestingKeys              // FIX: Replace with setting variable?
    );

    debugHtml += `<pre>queryResults: ${JSON.stringify(queryResults)}</pre><br><br>`;


    // Run query/search for labels, filtered by JIT items only
    let labelSearchParams = {
        vendorInternalIds: [persistentParams.custpage_param_vendor_internalid],
        itemIsJit: true,
        soShipStartDate: FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_START_DATE_ID,
        soShipEndDate: FCJITLib.Settings.Ui.Parameters.CAPTURE_SOS_END_DATE_ID,
    };

    let searchResults = FCShipLabelLib.runLotNumberedShippingLabelSearch(labelSearchParams);
    debugHtml += `<pre>searchResults: ${JSON.stringify(searchResults)}</pre><br><br>`;


    // Build dict of all items to display comparison between items/quantities that appear on 
    //   the PO vs the items/quantities that appear on the JIT label search
    //   Struture: 
    //      itemid > 
    //          poQty
    //          labelQty
    let itemIdKey = 'Item ID';
    let poQtyKey = 'Quantity on PO';
    let labelQtyKey = 'Quantity on Shipping Labels';

    let itemInfo = {};

    for (let itemId of Object.keys(queryResults)) {
        // Results of query in nested dict are in array format. 
        // Sum quantities across array
        let itemResults = queryResults[itemId];
        let poQty = itemResults.reduce((total, item) => total + item.itemquantity, 0);

        if (!(itemId in itemInfo)) {
            itemInfo[itemId] = {
                [poQtyKey]: poQty,
                [labelQtyKey]: 'none',
            };
        }
    }

    // We have to do more work to summarize the label results by itemid because the results
    //   by default group by lot number rather than itemid.
    // We do this work here so that we can use the same saved search that we use for all other label generation. 

    // First, we need to build a dict of line item counts. The saved search returns lines with duplicate item counts because
    //   it's showing detail by lot number. 
    let lineCounts = {};

    for (let labelSearchLine of searchResults.data) {
        let lineUniqueKey = labelSearchLine[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.TransLineUniqueKey];
        let itemId = labelSearchLine[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.ItemId];
        let lineQty = labelSearchLine[FCShipLabelLib.Searches.SHIPPING_LABEL_SS_MAIN_IDS.RequiredFields.ItemQty];

        // Take the first instance of the unique line key / line qty combo
        if (!(lineUniqueKey in lineCounts)) {
            lineQty = lineQty ? lineQty : 0;

            lineCounts[lineUniqueKey] = {
                lineQty: lineQty,
                itemId: itemId,
            }
        }
    }

    // Now we have the summarized item totals. 
    //   Add them into our comparison dict (itemInfo)


    for (let lineCount of Object.values(lineCounts)) {
        let itemId = lineCount.itemId;
        let lineQty = lineCount.lineQty;

        if (!(itemId in itemInfo)) {
            itemInfo[itemId] = {
                [poQtyKey]: 'none',
                [labelQtyKey]: lineQty,
            };
        } else {
            if (itemInfo[itemId][labelQtyKey] === 'none') {
                itemInfo[itemId][labelQtyKey] = lineQty;
            } else {
                itemInfo[itemId][labelQtyKey] += lineQty;
            }
        }
    }

    debugHtml += `<pre>itemInfo: ${JSON.stringify(itemInfo)}</pre><br><br>`;

    // Build table to display comparison
    //  First, add itemId as field in every entry 
    for (let itemId of Object.keys(itemInfo)) {
        itemInfo[itemId][itemIdKey] = itemId;
    }

    var comparisonTableHtml = FCLib.convertObjToHTMLTableStylized({
        fields: [itemIdKey, poQtyKey, labelQtyKey],
        data: itemInfo,
    });



    // Embed in an inlinehtml form field
    let comparisonTableHtmlField = form.addField({
        id: 'custpage_comptable_html_field',
        type: serverWidget.FieldType.INLINEHTML,
        label: 'Confirm PO vs Label Item Quantities'
    });
    comparisonTableHtmlField.defaultValue = comparisonTableHtml;








    persistentParams.custpage_last_action = 'compare_po_vs_labels';

    return form;

}