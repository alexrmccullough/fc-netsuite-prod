/**
 * Provide a service to poll the status of a Map/Reduce task.
 *
 * @NScriptType Suitelet
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/amdconfig.json
 */
define(["require", "exports", "N/task", "N/search", "N/file", "N/ui/serverWidget", "N/runtime", "N/url"], function (require, exports, task, search, file, serverWidget, runtime, url) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Provide a service to poll the status of a Map/Reduce task.
     *
     * @param ctx
     * query parameters
     * - taskid: Which task to check. mandatory
     * - query: Pass any value to get a snapshot of the task status as json.
     *   omit to get a UI that displays the task status.
     * - ifrmcntnr: Pass any value to hide the NetSuite navbar.
     *   NetSuite has some behind the scenes behavior with this parameter
     *   to make the suitelet ui suitable to be embedded in an iframe.
     *
     */
    function onRequest(ctx) {
        var taskId = ctx.request.parameters.taskId || ctx.request.parameters.taskid;
        var query = !!ctx.request.parameters.query;
        var isEmbedded = !!ctx.request.parameters.ifrmcntnr;
        try {
            if (typeof taskId !== 'string' || taskId === '') {
                throw new Error("Invalid task id: " + taskId);
            }
            if (!query) {
                var form = createForm(taskId, isEmbedded);
                ctx.response.writePage({ pageObject: form });
                return;
            }
            var status_1 = task.checkStatus({ taskId: taskId });
            if (!isMapReduceScriptTaskStatus(status_1)) {
                throw new Error('Unsupported task type');
            }
            // these are null when the taskId was not a valid taskId
            if (!status_1.scriptId || !status_1.deploymentId) {
                throw new Error("Invalid task id: " + taskId);
            }
            respondWith(ctx.response, { success: true, status: snapshot(status_1) });
        }
        catch (exc) {
            respondWith(ctx.response, { success: false, message: exc.toString() });
        }
    }
    exports.onRequest = onRequest;
    function respondWith(resp, body) {
        resp.setHeader({ name: 'content-type', value: 'application/json' });
        resp.write(JSON.stringify(body));
    }
    function isMapReduceScriptTaskStatus(status) {
        return status.hasOwnProperty('stage');
    }
    function snapshot(status) {
        // status.getPercentageCompleted might throw an exception for completed tasks
        var pct = 0;
        try {
            pct = status.getPercentageCompleted();
        }
        catch (_a) { }
        return {
            // netsuite docs say these "might be" numbers
            scriptId: String(status.scriptId),
            deploymentId: String(status.deploymentId),
            status: N_TaskStatusToString(status.status),
            stage: N_TaskMapReduceStageToString(status.stage),
            stagePercentComplete: pct,
            size: status.getCurrentTotalSize(),
            map: {
                pending: status.getPendingMapCount(),
                pendingBytes: status.getPendingMapSize(),
                total: status.getTotalMapCount()
            },
            reduce: {
                pending: status.getPendingReduceCount(),
                pendingBytes: status.getPendingReduceSize(),
                total: status.getTotalReduceCount()
            },
            summarize: {
                pending: status.getPendingOutputCount(),
                pendingBytes: status.getPendingOutputSize(),
                total: status.getTotalOutputCount()
            }
        };
    }
    /**
     * Client scripts cannot import N/task.
     * Provide constant strings known at compile time that correspond to the keys of N/task.TaskStatus.
     * @param status
     */
    function N_TaskStatusToString(status) {
        var _a;
        var map = (_a = {},
            _a[task.TaskStatus.PENDING] = 'PENDING',
            _a[task.TaskStatus.PROCESSING] = 'PROCESSING',
            _a[task.TaskStatus.FAILED] = 'FAILED',
            _a[task.TaskStatus.COMPLETE] = 'COMPLETE',
            _a);
        return map[status];
    }
    /**
     * Client scripts cannot import N/task.
     * Provide constant strings known at compile time that correspond to the keys of N/task.MapReduceStage.
     * @param stage
     */
    function N_TaskMapReduceStageToString(stage) {
        var _a;
        var map = (_a = {},
            _a[task.MapReduceStage.GET_INPUT] = 'GET_INPUT',
            _a[task.MapReduceStage.MAP] = 'MAP',
            _a[task.MapReduceStage.REDUCE] = 'REDUCE',
            _a[task.MapReduceStage.SHUFFLE] = 'SHUFFLE',
            _a[task.MapReduceStage.SUMMARIZE] = 'SUMMARIZE',
            _a);
        return map[stage] || null;
    }
    /**
     * @param taskId
     * @param isEmbedded
     */
    function createForm(taskId, isEmbedded) {
        var form = serverWidget.createForm({
            title: 'Task Status',
            hideNavBar: isEmbedded
        });
        // when you set form.clientScriptModulePath the server attempts to evaluate scripts that are
        // statically imported (i.e. in define([...])) by the client script
        // client script should take care not to statically import scripts that fail to evaluate on the server
        form.clientScriptModulePath = './task_status_sl_cl';
        // put the taskId and the url of this suitelet on the form for use in the attached client script
        var taskField = form.addField({
            id: 'custpage_taskid',
            type: serverWidget.FieldType.TEXT,
            label: 'Task',
        });
        taskField.defaultValue = taskId;
        if (isEmbedded) {
            taskField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
        }
        else {
            taskField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
            taskField.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE });
        }
        var suiteletURLField = form.addField({
            id: 'custpage_suitelet_url',
            type: serverWidget.FieldType.TEXT,
            label: 'Suitelet URL'
        });
        suiteletURLField.defaultValue = suiteletURL();
        suiteletURLField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
        var html = file.load({ id: suiteletFolderPath() + "/lib/task_status.html" }).getContents();
        var taskStatusWidget = form.addField({
            id: 'custpage_react_root',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'react'
        });
        taskStatusWidget.defaultValue = html;
        return form;
    }
    /**
     * Get the url of the currently executing suitelet.
     */
    function suiteletURL() {
        var script = runtime.getCurrentScript();
        return url.resolveScript({
            scriptId: script.id,
            deploymentId: script.deploymentId
        });
    }
    /**
     * Get the folder path of the currently executing script file.
     */
    function suiteletFolderPath() {
        var script = runtime.getCurrentScript();
        var results = search.create({
            type: 'script',
            filters: ['scriptid', 'is', script.id],
            columns: ['scriptfile']
        }).run().getRange({ start: 0, end: 1 });
        if (results.length === 0) {
            throw new Error('Failed to look up script file.');
        }
        var scriptFileId = results[0].getValue('scriptfile');
        var scriptFilePath = file.load({ id: scriptFileId }).path;
        var lastSlash = scriptFilePath.lastIndexOf('/');
        return scriptFilePath.substring(0, lastSlash);
    }
});
