/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope Public
*/

var 
	query,
	record;

define( [ 'N/query', 'N/record' ], main );

function main( queryModule, recordModule ) {

	query = queryModule;
	record = recordModule;
	
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };	    
}


function getInputData( context ) {

	var sql = `
        SELECT 
            Item.itemid AS itemexternalid,
            Item.id AS iteminternalid,
            Item.itemtype,
            Item.displayname AS itemdisplayname,
            Item.custitem_fc_brand AS brandid,
            Item.custitem_fc_sc_imageprefix as itemimageprefix,
            Brand.name AS brandname,
            Brand.custrecord_fc_sc_defaultbrandimageprefix AS brandscimageprefix,
            ImageFiles.hasscimages
        FROM
            Item
        LEFT OUTER JOIN
            (
                SELECT DISTINCT
                    SUBSTR(File.name, 0, INSTR(File.name, '_')-1) AS ItemId,
                    1 AS HasSCImages
                FROM
                    File
                WHERE
                    (File.folder = '4458' AND File.fileType LIKE '%IMAGE%')
            ) AS ImageFiles 
            ON Item.itemid = ImageFiles.ItemId
        LEFT OUTER JOIN
            CUSTOMRECORD_FC_PRODUCT_BRANDS AS Brand
            ON Item.custitem_fc_brand = Brand.id

        ORDER BY
            Item.displayname
		`;	
		
	var queryParams = new Array();		
	var rows = selectAllRows( sql, queryParams );
	log.audit( { title: 'getInputData - number of rows selected', details: rows.length } );	
	return rows;
}


function map( context ) {
    log.debug( { title: 'map - result', details: context } );
	let result = JSON.parse( context.value );  
	
    let newItemImagePrefix = result.itemexternalid;

    if (!result.itemhasscimages && result.brandimageprefix && result.itemusedefaultbrandimages) {
        newItemImagePrefix = result.brandimageprefix;
    }
    
    try {
        if (result.itemimageprefix != newItemImagePrefix){
            context.write({
                key: result.iteminternalid,
                value: {
                    oldItemImagePrefix: result.itemimageprefix,
                    newItemImagePrefix: newItemImagePrefix,
                    itemType: result.itemtype,
                    itemName: result.itemexternalid
                }
            });
        }
		
	} catch( e ) {		
		log.error( { title: 'map - error', details: { 'context': context, 'error': e } } );
	}		
	
}


function reduce( context ) {
	log.audit( { title: 'reduce - context', details: context } );
	let result = context.values.map( JSON.parse );

	try {
        if (result.oldItemImagePrefix != result.newItemImagePrefix){
            let thisRecord = record.load({
                type: result.itemType,
                id: context.key
            });

            thisRecord.submitFields(
                {
                    type: result.itemType,
                    id: context.key,
                    values: {
                        // DO: Change to field internalId
                        'custitem_fc_sc_imageprefix': result.newItemImagePrefix
                    }
                }
            );
        }
        context.write({
            key: context.key,
            value: {
                changeCt: 1,
                changeMsg: `Changed item ${result.itemName} custitem_fc_sc_imageprefix from ${result.oldItemImagePrefix} to ${result.newItemImagePrefix}`,
                changedItemName: result.itemName,
                changedFrom: result.oldItemImagePrefix,
                changedTo: result.newItemImagePrefix
            }
        })
	} catch( e ) {		
		log.error( { title: 'reduce - error', details: { 'context': context, 'error': e } } );
	}		
}


function summarize( context ) {
	log.audit( { title: 'summarize - context', details: context } );
    // Log details about the script's execution.
    log.audit({
        title: 'Usage units consumed',
        details: context.usage
    });
    log.audit({
        title: 'Concurrency',
        details: context.concurrency
    });
    log.audit({
        title: 'Number of yields',
        details: context.yields
    });

    let recordChangeCt = 0;
    let changesMsg = '';

    context.output.iterator().each(function (key, value) {
        log.debug('key, value', key + ' - ' + value);
        recordChangeCt += value.changeCt;
        changesMsg += `\t${value.changedItemName}: ${value.changedFrom} >>> ${item.changedTo}`;
        changesMsg += '\n';
        return true;
    });
    log.audit({
        title: 'Record changes made',
        details: `Changed the custitem_fc_sc_imageprefix value in ${recordChangeCt} items:\n` + changesMsg
    });
}


function selectAllRows( sql, queryParams = new Array() ) {
	try {	
		var moreRows = true;	
		var rows = new Array();						
		var paginatedRowBegin = 1;
		var paginatedRowEnd = 5000;						

		do {			
			var paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ' ) ) WHERE ( ROWNUMBER BETWEEN ' + paginatedRowBegin + ' AND ' + paginatedRowEnd + ')';
			var queryResults = query.runSuiteQL( { query: paginatedSQL, params: queryParams } ).asMappedResults(); 	
			rows = rows.concat( queryResults );	
			if ( queryResults.length < 5000 ) { moreRows = false; }
			paginatedRowBegin = paginatedRowBegin + 5000;
		} while ( moreRows );
															
	} catch( e ) {		
		log.error( { title: 'selectAllRows - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } } );
	}	
	
	return rows;

}