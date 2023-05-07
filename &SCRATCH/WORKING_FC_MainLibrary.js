define([], function () {
    var Ids = {
        Scripts: {
        },
        Fields: {
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
		TypeMaps: {
			ItemTypes: {
				Assembly: 'assemblyitem',
				Description: 'descriptionitem',
				Discount: 'discountitem',
				GiftCert: 'giftcertificateitem',
				InvtPart: 'inventoryitem',
				Group: 'itemgroup',
				Kit: 'kititem',
				Markup: 'markupitem',
				NonInvtPart: 'noninventoryitem',
				OthCharge: 'otherchargeitem',
				Payment: 'paymentitem',
				Service: 'serviceitem',
				Subtotal: 'subtotalitem'
			}	
		}
    };
    exports.Ids = Ids;
    return exports;
});