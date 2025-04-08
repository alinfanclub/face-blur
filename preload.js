// 📁 electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] ✅ preload loaded'); // ← 반드시 찍혀야 함!

let channelCallback = null;

contextBridge.exposeInMainWorld('myPreload', {
  sendImages: (images) => ipcRenderer.send('save-images', images),
  listenChannelMessage: (callback) => {
    channelCallback = callback;
    ipcRenderer.on('channel', (_, data) => callback(data));
  },
  removeChannelListener: () => {
    if (channelCallback) {
      ipcRenderer.removeListener('channel', channelCallback);
      channelCallback = null;
    }
  }
});

// 2초 후 테스트 메시지 전송
setTimeout(() => {
  console.log('[PRELOAD] 🛰️ test-preload 전송');
  ipcRenderer.send('test-preload');
}, 2000);
