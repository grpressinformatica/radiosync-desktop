const path = require('path')

const VERSION = '1.4.0'

module.exports = {
  packagerConfig: {
    name: 'radiosync-desktop',
    executableName: 'radiosync-desktop',
    icon: path.join(__dirname, 'resources', 'icon.png'),
    ignore: /^\/node_modules$|^\/\.git$|^\/src$|^\/scripts$/,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'radiosync-desktop',
        setupIcon: path.join(__dirname, 'resources', 'icon.ico'),
        outputDirectory: path.join(__dirname, 'dist', 'nsis'),
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
    },
  ],
}
