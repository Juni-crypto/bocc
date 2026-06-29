// Metro config tuned for the BOCC npm-workspaces monorepo.
// Lets Metro resolve modules hoisted to the repo-root node_modules
// while watching the whole workspace for shared packages.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// NOTE: do NOT set disableHierarchicalLookup. Some deps (e.g. `scheduler`,
// required by react-native and react-dom at different versions) are NOT hoisted
// to the workspace root; they live nested under react-native/node_modules and
// react-dom/node_modules. Hierarchical lookup is what lets Metro resolve those
// nested copies. Disabling it breaks the release JS bundle.

module.exports = config;
