/**
*@NApiVersion 2.1
*@NScriptType ScheduledScript
*/

var addrQuery = `
SELECT
Customer.EntityID AS customer_entityid,
Customer.id AS customer_internalid, 
Customer.companyName AS companyname,
AllAddresses.internalid AS address_internalid,
AllAddresses.label AS address_label,
AllAddresses.addressbookaddress AS address_addrbookid
FROM
Customer
LEFT OUTER JOIN EntityAddressBook AS AllAddresses ON
    (AllAddresses.Entity= Customer.ID)
LEFT OUTER JOIN CUSTOMRECORD_RD_ROUTE_ADDRESS_LOCATION As AddrLocMapping ON
    (AllAddresses.internalid = AddrLocMapping.custrecord_rd_ad_loc_map_address)

WHERE
AddrLocMapping.recordid IS NULL
AND AllAddresses.defaultshipping = 'T'
`;

// Goal: Create a new Customer Address-Location Mapping record for any address that does not yet have one.
//    Use the Accounting Preferences default Sales Order location for the new mapping.


define(['N/query', 
    'N/record', 
    'N/runtime', 
    'SuiteScripts/FC Scripts/Libraries/fc-main.library.module'
], 
    function (query, record, runtime, FCLib) {


        function executeScript(context) {
            // if (context.type !== context.InvocationType.USER_INTERFACE) {
            //     return;
            // }
            var user = runtime.getCurrentUser();

            try {
                
                let defaultLocation = user.getPreference({ name: 'DEFAULTSALESORDERLOCATION' });
                let addrQueryResults = FCLib.sqlSelectAllRows(addrQuery);

                for (let result of addrQueryResults) {
                    let addrMapRecord = record.create({
                        type: 'CUSTOMRECORD_RD_ROUTE_ADDRESS_LOCATION',
                    });
                    addrMapRecord.setValue({
                        fieldId: 'custrecord__rd_ad_loc_map_subsidiary',
                        value: 1,
                    });

                    addrMapRecord.setValue({
                        fieldId: 'custrecord_rd_ad_loc_map_customer',
                        value: result.customer_internalid,
                    });

                    addrMapRecord.setValue({
                        fieldId: 'custrecord_rd_ad_loc_map_location',
                        value: defaultLocation,
                    });

                    addrMapRecord.setValue({
                        fieldId: 'custrecord_rd_ad_loc_map_address',
                        value: result.address_internalid,
                    });

                    addrMapRecord.setValue({
                        fieldId: 'isinactive',
                        value: false,
                    });


                    addrMapRecord.save();
                }


                

            } catch (e) {
                log.error({ title: 'Error in execute', details: e });
        
            }

        };



        return {
            execute: executeScript
        };
    }
); 