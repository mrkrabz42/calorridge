module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          worklets: false,
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
