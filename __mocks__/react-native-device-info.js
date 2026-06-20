// Auto-applied manual mock (Jest uses root __mocks__ for node_modules without an
// explicit jest.mock call). Delegates to the package's official Jest mock so any
// test that transitively imports the device adapter doesn't touch the native SDK.
const deviceInfoMock = require('react-native-device-info/jest/react-native-device-info-mock');

module.exports = deviceInfoMock;
module.exports.default = deviceInfoMock;
