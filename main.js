'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// singleton agora instance
const agora = require('./agora-backend/agora.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600, show: false});

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  let splashScreen = new BrowserWindow({
    width: 500,
    height: 375,
    frame: false,
    show: false,
    fullscreen: false,
    fullscreenable: false,
    transparent: true
  });
  splashScreen.loadURL(url.format({
    pathname: path.join(__dirname, 'splash.html'),
    protocol: 'file:',
    slashes: true
  }));
  splashScreen.once('ready-to-show', () => {
    splashScreen.show();
    setTimeout(() => {
      splashScreen.destroy();
      splashScreen = null;
      setTimeout(() => {
        createWindow();
      }, 500);
    }, 3000);
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// code to handle interprocess Agora requests
ipcMain.on('agora-request', (event, {id, req}) => {
  agora.request(req, (result) => {
    event.sender.send('agora-reply', {id, result});
  });
});
