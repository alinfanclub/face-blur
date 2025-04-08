// scripts/notarize.js
require('dotenv').config();

exports.default = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    console.log('[NOTARIZE] 💨 Not a macOS build, skipping...');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  console.log(`[NOTARIZE] 🔐 Notarizing ${appName}.app...`);

  try {
    // ⬇️ 여기만 바뀐 부분! require → import
    const { notarize } = await import('@electron/notarize');

    await notarize({
      appBundleId: 'com.plumpstudio.faceblur',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });

    console.log('[NOTARIZE] ✅ Notarization complete!');
  } catch (error) {
    console.error('[NOTARIZE] ❌ Notarization failed:', error);
    throw error;
  }
};
