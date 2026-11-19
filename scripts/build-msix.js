const fs = require('node:fs/promises')
const path = require('node:path')
const { execSync } = require('node:child_process')

const projectDir = path.resolve(__dirname, '..')
const packagedDir = path.join(projectDir, '.output', 'radiosync-desktop-win32-x64')
const outputDir = path.join(projectDir, 'dist', 'msix')
const appManifestTemplate = path.join(__dirname, 'AppxManifest.xml')

async function main() {
  await fs.mkdir(outputDir, { recursive: true })

  // Step 1: Package with electron-windows-msix (generates MSIX without DesktopExtension)
  const { packageMSIX } = require('electron-windows-msix')
  const result = await packageMSIX({
    appDir: packagedDir,
    outputDir,
    manifestVariables: {
      publisher: 'CN=UaiHost',
      packageIdentity: 'radiosync-desktop',
      packageVersion: '1.4.0.0',
      appExecutable: 'radiosync-desktop.exe',
      targetArch: 'x64',
    },
    createPri: true,
    sign: false,
  })

  console.log('Initial MSIX built, now injecting DesktopExtension...')

  // Step 2: Read the generated manifest
  const manifestXml = await fs.readFile(path.join(result.tempDir, 'AppxManifest.xml'), 'utf-8')

  // Step 3: Add desktop namespace if missing, then add DesktopExtension
  let modifiedXml = manifestXml
  if (!modifiedXml.includes('xmlns:desktop="http://schemas.microsoft.com/appx/manifest/desktop/windows10"')) {
    modifiedXml = modifiedXml.replace(
      'xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"',
      'xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"\n  xmlns:desktop="http://schemas.microsoft.com/appx/manifest/desktop/windows10"'
    )
  }

  // Add DesktopExtension inside <Applications><Application>...</Application></Applications>
  const desktopExtension = `
    <Extensions>
      <desktop:Extension Category="windows.desktopAppBridge" />
    </Extensions>`

  modifiedXml = modifiedXml.replace(
    /(\s+<\/uap:VisualElements>\s*\n\s+)(<\/Application>)/,
    `$1${desktopExtension}\n$2`
  )

  // Step 4: Unpack the MSIX, replace manifest, repack
  const workDir = path.join(projectDir, 'dist', '_msix_work')

  // Clean work dir
  await fs.rm(workDir, { recursive: true, force: true })
  await fs.mkdir(workDir, { recursive: true })

  // Unpack
  console.log('Unpacking MSIX...')
  execSync(
    `makeappx.exe unpack /p "${result.msixPackage}" /d "${workDir}" /o`,
    { stdio: 'inherit' }
  )

  // Replace manifest
  await fs.writeFile(path.join(workDir, 'AppxManifest.xml'), modifiedXml, 'utf-8')

  // Repack
  const finalMsix = path.join(outputDir, 'radiosync-desktop-1.4.0.msix')
  console.log('Repacking MSIX with DesktopExtension...')
  execSync(
    `makeappx.exe pack /d "${workDir}" /p "${finalMsix}" /o`,
    { stdio: 'inherit' }
  )

  // Cleanup
  await fs.rm(workDir, { recursive: true, force: true })
  await fs.rm(result.tempDir, { recursive: true, force: true }).catch(() => {})

  console.log('MSIX ready:', finalMsix)
}

main().catch((err) => {
  console.error('MSIX build failed:', err)
  process.exit(1)
})
