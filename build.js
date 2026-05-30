const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  format: 'cjs',
  platform: 'neutral',
  jsx: 'transform', // Convert JSX <View> -> React.createElement('View')
  external: ['react', 'react-native', 'react-native-webview'],
});
