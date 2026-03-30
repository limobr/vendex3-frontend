module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // ['@babel/plugin-transform-class-properties', { loose: true }],
      // Remove @babel/plugin-transform-runtime as it might conflict with expo
      // ['@babel/plugin-transform-runtime', { helpers: true, regenerator: true }]
    ],
  };
};