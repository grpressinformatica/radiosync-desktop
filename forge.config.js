const path = require('path')

const VERSION = '1.4.0'

module.exports = {
  packagerConfig: {
    name: 'radiosync-desktop',
    executableName: 'radiosync-desktop',
    icon: path.join(__dirname, 'resources', 'icon.png'),
    // Include the electron-vite build output
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
    {
      name: '@electron-forge/maker-msix',
      config: {
        outputDirectory: path.join(__dirname, 'dist', 'msix'),
        sign: false,
        manifestVariables: {
          packageIdentity: 'com.radiosync.desktop',
          publisher: 'CN=UaiHost',
          packageVersion: VERSION,
          packageDisplayName: 'RadioSync Desktop',
          packageDescription: 'Sistema de gestao de radios - Cadastro de Ouvintes e Promocoes/Sorteios (offline)',
          packageBackgroundColor: '#ffffff',
          appExecutable: 'radiosync-desktop.exe',
          appDisplayName: 'RadioSync Desktop',
          targetArch: 'x64',
        },
        // URL base para updates / Microsoft Store
        // Formato por versao:
        // https://github.com/grpressinformatica/radiosync-desktop/releases/download/v{version}/radiosync-desktop-{version}-win32-x64.msix
        // Exemplo v1.4.0:
        // https://github.com/grpressinformatica/radiosync-desktop/releases/download/v1.4.0/radiosync-desktop-1.4.0-win32-x64.msix
        // O CI deve criar a tag v{version} e o release correspondente.
        publisher: 'CN=UaiHost',
      },
    },
  ],
}
