/*
 * LightSpread
 * Copyright (C) 2018  Artur Weigandt  https://wlabs.de/kontakt

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

const electron = require('electron');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

let storeData = new Map();
let basePath;
let thumbnailPath;

let copyAndMaybeResizeImage = (imagePath, name) => {
    return new Promise(function (resolve, reject) {
        sharp(imagePath)
            .resize(4096, 4096, {
                fit: sharp.fit.inside,
                withoutEnlargement: true,
            })
            .toFile(basePath + path.sep + name, (err, info) => {
                if (err) {
                    reject('Fehler beim Kopieren und Skalieren von ' + imagePath + ': ' + err);
                    return;
                }

                resolve();
            });
    });
};

let createThumbnailFromImage = (imagePath, name) => {
    return new Promise(function (resolve, reject) {
        sharp(imagePath)
            .resize(300, 300)
            .toFile(thumbnailPath + path.sep + name, (err, info) => {
                if (err) {
                    reject('Fehler bei Thumbnail Erstellung von ' + imagePath + ': ' + err);
                    return;
                }

                resolve();
            });
    });
};

// Constructor
function ImageStore() {
    basePath = electron.remote.app.getPath('userData') + path.sep + 'imagestore';
    thumbnailPath = basePath + path.sep + 'thumbnails';
}

// reset
ImageStore.prototype.reset = function() {
    // Reset image folder
    try {
        fs.rmdirSync(basePath);

        try {
            fs.mkdirSync(basePath);
            fs.mkdirSync(thumbnailPath);
        } catch (err) {
            console.log('Image Folder konnte nicht erstellt werden: ' + err);
        }
    } catch (err) {
        console.log('Image Folder konnte nicht gelöscht werden: ' + err);
    }

    storeData = new Map();
}

ImageStore.prototype.add = function(id, imagePath, size) {
    return new Promise(function (resolve, reject) {
        Promise.all([
            copyAndMaybeResizeImage(imagePath, id),
            createThumbnailFromImage(imagePath, id)
        ])
            .catch((err) => {
                console.log(err);
                reject();
            })
            .then(() => {
                console.log('Bild kopiert, skaliert und Thumbnail erstellt: ' + imagePath);

                // Add to store
                storeData.set(id, {
                    name: id,
                    file: basePath + path.sep + id,
                    thumbFile: thumbnailPath + path.sep + id,
                    size: size,
                });

                resolve();
            });
    });
};

ImageStore.prototype.getData = function(id) {
    return new Promise(function (resolve, reject) {
        if (! storeData.has(id)) {
            reject();
        }

        resolve(storeData.get(id));
    });
};

// Return array of data objects for all images
ImageStore.prototype.getAllData = function() {
    return new Promise(function (resolve, reject) {
        resolve(storeData.values());
    });
};

// Count all images
ImageStore.prototype.count = function() {
    return storeData.size;
};

// export the class
module.exports = ImageStore;
