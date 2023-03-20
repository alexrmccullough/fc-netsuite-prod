/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope Public
* @copyright 2023 Food Connects
* @author Alex McCullough alex.mccullough@gmail.com
* @description This Map/Reduce script sets the SuiteCommerce item image prefix field on the Item record. If the item has image files named after its ItemID in the SC image directory, the script sets the prefix as the ItemID so those images are used. Otherwise, it will set the prefix to match the item Brand's default prefix, as long as the Brand has a prefix set and the item setting is toggled to Default to Brand Image Prefix. 
*/

var 
	query,
	record,
    fcLib;



define( [ 'N/query', 'N/record', './Libraries/FC_MainLibrary' ], main );

function main( queryModule, recordModule, fcMainLib ) {

	query = queryModule;
	record = recordModule;
    fcLib = fcMainLib;
	
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
            Item.isLotItem AS islotitem,
            Item.displayname AS itemdisplayname,
            Item.custitem_fc_brand AS brandid,
            Item.custitem_fc_sc_imageprefix as itemimageprefix,
            Item.custitem_fc_usedefaultbrandscimages as itemusedefaultbrandimages,
            Brand.name AS brandname,
            Brand.custrecord_fc_sc_defaultbrandimageprefix AS brandscimageprefix,
            ImageFiles.hasscimages
        FROM
            Item
        LEFT OUTER JOIN
            (
                SELECT DISTINCT
                    REGEXP_REPLACE(File.name, '_[^_]+\.[a-zA-Z0-9]+$', '') as itemid,
                    1 AS HasSCImages
                FROM
                    File
                WHERE
                    (File.folder = '4458' AND File.fileType LIKE '%IMAGE%')
            ) AS ImageFiles 
            ON Item.itemid = ImageFiles.itemid
        LEFT OUTER JOIN
            CUSTOMRECORD_FC_PRODUCT_BRANDS AS Brand
            ON Item.custitem_fc_brand = Brand.id

        ORDER BY
            Item.displayname
		`;	
    log.audit( { title: 'getInputData - begin', details: sql} );	

	var queryParams = new Array();		
	var rows = selectAllRows( sql, queryParams );
    //var rows = selectSomeRows(130, sql, queryParams);    // useful for debugging
	log.audit( { title: 'getInputData - number of rows selected', details: rows.length } );	
	return rows;
}


function map( context ) {
    log.debug( { title: 'map - result', details: context } );
	let result = JSON.parse( context.value );  
	
    let newItemImagePrefix = result.itemexternalid;

    if (!result.itemhasscimages && result.brandscimageprefix && result.itemusedefaultbrandimages) {
        newItemImagePrefix = result.brandscimageprefix;
    }

    if (result.itemexternalid == 'WMR001'){
        log.debug( { title: 'WMR001 Watch', details: {'newItemImagePrefix': newItemImagePrefix} } );
    }
    
    try {
        // debug the type issue
        // let convertedType = exports.Lookups.ItemTypes[result.itemtype]; 
        let itemLookupStr =  result.itemtype + '.' + result.islotitem;
        var convertedType = fcLib.Lookups.ItemTypes[itemLookupStr];
        
        if (result.itemimageprefix != newItemImagePrefix){
            context.write({
                key: result.iteminternalid,
                value: {
                    oldItemImagePrefix: result.itemimageprefix,
                    newItemImagePrefix: newItemImagePrefix,
                    itemType: convertedType,
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

    //NOTE: We shouldn't ever have more than one value returned here due to how we designed the query. 
    // How should we deal with it if we do have > 1 result? 
    // Currently: Consider only the first result.
	let result = context.values.map( JSON.parse )[0];

    try {
        var changedRecordId = record.submitFields({
                type: result.itemType,
                id: context.key,
                values: {
                    // DO: Change to field internalId?
                    'custitem_fc_sc_imageprefix': result.newItemImagePrefix
                },
        });

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

    var recordChangeCt = 0;
    var changesMsg = '';

    context.output.iterator().each(function (key, value) {
        let thisVal = JSON.parse( value );
        recordChangeCt += thisVal.changeCt;
        changesMsg += thisVal.changedItemName + ' : '+ thisVal.changedFrom + ' >>> ' + thisVal.changedTo + '; ';
        return true;
    }); 
    log.audit({
        title: 'Record changes made',
        details: `Changed the custitem_fc_sc_imageprefix value in ${recordChangeCt} items: ${changesMsg}`
    });
}


// FIX: Use FCLib version 
function selectSomeRows (rowCount, sql, queryParams = new Array() ) {
	try {	
		var rows = new Array();						
        var queryResults = query.runSuiteQL( { query: sql, params: queryParams } ).asMappedResults();
        rows = queryResults.slice(0, rowCount);
									
	} catch( e ) {		
		log.error( { title: 'selectSomeRows - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } } );
	}	
	
	return rows;
}



// FIX: Use Library version instead.
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