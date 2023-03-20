/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

/* 

------------------------------------------------------------------------------------------
Script Information
------------------------------------------------------------------------------------------

Name:

ID:

Description


------------------------------------------------------------------------------------------
Developer(s)
------------------------------------------------------------------------------------------

Alex McCullough
alex.mccullough@gmail.com


------------------------------------------------------------------------------------------
History
------------------------------------------------------------------------------------------


*/

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
	url;

define( [ 'N/file', 'N/https', 'N/log', 'N/ui/message', 'N/query', 'N/record', 'N/render', 'N/runtime', 'N/ui/serverWidget', 'N/url' ], main );


function main( fileModule, httpsModule, logModule, messageModule, queryModule, recordModule, renderModule, runtimeModule, serverWidgetModule, urlModule ) {
    file = fileModule;
    https = httpsModule;
    log = logModule;
    message = messageModule;
    query= queryModule;
    record = recordModule;
    render = renderModule;
    runtime = runtimeModule;
    serverWidget = serverWidgetModule;	
    url = urlModule;

    return {
    
    	onRequest: function( context ) {     
    	
			scriptURL = url.resolveScript( { scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId, returnExternalURL: false } ); 
	    	    	
    		if ( context.request.method == 'POST' ) {     		    		
    			postRequestHandle( context );    			
    		} else {	
    			getRequestHandle( context );	
			}
    		    			
        }
        
    }

}



function htmlMainUI() {

	return `

		<div class="collapse" id="mainUI" style="text-align: left;">	
		
			<table style="table-layout: fixed; width: 100%; border-spacing: 6px; border-collapse: separate;">
				<tr>				
					<td width="10%">
						<h3 id="soDateRangeHeader" style="margin-bottom: 0px; color: #4d5f79; font-weight: 600;">Select SO Date Range</h3>
					</td>
					<td width="25%">
						<div class="container-fluid">
							<div class="row">
								<div class="col-md-6 col-sm-6 col-xs-12">
									<!-- Form code begins -->
									<form method="post">
										<div class="input-daterange input-group" id="datepicker">
											<input type="text" class="input-sm form-control" name="start" />
											<span class="input-group-addon">to</span>
											<input type="text" class="input-sm form-control" name="end" />
										</div>
									</form>
									<!-- Form code ends -->

								</div>
								<div id="dateButtons" style="float:left;">
								<button type="button" class="btn btn-sm btn-light" onClick="javascript:submitDate();">Load SOs</button>
								</div>
							</div>
						</div>

					</td>
					<td width="65%" style="text-align: right;">
						<div id="mainButtonsDiv">
							<button type="button" class="btn btn-sm btn-light" onClick="javascript:previewShippingLabelPDF();">Preview Shipping Label PDF</button>
							<button type="button" class="btn btn-sm btn-success" onclick="approveAndSend();" accesskey="r">Approve & Send Email</button>	
						</div>
					</td>									
				</tr>
				
				<tr id="poVsSOInfoDisplay">
					<td colspan="3" style="vertical-align: top;">

					</td>
				</tr>
				
						
			</table>
		
		</div>

	`;	

}



function htmlGenerateTool() {
			
	return `

		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
		<script src="/ui/jquery/jquery-3.5.1.min.js"></script>
		<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

    <!-- Bootstrap Date-Picker Plugin -->
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.4.1/js/bootstrap-datepicker.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.4.1/css/bootstrap-datepicker3.css"/>

    <!--CSS for data tables-->
		<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.25/css/jquery.dataTables.css">
 		<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.10.25/js/jquery.dataTables.js"></script>

		<style type = "text/css"> 
		
			input[type="text"], input[type="search"], textarea, button {
				outline: none;
				box-shadow:none !important;
				border: 1px solid #ccc !important;
			}
			
			p, pre {
				font-size: 10pt;
			}
			
			td, th { 
				font-size: 10pt;
				border: 3px;
			}
			
			th {
				text-transform: lowercase;
				font-weight: bold;				
			}
			
		</style>
				
		${htmlMainUI()}

		<script>	
		
			var
				activeSQLFile = {},
				queryResponsePayload,
				fileLoadResponsePayload;
			
			window.jQuery = window.$ = jQuery;
			
			$('#mainUI').show();
						
			${jqueryKeydownHandler()}
			${jqueryModalHandlers()}
			${jsDatePickerInstantiate()}

		</script>	
		
	`
	
}

function getRequestHandle( context ) {
				
	if ( context.request.parameters.hasOwnProperty( 'function' ) ) {	
		// if ( context.request.parameters['function'] == 'tablesReference' ) { htmlGenerateTablesReference( context ); }
		if ( context.request.parameters['function'] == 'documentGenerate' ) { documentGenerate( context ); }				
	
	} else {
		var form = serverWidget.createForm( { title: `FC JIT PO Sending Tool`, hideNavBar: false } );		
		var htmlField = form.addField(
			{
				id: 'custpage_field_html',
				type: serverWidget.FieldType.INLINEHTML,
				label: 'HTML'
			}								
		);

		htmlField.defaultValue = htmlGenerateTool();						
		context.response.writePage( form );					
	}
				
}

function jsDatePickerInstantiate() {
	return `
		$('.input-daterange input').datepicker({
			todayBtn: "linked",
			clearBtn: true,
			multidate: false
		});
	`;
}


function jqueryKeydownHandler() {
	return ``;
}

function jqueryModalHandlers() {
	return ``;
}