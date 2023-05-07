/**
* @NApiVersion 2.1
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/

var modulePathJitAvailUpdateLibrary = './fc-jit.update-jit-availablity.library.module.js';
var modulePathThisAppLibrary = './TEST.fc-jit.zero-jit-availability-assistant.library.module.js';

var
    file,
    log,
    record,
    runtime,
    serverWidget,
    url,
    FCLib,
    UpdateJitAvailLib,
    ThisAppLib;


define(['N/file', 'N/log', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/url', '../Libraries/fc-main.library.module.js', modulePathJitAvailUpdateLibrary, modulePathThisAppLibrary], main);


function main(
    fileModule,
    logModule,
    recordModule,
    runtimeModule,
    serverWidgetModule,
    urlModule,
    fcLibModule,
    updateJitAvailLibraryModule,
    thisAppLibraryModule
) {
    file = fileModule;
    log = logModule;
    record = recordModule;
    runtime = runtimeModule;
    serverWidget = serverWidgetModule;
    url = urlModule;
    FCLib = fcLibModule;
    UpdateJitAvailLib = updateJitAvailLibraryModule;
    ThisAppLib = thisAppLibraryModule;

    return {

        onRequest: function (context) {}
    }
}

