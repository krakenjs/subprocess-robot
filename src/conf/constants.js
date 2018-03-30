/* @flow */

export const MESSAGE_TYPE = {
    REQUEST:  '__subprocess_robot_request__',
    RESPONSE: '__subprocess_robot_response__'
};

export const MESSAGE_STATUS = {
    SUCCESS: '__subprocess_robot_message_success__',
    ERROR:   '__subprocess_robot_message_error__'
};

export const BUILTIN_MESSAGE = {
    READY:       '__subprocess_robot_ready__',
    REQUIRE:     '__subprocess_robot_require__',
    METHOD_CALL: '__subprocess_robot_method_call__'
};

export const ENV_FLAG = {
    BABEL_DISABLE_CACHE:  'BABEL_DISABLE_CACHE',
    PROCESS_ROBOT_WORKER: 'PROCESS_ROBOT_WORKER'
};

export const SERIALIZATION_TYPE = {
    METHOD: 'method'
};
