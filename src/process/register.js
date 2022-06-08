/* @flow */

// eslint-disable-next-line import/no-commonjs
const register = require("@babel/register").default;

register({ extensions: [".ts", ".tsx", ".js", ".jsx"] });
