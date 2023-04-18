/**
 * Client script for the Task Status suitelet.
 *
 * @NScriptType ClientScript
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/amdconfig.json
 */
define(["require", "exports", "./lib/task_status_client"], function (require, exports, task_status_client_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Initialize the task status widget using parameters taken from the page and the url query string. *
     * @param ctx
     */
    function pageInit(ctx) {
        var suiteletURL = ctx.currentRecord.getValue({ fieldId: 'custpage_suitelet_url' });
        var getStatus = task_status_client_1.statusGetter(suiteletURL);
        var query = window.location.search;
        var params = new URLSearchParams(query);
        var paramMap = params.get('map');
        var paramReduce = params.get('reduce');
        var paramSummarize = params.get('summarize');
        var props = {
            getStatus: getStatus,
            taskId: params.get('taskid') || params.get('taskId') || '',
            interval: 3000,
            maxConsecutiveErrors: 1,
            map: typeof paramMap === 'string' ? paramMap : 'Map',
            reduce: typeof paramReduce === 'string' ? paramReduce : 'Reduce',
            summarize: typeof paramSummarize === 'string' ? paramSummarize : 'Summarize'
        };
        task_status_client_1.initTaskStatus('taskstatus-react-root', props).catch(console.error);
    }
    exports.pageInit = pageInit;
});
