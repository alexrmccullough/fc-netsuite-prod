define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function isSuiteletResponse(arg) {
        return arg && typeof arg.success === 'boolean' &&
            (!arg.success && typeof arg.message === 'string') || (arg.success && arg.status);
    }
    exports.isSuiteletResponse = isSuiteletResponse;
    function isSuccessResponse(arg) {
        return arg.success;
    }
    exports.isSuccessResponse = isSuccessResponse;
});
