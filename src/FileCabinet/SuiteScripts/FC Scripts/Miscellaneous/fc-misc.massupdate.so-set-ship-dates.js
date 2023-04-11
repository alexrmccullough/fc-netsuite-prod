/**
* @NApiVersion 2.1
* @NScriptType MassUpdateScript
*/

define(['N/record'],
	function(record) {

		var scriptName = "fc_massupdate_set_so_shipdates.";
		
		function each(params) {
	
			var funcName = scriptName + "each " + params.type + " | " + params.id;
			
			try {
				let soRec = record.load({
					type: params.type, 
					id: params.id,
					isDynamic: false
				});

				let mainlineShipDate = soRec.getValue({
					fieldId: 'shipdate'
				});

				log.debug('mainlineShipDate', mainlineShipDate);

				// Loop through all transaction lines and update expected ship date to match
				let lineCount = soRec.getLineCount({
					sublistId: 'item'
				});

				for (let i = 0; i < lineCount; i++) {
					soRec.setSublistValue({
						sublistId: 'item',
						fieldId: 'expectedShipDate',
						line: i,
						value: new Date(mainlineShipDate)
					});
				}
				
				soRec.save();
				
				log.audit(funcName, "updated ship date");
				
			} catch (e) {
	    		log.error(funcName, "Unable to update ship dates on SO: " + e.toString());				
			}
		}

		return {
			each: each
		};
	}
);