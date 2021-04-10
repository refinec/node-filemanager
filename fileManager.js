const defaultConfig = require('./defaultConfigtion');
const fs = require('fs-extra');
const path = require('path');
const {
    log
} = require('console');
// const archiver = require('archiver');
// const unzip = require('unzip');

module.exports = function (internalClient) {
    const api = {};
    /**
     * 初始化配置
     * @return {object}
     */
    api.initialize = function () {
        if (defaultConfig.get('routePrefix') !== '/') {
            return {
                'result': {
                    'status': 'danger',
                    'message': 'noConfig'
                }
            }
        }
        const config = {
            'acl': defaultConfig.get('acl'),
            'leftDisk': defaultConfig.get('leftDisk'),
            'leftPath': defaultConfig.get('leftPath'),
            'rightDisk': defaultConfig.get('rightDisk'),
            'rightPath': defaultConfig.get('rightPath'),
            // 'windowsConfig': defaultConfig.get('windowsConfig'),
            // 'hiddenFiles': defaultConfig.get('hiddenFiles'),
            'disks': {
                'public': {
                    public: defaultConfig.get('diskList')[0],
                    driver: 'public'
                },
                'private': {
                    private: defaultConfig.get('diskList')[1],
                    driver: 'private'
                }
            }
        }
        return {
            'result': {
                'status': 'success',
                'message': null
            },
            'config': config
        }
    }
    /**
     * 获取指定磁盘下的文件夹和文件
     * @param {String} disk 
     * @param {String} dirPath 
     * @returns 
     */
    api.content = async function (disk = "", dirPath = "") {
        let acl = disk == "public" ? 1 : 2;
        try {
            const dir = dirPath.lastIndexOf('/') === dirPath.length - 1 ? dirPath : dirPath + '/';
            const directories = [];
            const file = [];
            let fileObj = await internalClient.list({
                prefix: dir,
                delimiter: '/'
            });
            let author = await internalClient.getObjectTagging(dir);
            if (!fileObj.objects && !fileObj.prefixes) {
                return {
                    result: {
                        'status': 'success',
                        'message': "fileNotExist"
                    },
                    directories: [],
                    files: [],
                    author: author.tag.author
                };
            } else {
                return this.getTimeStamp(fileObj.prefixes).then(async (timeStamp) => {
                    // console.log("fileObj.prefixes", fileObj.prefixes);
                    for (let [index, item] of Object.entries(fileObj.prefixes || [])) {
                        try {
                            let tempDir = {};
                            tempDir.id = index;
                            tempDir.basename = path.basename(item);
                            tempDir.dirname = item;
                            tempDir.path = item.replace(/\/$/g, "");
                            tempDir.parentId = index;
                            tempDir.timestamp = timeStamp[index];
                            tempDir.acl = acl;
                            tempDir.size = 0;
                            tempDir.type = "dir";
                            tempDir.props = {
                                hasSubdirectories: true,
                                subdirectoriesLoaded: false,
                                showSubdirectories: true
                            };
                            let auth = await internalClient.getObjectTagging(item);
                            tempDir.author = auth.tag.author || "";
                            directories.push(tempDir);
                        } catch (error) {
                            console.log(error);
                        }
                    }
                    // console.log("fileObj.objects", fileObj.objects);
                    for (let [index, item] of Object.entries(fileObj.objects || [])) {
                        if (item.name.lastIndexOf('/') === item.name.length - 1) {
                            continue;
                        }
                        let tempDir = {};
                        tempDir.id = index;
                        tempDir.basename = path.basename(item.name);
                        tempDir.filename = path.basename(item.name, path.extname(item.name));
                        tempDir.dirname = item.name;
                        tempDir.path = item.name;
                        tempDir.parentId = index;
                        tempDir.timestamp = new Date(item.lastModified).getTime() / 1000;
                        tempDir.acl = acl;
                        tempDir.size = item.size;
                        tempDir.type = "file";
                        tempDir.extension = path.extname(item.name).replace(/\./, "");
                        tempDir.props = {
                            hasSubdirectories: false,
                            subdirectoriesLoaded: true,
                            showSubdirectories: false
                        };
                        let auth = await internalClient.getObjectTagging(item.name);
                        tempDir.author = auth.tag.author || "";
                        file.push(tempDir);
                    }
                    return {
                        result: {
                            'status': 'success',
                            'message': null
                        },
                        directories: directories,
                        files: file,
                        author: author.tag.author
                    };
                });
            }

        } catch (err_1) {
            console.error(err_1);
        }
    }


    /**
     * 获取左侧的目录树
     * @param {string} disk 
     * @param {string} dir 
     */
    api.showDirectories = async function (disk = "", dir = "") {
        const directoriesList = [];
        dir = dir.lastIndexOf('/') === dir.length - 1 ? dir : dir + '/';
        let acl = disk == "public" ? 1 : 2;
        try {
            return await internalClient.list({
                prefix: dir,
                delimiter: '/'
            }).then((obj) => {
                (obj.prefixes || []).forEach((item, index) => {
                    let tempDir = {};
                    tempDir.id = index;
                    tempDir.basename = path.basename(item);
                    tempDir.dirname = item;
                    tempDir.path = item.replace(/\/$/g, "");
                    tempDir.type = "dir";
                    tempDir.acl = acl;
                    tempDir.props = {
                        hasSubdirectories: true,
                        subdirectoriesLoaded: false,
                        showSubdirectories: true
                    };
                    tempDir.parentId = index;
                    directoriesList.push(tempDir);
                })
                return {
                    result: {
                        'status': 'success',
                        'message': null
                    },
                    directories: directoriesList
                };
            }).catch(err => {
                console.err("showDirectories1:", err);
                return {
                    result: {
                        'status': 'danger',
                        'message': 'fileNotFound'
                    },
                    directories: []
                };
            })
        } catch (err_1) {
            console.error("showDirectories2:", err_1);
        }
    }

    api.getTimeStamp = function (prefixes) {
        const timeStamp = [];
        const promiseTime = [];
        (prefixes || []).forEach((item, index) => {
            promiseTime.push(internalClient.head(item).catch(e => e));
        });
        return Promise.all(promiseTime).then((res) => {
            res.forEach((item, index) => {
                if (item.code === 'NoSuchKey') {
                    timeStamp.push(0);
                    return;
                }
                timeStamp.push(new Date(item.res.headers['last-modified']).getTime() / 1000);
            })
            return timeStamp;
        })
    }



    /**
     * 创建oss目录
     * @param {string} dir 
     */
    api.createOssDirectory = function (disk = "", dir = "", author = "") {
        return new Promise((resolve) => {
            internalClient.get(dir).then((result) => {
                if (result.res.status == 200) {
                    return 'exist';
                }
            }).catch((e) => {
                // 目录不存在则创建目录
                if (e.code == 'NoSuchKey') {
                    resolve(internalClient.put(dir, Buffer.from(''), {
                        headers: {
                            'x-oss-tagging': `author=${author}`,
                        }
                    }).then((result) => {
                        if (result.res.status == 200) {
                            return internalClient.get(dir)
                        }
                    }).then((info) => {
                        return Promise.resolve({
                            time: new Date(info.res.headers['last-modified']).getTime(),
                            size: info.res.size
                        })
                    }).then(result => {
                        let acl = disk == "public" ? 1 : 2;
                        const tempDir = {};
                        tempDir.path = dir.replace(/\/$/g, "");
                        tempDir.timestamp = result.time / 1000;
                        tempDir.size = result.size;
                        tempDir.basename = path.basename(dir);
                        tempDir.type = "dir";
                        tempDir.acl = acl;
                        tempDir.author = author;
                        tempDir.props = {
                            hasSubdirectories: true,
                            subdirectoriesLoaded: false,
                            showSubdirectories: true
                        };
                        return tempDir;
                    }).catch(e => {
                        return 'createErr'
                    }));
                }
            })
        }).catch(e => e);
    }

    api.createOssFile = function (disk = "", dir = "", author = "") {
        return new Promise((resolve) => {
            internalClient.get(dir).then((result) => {
                if (result.res.status == 200) {
                    return 'exist';
                }
            }).catch((e) => {
                // 文件不存在则创建文件
                if (e.code == 'NoSuchKey') {
                    resolve(internalClient.put(dir, Buffer.from(''), {
                        headers: {
                            'x-oss-tagging': `author=${author}`,
                        }
                    }).then((result) => {
                        if (result.res.status == 200) {
                            return internalClient.get(dir)
                        }
                    }).then((info) => {
                        return Promise.resolve({
                            time: new Date(info.res.headers['last-modified']).getTime(),
                            size: info.res.size
                        })
                    }).then(result => {
                        const tempDir = {};
                        let acl = disk == "public" ? 1 : 2;
                        tempDir.path = dir;
                        tempDir.timestamp = result.time / 1000;
                        tempDir.size = result.size;
                        tempDir.basename = path.basename(dir);
                        tempDir.filename = path.basename(dir, path.extname(dir));
                        tempDir.dirname = dir;
                        tempDir.type = "file";
                        tempDir.acl = acl;
                        tempDir.author = author;
                        tempDir.extension = path.extname(path.basename(dir)).replace(/\./, "");
                        tempDir.props = {
                            hasSubdirectories: false,
                            subdirectoriesLoaded: true,
                            showSubdirectories: false
                        };
                        return tempDir;
                    }).catch(e => {
                        return 'createErr'
                    }));
                }
            })
        })
    }

    /**
     * 更新oss文件属性
     * @param {string} dir 
     */
    api.updateOssFileProperty = function (disk = '', dir = '', author = '') {
        return internalClient.get(dir).then((info) => {
            return Promise.resolve({
                time: new Date(info.res.headers['last-modified']).getTime(),
                size: info.res.size
            }).then(result => {
                let acl = disk == "public" ? 1 : 2;
                const tempDir = {};
                tempDir.path = dir;
                tempDir.dirname = dir;
                tempDir.basename = path.basename(dir);
                tempDir.filename = path.basename(dir, path.extname(dir));
                tempDir.timestamp = result.time / 1000;
                tempDir.size = result.size;
                tempDir.type = "file";
                tempDir.acl = acl;
                tempDir.extension = path.extname(path.basename(dir)).replace(/\./, "");
                tempDir.props = {
                    hasSubdirectories: false,
                    subdirectoriesLoaded: true,
                    showSubdirectories: false
                };
                tempDir.author = author;
                return tempDir;
            }).catch(e => {
                console.error(e);
            })
        }).catch(e => e);
    }

    /**
     * 更新文件
     * @param {string} dirname 
     * @param {ArrayBuffer} content 
     */
    api.updateFile = async function (dirname, content) {
        return await new Promise((resolve, reject) => {
            let ws = fs.createWriteStream(dirname, {
                flags: 'w+',
                encoding: 'blob',
                fd: null,
                mode: 0666,
                autoClose: true
            })
            ws.on('error', (err) => {
                reject(err);
            });
            ws.on('finish', () => {
                resolve(true);
            });
            ws.write(content);
            ws.end();
        }).catch(e => e)
    }

    api.deleteOssAllFile = function (data) {
        return new Promise((resolve) => {
            if (data.items.length) {
                let fileArr = [],
                    directories = [];
                for (let dir of data.items) {
                    if (dir.type === 'dir') {
                        directories.unshift(dir.path);
                    } else {
                        fileArr.unshift(dir.path);
                    }
                }
                this.getAllFilePath(directories, fileArr).then((arr) => {
                    if (arr === 'NoSuchKey') {
                        return resolve(false);
                    }
                    arr.forEach((item, index) => {
                        (async () => {
                            try {
                                await internalClient.delete(item);
                            } catch (error) {
                                return resolve(false);
                            }
                        })();
                        if (index === fileArr.length - 1) {
                            return resolve(true);
                        }
                    });
                });
            }
        }).catch(e => false);
    }

    /**
     * 递归遍历一个文件夹下所有要删除的文件
     * @param {*} directories 
     * @param {*} fileArr 
     * @returns 
     */
    api.getAllFilePath = async function (directories, fileArr, copyClient) {
        copyInternalClient = copyClient ? copyClient : internalClient;
        return await new Promise((resolve) => {
            (function getPath() {
                let popPath = "";
                if (directories.length) {
                    popPath = directories.pop();
                    popPath = popPath.lastIndexOf('/') === popPath.length - 1 ? popPath : popPath + '/';
                    fileArr.unshift(popPath);
                } else {
                    return resolve(fileArr);
                }
                copyInternalClient.get(popPath).then((result) => {
                    if (result.res.status == 200) {
                        copyInternalClient.list({
                            prefix: popPath,
                            delimiter: '/'
                        }).then((result) => {
                            (result.objects || []).forEach((item) => {
                                if (item.name.lastIndexOf('/') === item.name.length - 1) {
                                    return;
                                }
                                fileArr.unshift(item.name);
                            })
                            directories.unshift(...(result.prefixes || []));
                            return getPath(directories, fileArr);
                        })
                    }
                }).catch((e) => {
                    if (e.code == 'NoSuchKey') {
                        return resolve('NoSuchKey');
                    }
                })
            })();
        }).catch(e => e)
    }

    api.copyOssFolder = async function (destDir, sourceDir, author = "", fromOrign = "", copyClient) {
        console.log("destDir:", destDir, "sourceDir:", sourceDir,
            "fromOrign:", fromOrign);
        try {
            let result = await internalClient.put(destDir, Buffer.from(''), {
                headers: {
                    'x-oss-tagging': `author=${author}`,
                }
            }); //创建文件
            let copyInternalClient = null;
            if (result.res.status === 200) {
                copyInternalClient = fromOrign ? copyClient : internalClient;
                console.log("copyClient", copyInternalClient.options.bucket);
                let fileObj = await copyInternalClient.list({
                    prefix: sourceDir,
                    delimiter: '/' //用于获取文件的公共前缀。
                });
                // console.log("fileObj.objects", fileObj.objects, "fileObj.prefixes", fileObj.prefixes);
                if (!fileObj.objects && !fileObj.prefixes) {
                    return 'end';
                }
                (fileObj.objects || []).forEach(item => {
                    if (item.name.lastIndexOf('/') === item.name.length - 1) {
                        return;
                    }
                    let dirPath = `${destDir}${path.basename(item.name)}`;
                    internalClient.copy(dirPath, fromOrign + item.name, {
                        headers: {
                            'x-oss-tagging': `author=${author}`,
                            // 指定如何设置目标Object的对象标签。取值为Copy或Replace。其中Copy为默认值，表示复制源Object的对象标签到目标Object。Replace表示忽略源Object的对象标签，直接采用请求中指定的对象标签。
                            'x-oss-tagging-directive': 'Replace'
                        }
                    }).catch(error => {
                        return 'err';
                    });
                });
                (fileObj.prefixes || []).forEach((item, index) => {
                    let dirPath = `${destDir}${path.basename(item)}/`;
                    (async () => {
                        try {
                            await this.copyOssFolder(dirPath, item, author, fromOrign, copyClient);
                            if (fileObj.prefixes.length - 1 === index) {
                                return 'end';
                            }
                        } catch (error) {
                            return 'err';
                        }
                    })();
                });
            }
        } catch (e) {
            console.log(e);
            return 'err';
        }
    }

    /**
     * 返回选择的盘符
     */
    api.drive = function (disk) {
        return defaultConfig.get('diskList')[0];
    }
    return api;
}