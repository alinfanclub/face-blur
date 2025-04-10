const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(app.getAppPath(), 'build/index.html')}`;

  win.loadURL(startUrl);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 저장 경로에서 이름 중복 시 (01), (02)... 붙이는 함수
function getUniqueFilePath(basePath) {
  let counter = 1;
  let uniquePath = basePath;

  while (fs.existsSync(uniquePath)) {
    const ext = path.extname(basePath);
    const nameWithoutExt = path.basename(basePath, ext);
    const dir = path.dirname(basePath);
    uniquePath = path.join(dir, `${nameWithoutExt}(${String(counter).padStart(2, '0')})${ext}`);
    counter++;
  }

  return uniquePath;
}

// 💾 이미지 저장 IPC 핸들러 등록
ipcMain.handle('save-images', async (event, images) => {
  console.log('[MAIN] 🧾 save-images 이벤트 수신됨');

  const downloadsFolder = path.join(os.homedir(), 'Downloads', 'BlurredImages');
  if (!fs.existsSync(downloadsFolder)) {
    fs.mkdirSync(downloadsFolder);
    console.log('[MAIN] 📁 BlurredImages 폴더 생성됨');
  }

  const savedPaths = [];
  for (let { buffer, originalName, extension } of images) {
    const ext = extension || '.png';
    const nameWithoutExt = path.parse(originalName).name;
    const basePath = path.join(downloadsFolder, `${nameWithoutExt}${ext}`);
    const uniquePath = getUniqueFilePath(basePath);

    try {
      fs.writeFileSync(uniquePath, Buffer.from(buffer));
      savedPaths.push(uniquePath);
      console.log(`[MAIN] ✅ 저장됨: ${uniquePath}`);
    } catch (err) {
      console.error(`[MAIN] ❌ 저장 실패: ${originalName}`, err);
    }
  }

  // 렌더러에 저장 완료 메시지 전송
  event.sender.send('channel', {
    type: 'save-images-done',
    path: downloadsFolder,
  });

  // Finder로 저장 폴더 열기
  shell.openPath(downloadsFolder);

  return savedPaths;  // 저장된 경로를 반환
});

ipcMain.on('test-preload', () => {
  console.log('[MAIN] ✅ preload 연결 테스트 메시지 수신');
});
