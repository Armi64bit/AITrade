module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@hooks': './src/hooks',
            '@store': './src/store',
            '@services': './src/services',
            '@types': './src/types',
            '@utils': './src/utils',
            '@constants': './src/constants',
            '@theme': './src/theme',
            '@navigation': './src/navigation',
            '@screens': './src/screens',
          },
        },
      ],
    ],
  };
};