const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { initDb } = require('./db');
const { seedDev } = require('./seed_dev');

const registerFoodsIpc    = require('./ipc/foods.ipc');
const registerLogIpc      = require('./ipc/log.ipc');
const registerRecipesIpc  = require('./ipc/recipes.ipc');
const registerWaterIpc    = require('./ipc/water.ipc');
const registerWeightIpc   = require('./ipc/weight.ipc');
const registerSettingsIpc = require('./ipc/settings.ipc');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0a0a0a',
    title: 'CalorieCounter',
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  // mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('console-message', (_e, level, msg, line, src) => {
    const tag = ['V','I','W','E'][level] || '?';
    console.log(`[renderer:${tag}] ${msg}  (${src}:${line})`);
  });
}

app.whenReady().then(() => {
  initDb();
  seedDev();

  registerFoodsIpc();
  registerLogIpc();
  registerRecipesIpc();
  registerWaterIpc();
  registerWeightIpc();
  registerSettingsIpc();

  createWindow();

  // Global shortcut: focus quick-add from anywhere on the desktop
  globalShortcut.register('CommandOrControl+N', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('shortcut:quickAdd');
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
