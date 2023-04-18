var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
define(["require", "exports", "react"], function (require, exports, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * TaskStatus displays the progress of a Map/Reduce script.
     */
    var TaskStatus = /** @class */ (function (_super) {
        __extends(TaskStatus, _super);
        function TaskStatus(props) {
            var _this = _super.call(this, props) || this;
            _this.consecutiveErrors = 0;
            _this.state = { status: null };
            return _this;
        }
        TaskStatus.prototype.componentDidMount = function () {
            this.updateStatus();
        };
        TaskStatus.prototype.componentWillUnmount = function () {
            if (this.timer) {
                window.clearInterval(this.timer);
            }
        };
        TaskStatus.prototype.updateStatus = function () {
            return __awaiter(this, void 0, void 0, function () {
                var status_1, exc_1;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.props.getStatus(this.props.taskId)];
                        case 1:
                            status_1 = _a.sent();
                            this.consecutiveErrors = 0;
                            this.setState({ status: status_1 });
                            if (status_1.status === 'COMPLETE' || status_1.status === 'FAILED') {
                                return [2 /*return*/];
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            exc_1 = _a.sent();
                            this.consecutiveErrors++;
                            if (this.props.maxConsecutiveErrors != null &&
                                this.props.maxConsecutiveErrors > 0 &&
                                this.consecutiveErrors >= this.props.maxConsecutiveErrors) {
                                this.setState({ error: exc_1 });
                                return [2 /*return*/];
                            }
                            return [3 /*break*/, 3];
                        case 3:
                            // queue another request
                            // use timeout instead of interval to avoid requesting more frequently than response time
                            this.timer = window.setTimeout(function () { return _this.updateStatus(); }, this.props.interval);
                            return [2 /*return*/];
                    }
                });
            });
        };
        TaskStatus.prototype.render = function () {
            var status = this.state.status;
            var error = this.state.error;
            if (error) {
                return this.renderError(error);
            }
            if (!status) {
                return null;
            }
            var hasEllipsis = status.status === 'PENDING' || status.status === 'PROCESSING';
            var title = titleCase(status.status) + (hasEllipsis ? '...' : '');
            var titleDiv = React.createElement("div", { className: "taskstatus-title" }, title);
            if (status.status === 'COMPLETE' || status.status === 'FAILED') {
                return titleDiv;
            }
            if (status.status === 'PENDING') {
                return this.renderPending(titleDiv);
            }
            return this.renderProcessing(titleDiv, status);
        };
        TaskStatus.prototype.renderPending = function (titleDiv) {
            return (React.createElement("div", null,
                titleDiv,
                React.createElement(IndeterminateProgressBar, null)));
        };
        TaskStatus.prototype.renderProcessing = function (titleDiv, status) {
            var hideMap = typeof this.props.map === 'string' && this.props.map.toLowerCase() === 'none';
            var hideReduce = typeof this.props.reduce === 'string' && this.props.reduce.toLowerCase() === 'none';
            var hideSummarize = typeof this.props.summarize === 'string' && this.props.summarize.toLowerCase() === 'none';
            var bars = [];
            if (!hideMap) {
                bars.push(React.createElement(DeterminateProgressBar, { key: "map", name: typeof this.props.map === 'string' ? this.props.map : 'Map', percent: percentComplete(status.map) }));
            }
            if (!hideReduce) {
                bars.push(React.createElement(DeterminateProgressBar, { key: "reduce", name: typeof this.props.reduce === 'string' ? this.props.reduce : 'Reduce', percent: percentComplete(status.reduce) }));
            }
            if (!hideSummarize) {
                bars.push(React.createElement(DeterminateProgressBar, { key: "summarize", name: typeof this.props.summarize === 'string' ? this.props.summarize : 'Summarize', percent: percentComplete(status.summarize) }));
            }
            return (React.createElement("div", null,
                titleDiv,
                bars));
        };
        TaskStatus.prototype.renderError = function (error) {
            // prefix error message to clarify that the error is in getting the map/reduce task _status_
            // and not in the map/reduce task itself
            return React.createElement("div", { className: "taskstatus-error" }, "Failed to get status: " + error.message);
        };
        return TaskStatus;
    }(React.Component));
    exports.TaskStatus = TaskStatus;
    function IndeterminateProgressBar(props) {
        return (React.createElement("div", { className: "taskstatus-pb" },
            React.createElement("div", { className: "taskstatus-pb-left" }, props.name || ''),
            React.createElement("div", { className: "taskstatus-pb-bar" },
                React.createElement("div", { className: "taskstatus-pb-progress taskstatus-indeterminate" }))));
    }
    function DeterminateProgressBar(props) {
        var style = { width: props.percent + "%" };
        return (React.createElement("div", { className: "taskstatus-pb" },
            React.createElement("div", { className: "taskstatus-pb-left" }, props.name || '&nbsp;'),
            React.createElement("div", { className: "taskstatus-pb-right" }, props.percent + "%"),
            React.createElement("div", { className: "taskstatus-pb-bar" },
                React.createElement("div", { className: "taskstatus-pb-progress", style: style }))));
    }
    function percentComplete(stage) {
        // both total and pending are 0 when stage has not happened
        if (stage.total === 0) {
            return 0;
        }
        if (stage.pending === 0) {
            return 100;
        }
        var pct = 100 * (stage.total - stage.pending) / stage.total;
        // round to two decimal places
        return Math.floor(100 * pct) / 100;
    }
    function titleCase(word) {
        return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
    }
});
