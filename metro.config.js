const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Block @react-native/debugger-frontend from web bundle (it uses import.meta)
const { blockList } = config.resolver;
config.resolver.blockList = [
  ...(Array.isArray(blockList) ? blockList : blockList ? [blockList] : []),
  /node_modules\/@react-native\/debugger-frontend\/.*/,
];

module.exports = config;
