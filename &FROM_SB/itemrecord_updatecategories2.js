/**
*@NApiVersion 2.x
*@NScriptType ClientScript
*/

define(['N/record','N/ui/dialog', 'N/log'], function (record, dialog, log) {

    function fieldChanged(context) {
        var currentRecord = context.currentRecord;
        
        if(context.fieldId == 'class'){
            var fieldIdCatLev1 = 'custitem_fc_product_category_scr';
            var fieldIdCatLev2 = 'custitem_fc_product_subcategory_scr';
            var fieldIdCatLev3 = 'custitem_fc_product_subsubcategory_scr';

            var classVal = currentRecord.getText({
                fieldId: 'class'
            });

            log.debug({
                title: 'fieldId: class', 
                details: classVal
            });

            // const reCategoryLev1 = newRegExp("^([^:]+)(?: : [^:]+)?(?: : [^:]*)?");
            // const reCategoryLev2 = newRegExp("^[^:]+ : ([^:]+)(?: : [^:]*)?");
            // const reCategoryLev3 = newRegExp("^[^:]+ : [^:]+ : ([^:]+)$");
            // const reCategoryAll = new RegExp("^([^:]+)(?: : )?([^:]*)(?: : )?([^:]*)$");

            var categories = classVal.match("^([^:]+)(?: : )?([^:]*)(?: : )?([^:]*)$");

            var catLev1 = categories[1].trim();
            var catLev2 = categories[2].trim();
            var catLev3 = categories[3].trim();
            
            log.debug({
                title:'categories',
                details: catLev1 + ', ' + catLev2 + ', ' + catLev3
            });

            currentRecord.setText({
                fieldId: fieldIdCatLev1,
                text: catLev1
                // ignoreFieldChange: true
            });

            currentRecord.setText({
                fieldId: fieldIdCatLev2,
                text: catLev2,
                ignoreFieldChange: true
            });

            currentRecord.setText({
                fieldId: fieldIdCatLev3,
                text: catLev3,
                ignoreFieldChange: true
            });

            var missingValues = [];

            if (currentRecord.getText({fieldId: fieldIdCatLev1}) != catLev1) {
                currentRecord.setText({
                    fieldId: fieldIdCatLev1,
                    text: ''
                    // ignoreFieldChange: true
                });
                missingValues.push({
                    fieldId: fieldIdCatLev1, 
                    fieldName: currentRecord.getField({fieldId: fieldIdCatLev1}).label,
                    value: catLev1
                });
            }

            if (currentRecord.getText({fieldId: fieldIdCatLev2}) != catLev2) {
                currentRecord.setText({
                    fieldId: fieldIdCatLev2,
                    text: ''
                    // ignoreFieldChange: true
                });
                missingValues.push({
                    fieldId: fieldIdCatLev2, 
                    fieldName: currentRecord.getField({fieldId: fieldIdCatLev2}).label,
                    value: catLev2
                });
            }

            if (currentRecord.getText({fieldId: fieldIdCatLev3}) != catLev3) {
                currentRecord.setText({
                    fieldId: fieldIdCatLev3,
                    text: ''
                    // ignoreFieldChange: true
                });
                missingValues.push({
                    fieldId: fieldIdCatLev3, 
                    fieldName: currentRecord.getField({fieldId: fieldIdCatLev3}).label,
                    value: catLev3
                });
            }

            if (missingValues.length > 0){
                var thisMessage = "Missing values in Item Category fields. These are used for SuiteCommerce filtering. Please manually add the following values in this Item Record:";
                for (var i = 0; i < missingValues.length; i++) {
                    var miss = missingValues[i];
                    thisMessage += "<br><br>   Field: " + miss.fieldName + "<br>      Value: " + miss.value;
                }
                
                dialog.alert({
                    title: 'Missing Item Category values',
                    message: thisMessage
                });

            }
              
        }
    }

    return {
        fieldChanged: fieldChanged
    };
    
});