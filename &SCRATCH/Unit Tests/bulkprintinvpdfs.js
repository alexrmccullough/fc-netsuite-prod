/**
* @NApiVersion 2.1
* @NScriptType MassUpdateScript
*/
debugger;

require([
    'N/record',
    'N/search',
    'N/render',
    'SuiteScripts/FC Scripts/Libraries/dayjs.min.js',
    'SuiteScripts/FC Scripts/Libraries/fc-main.library.module.js'
],
    function (record, search, render, dayjs, FCLib) {

        var scriptName = "FC_MU_BulkPrintInvoices.";

        let result = each({
            id: 1450,
            type: record.Type.INVOICE
        });

        function each(params) {
            try {
                const OUTPUT_PARENT_FOLDER_ID = 8605;

                // const condensedDate = FCLib.getStandardDateString1();
				const condensedDate = dayjs().format('YYYYMMDD');

                const condensedDateTime = FCLib.getStandardDateTimeString1();
                const randomNumber = Math.floor(Math.random() * 1000000);
                const outfolderName = `Invoice_PDFs_${condensedDate}`;

                // Test if the outfolder already exists. If not, create it
                let outfolderId = null;

                const sqlOutfolderQuery = `
				SELECT
					MediaItemFolder.id
				FROM
					MediaItemFolder
				WHERE
					MediaItemFolder.parent = '${OUTPUT_PARENT_FOLDER_ID}' 
					AND MediaItemFolder.name = '${outfolderName}'
				`;
                let sqlOutfolderResult = FCLib.sqlSelectAllRows(sqlOutfolderQuery);
                if (sqlOutfolderResult && sqlOutfolderResult.length > 0) {
                    outfolderId = sqlOutfolderResult[0].id;
                }
                else {
                    outfolderId = FCLib.createFolderInFileCabinet(outfolderName, OUTPUT_PARENT_FOLDER_ID);

                }


                let sqlFileCountQuery = `
				SELECT
					COUNT(File.id) AS filecount
					FROM 
						File 
					WHERE ( Folder = ${outfolderId} ) AND ( Name LIKE '%.pdf' )
			`;

                let fileCount = FCLib.sqlSelectAllRows(sqlFileCountQuery)[0].filecount;


                var funcName = scriptName + "each " + params.type + " | " + params.id;

                let invoiceDate = search.lookupFields({
                    type: params.type,
                    id: params.id,
                    columns: 'trandate'
                });

                let prettyInvDate = dayjs(invoiceDate.trandate).format('YYYYMMDD');
                let invoiceFileName = `FC_Invoice_printed-${condensedDate}_invdate-${prettyInvDate}_order-${fileCount + 1}_${params.id}.pdf`;


                let thisPdf = render.transaction({
                    entityId: Number(params.id),
                    printMode: render.PrintMode.PDF
                });

                thisPdf.folder = outfolderId;
                thisPdf.name = invoiceFileName;
                thisPdf.save();

            } catch (e) {
                log.error(scriptName, "Unable to create Invoice PDF: " + e.toString());
            }
        }
    }
);