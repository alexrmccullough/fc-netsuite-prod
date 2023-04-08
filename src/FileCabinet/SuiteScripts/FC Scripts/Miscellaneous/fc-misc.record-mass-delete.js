/*
* Prolecto Resources: this is a generic delete using mass updates 
*/

/**
* @NApiVersion 2.x
* @NScriptType MassUpdateScript
*/

define(['N/record'],
	function(record) {

		var scriptName = "prolecto_MU_GenericDelete.";
		
		function each(params) {
	
			var funcName = scriptName + "each " + params.type + " | " + params.id;
			
			try {
				record.delete({type: params.type, id: params.id});
				log.audit(funcName, "deleted.");
				
			} catch (e) {
	    		log.error(funcName, "Unable to delete: " + e.toString());				
			}
		}

		return {
			each: each
		};
	}
);