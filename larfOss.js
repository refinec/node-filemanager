const express = require("express");
const router = express.Router();
const cors = require('cors');
const path = require('path');
const fs = require("fs-extra");
const mime = require('mime-types');
const compress = require('compression');
const session = require("express-session");
const history = require('connect-history-api-fallback');
const md5 = require('blueimp-md5')
const MongoStore = require('connect-mongo'); // connect-mongo会在该 Client下创建一个sessions的数据表
const {
    Client
} = require('./connectDB');
const MongoStoreInstance = MongoStore.create({
    client: Client,
    autoRemove: 'native', // 自动清理过期的会话（在一个非常并发的环境中时避免使用）
    touchAfter: 24 * 3600, // 不希望每次用户刷新页面时都重新保存数据库中的所有会话,延迟1天
    crypto: { //加密会话
        secret: 'squirrel'
    }
});

const {
    IncomingForm
} = require('formidable');

const config = {};
const defaultConfig = require('./defaultConfigtion');
const ossConfig = require('./ossConfig');
const fileManager = require('./fileManager');
const CRUD = require('./CRUD');
module.exports = function (options) {
    Object.assign(config, options);

    const {
        ClientMap,
        option
    } = ossConfig(config);
    let copyMap = null;
    let api = null;
    let client = null,
        internalClient = null;
    client = ClientMap.get("client");
    internalClient = ClientMap.get("internalClient");
    //添加这个就解决了
    router.use(cors({
        origin: 'http://localhost:8080', //指定接受的地址
        // origin: '*', //指定接受的地址
        methods: ['GET', 'POST'], //指定接受的请求类型
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'] //指定header
    }))
    router.all('*', function (req, res, next) {
        res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization ,Accept ,X-Requested-With, yourHeaderFeild');
        // res.header('Access-Control-Allow-Headers', 'X-Requested-With');
        res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
        res.header("X-Powered-By", ' 3.2.1')
        // res.header("Content-Type", "application/json;charset=utf-8");
        if (req.method == 'OPTIONS') {
            res.send(200); //让OPTIONS请求快速返回
        } else {
            next();
        }
    });

    router.use(['/initialize', '/tree', '/content'], function (req, res, next) {
        let {
            ClientMap
        } = require('./ossConfig')(config);
        copyMap = ClientMap;

        if (req.query.disk == "private") {
            client = ClientMap.get("clientTwo");
            internalClient = ClientMap.get("internalClientTwo");
        } else {
            client = ClientMap.get("client");
            internalClient = ClientMap.get("internalClient");
        }

        api = fileManager(internalClient)
        next();
    });
    router.use(compress());
    // router.use(history({
    //     verbose: true,
    // rewrites: [{
    //     from: /\/login|\/register/g,
    //     to: function (context) {
    //         console.log("context.parsedUrl.pathname", context.parsedUrl.pathname);
    //         return context.parsedUrl.pathname;
    //     }
    // }]
    // }));
    router.use(session({
        secret: 'hallelujah',
        resave: true,
        saveUninitialized: true, //无论是否使用session，都默认直接分配一把钥匙
        cookie: {
            maxAge: 60 * 60 * 24 * 7 //过期时间
        },
        store: MongoStoreInstance // 使用mongodb数据库存储session
    }))
    router.get('/', (req, res) => {
        res.status(200)
        res.send();
    })
    // 部署到服务器上时，解决前端 history模式的路由问题，返回前端打包好的index.html
    router.get('/file', (req, res) => {
        res.sendFile(path.join(__dirname, "../index.html"))
    })
    router.get('/me', function (req, res) {
        if (req.session.isLogin) {
            res.send({
                result: {
                    status: 'success'
                },
                isLogin: true,
                name: req.session.user,
                nickname: req.session.nickname
            })
        } else {
            res.send({
                result: {
                    status: 'success'
                },
                isLogin: false,
                name: req.session.user,
                nickname: req.session.nickname
            })
        }
    })
    // 部署到服务器上时，解决前端 history模式的路由问题，返回前端打包好的index.html
    router.get('/login', function (req, res) {
        res.sendFile(path.join(__dirname, "../index.html"))
    })
    router.post('/login', function (req, res) {
        req.on('data', (chunk) => {
            try {
                let data = "";
                data += chunk;
                data = JSON.parse(data);
                CRUD.findUser({
                    username: data.username
                }, 1).then(result => {
                    if (result) {
                        const pwd = md5(md5(data.pwd), 'refine');
                        if (result.username === data.username && result.pwd === pwd) {
                            config.bucket.splice(1, 1, result.disk);
                            req.session.isLogin = true;
                            req.session.user = result.username; // 设置session
                            req.session.nickname = result.nickname;
                            res.send({
                                result: {
                                    status: "success",
                                    message: "logined"
                                },
                                isLogin: true,
                                nickname: req.session.nickname
                            })
                        } else {
                            res.send({
                                result: {
                                    status: "danger",
                                    message: "passwordError"
                                }
                            })
                        }
                        return;
                    }
                    res.send({
                        result: {
                            status: "danger",
                            message: "userNotExist"
                        }
                    })
                })
            } catch (error) {
                consle.error(error)
            }

        });

    })
    router.get('/logout', function (req, res) {
        //req.session.cookie.maxAge=0;  /*改变cookie的过期时间*/
        // req.session.destroy(function (err) {
        //     console.log("session销毁失败:", err);
        // })
        req.session.user = null;
        req.session.isLogin = false;
        req.session.nickname = null;
        res.send({
            result: {
                status: "success",
                message: "logouted"
            }
        })
        // res.redirect('/login');
    })
    router.get('/validate-name', function (req, res) {
        CRUD.findUser({
            username: req.query.name
        }, 0).then(result => {
            if (result) {
                res.send({
                    isExist: true
                })
            } else {
                res.send({
                    isExist: false
                })
            }
        })
    })
    // 部署到服务器上时，解决前端 history模式的路由问题，返回前端打包好的index.html
    router.get('/register', function (req, res) {
        res.sendFile(path.join(__dirname, "../index.html"))
    })
    router.post('/register', (req, res) => {
        req.on('data', (chunk) => {
            try {
                let data = "";
                data += chunk;
                data = JSON.parse(data);
                if (data.pwd && data.account) {
                    // 填写Bucket名称。
                    client.putBucket(`525-oco-${data.account}`, option).then(result => {
                        if (result.res.status == 200 && result.bucket) {
                            const pwd = md5(md5(data.pwd), 'refine');
                            const info = {
                                nickname: data.nickName,
                                username: data.account,
                                pwd: pwd,
                                disk: result.bucket
                            }
                            CRUD.insertUserInfo(info).then(result => {
                                if (result && result.insertedCount == 1) {
                                    res.send({
                                        result: {
                                            status: "success",
                                            message: "registered"
                                        }
                                    })
                                }
                            })
                        }

                    }).catch(error => {
                        console.error(error);
                        res.send({
                            result: {
                                status: "danger",
                                message: "registerErrorforName"
                            }
                        })
                    })
                } else {
                    res.send({
                        result: {
                            status: "danger",
                            message: "registerError"
                        }
                    })
                }

            } catch (error) {
                res.send({
                    result: {
                        status: "danger",
                        message: "registerError"
                    }
                })
            }
        })
    })

    router.get('/initialize', (req, res) => {
        res.type('json');
        res.send(api.initialize());
    })

    router.get('/tree', (req, res) => {

        res.type('json');
        api.showDirectories(req.query.disk, req.query.path).then((data) => {
            res.send(data);
        });
    })

    router.get('/content', (req, res) => {
        api.content(req.query.disk, req.query.path)
            .then((data) => {
                res.send(data);
            })
    })

    router.get('/select-disk', (req, res) => {
        const hasDisk = defaultConfig.get('diskList').some((item) => {
            return item === api.drive(req.query.disk)
        })
        if (hasDisk) {
            return res.send({
                result: {
                    status: 'success'
                }
            })
        }
        res.send({
            result: {
                status: 'danger'
            }
        })
    });
    router.get('/download-file', (req, res) => {
        if (path.extname(path.basename(req.query.path)) === '.txt') {
            (async () => {
                try {
                    let result = await internalClient.getStream(req.query.path);
                    result.stream.pipe(res);
                } catch (e) {
                    console.error(e);
                }
            })();
        } else {
            (async () => {
                try {
                    let url = await client.signatureUrl(req.query.path, {
                        expires: 32400
                    });
                    res.setHeader("Content-Disposition", 'attachment');
                    res.send(url);
                } catch (error) {
                    console.error(error);
                }
            })();
        }
    })
    router.get("/download", (req, res) => {
        (async () => {
            try {
                let result = await internalClient.getStream(req.query.path);
                result.stream.pipe(res);
            } catch (e) {
                console.error(e);
            }
        })();
    });
    router.post('/zip', (req, res) => {
        res.send({
            result: {
                status: 'success',
                message: '该功能暂未开放,敬请期待!'
            }
        })
    })
    router.post('/unzip', (req, res) => {
        res.send({
            result: {
                status: 'success',
                message: '该功能暂未开放,敬请期待!'
            }
        })
    })
    router.post('/update-file', (req, res) => {
        const form = new IncomingForm({
            uploadDir: './tempfile',
            keepExtensions: true,
            maxFileSize: 512 * 1024 * 1024,
            maxFields: 0, // default 1000,set 0 for unlimited
            maxFieldsSize: 20 * 1024 * 1024, //default
            hash: false, //default
        });
        form.on('error', (err) => {
            res.send({
                result: {
                    status: "danger",
                    message: 'updateError'
                }
            })
        });
        form.parse(req, (err, fields, files) => {
            if (err) console.error(err);
            (async () => {
                try {
                    let stream = fs.createReadStream(files.file.path);
                    let size = fs.statSync(files.file.path).size;
                    let result = await internalClient.putStream(
                        fields.path, stream, {
                            contentLength: size
                        });
                    if (result.res.status === 200) {
                        api.updateOssFileProperty(fields.disk, fields.path).then((prop) => {
                            res.send({
                                result: {
                                    status: 'success',
                                    message: 'updated'
                                },
                                file: prop
                            })
                        })
                    } else {
                        res.send({
                            result: {
                                status: 'danger',
                                message: 'updateFail'
                            }
                        })
                    }
                } catch (e) {
                    res.send({
                        result: {
                            status: 'danger',
                            message: 'updateFail'
                        }
                    })
                }
                //更新完之后删除文件
                try {
                    fs.unlink(files.file.path, (err) => {
                        if (err) console.error(err);
                    })
                } catch (error) {
                    console.error(error);
                }
            })();
        })
    })

    router.get("/thumbnails-link", (req, res) => {
        (async () => {
            try {
                let url = await client.signatureUrl(req.query.path, {
                    expires: 32400
                });
                res.setHeader('content-type', mime.lookup(req.query.path));
                res.send(url);
            } catch (error) {
                console.error(error);
            }
        })();
    })
    router.get("/preview", (req, res) => {
        (async () => {
            let result = await internalClient.getStream(req.query.path);
            res.setHeader('content-type', mime.lookup(req.query.path));
            result.stream.pipe(res);
        })();
    });
    router.get('/stream-file', (req, res) => {
        (async () => {
            let url = await client.signatureUrl(req.query.path, {
                expires: 32400
            });
            res.setHeader('content-type', mime.lookup(req.query.path));
            res.setHeader('Accept-Ranges', 'bytes');
            res.send(url);
        })();
    })
    router.get('/url', (req, res) => {
        (async () => {
            let url = await client.signatureUrl(req.query.path, {
                expires: 32400
            });
            res.send({
                result: {
                    status: "success",
                    message: ""
                },
                url
            })
        })();
    })
    router.post('/create-file', (req, res) => {
        /**
         * 注册data事件接收数据
         * @param {string} chunk默认是一个二进制数据和data拼接会自动toString
         */
        req.on('data', (chunk) => {
            let data = "";
            let currentFile = "";
            data += chunk;
            data = JSON.parse(data);
            const reg = new RegExp('[\\\\/:*?"<>|]');
            if (reg.test(data.name.toString())) {
                return res.send({
                    result: {
                        'status': 'danger',
                        'message': "IllegalCharacter"
                    }
                });
            }
            if (data.name.toString().indexOf(".") === -1) {
                return res.send({
                    result: {
                        'status': 'danger',
                        'message': "extensionNotExist"
                    }
                });
            }
            currentFile = data.path ? `${data.path}/${data.name}` : `${data.name}`;
            api.createOssFile(data.disk, currentFile).then(result => {
                if (result === 'createErr') {
                    res.send({
                        result: {
                            'status': 'danger',
                            'message': "fileCreateFail"
                        }
                    });
                } else if (result === 'exist') {
                    res.send({
                        result: {
                            'status': 'danger',
                            'message': "fileExist"
                        }
                    });
                } else {
                    res.send({
                        result: {
                            'status': 'success',
                            'message': "fileCreated"
                        },
                        file: result
                    })

                }
            })
        })
    });
    router.post("/create-directory", (req, res) => {
        req.on('data', (chunk) => {
            let data = "";
            data += chunk;
            data = JSON.parse(data);
            let currentFile = "";
            currentFile = data.path ? `${data.path}/${data.name}/` : `${data.name}/`;
            const reg = new RegExp('[\\\\/:*?"<>|]');
            if (reg.test(data.name.toString())) {
                return res.send({
                    result: {
                        'status': 'danger',
                        'message': "IllegalCharacter"
                    }
                });
            }
            api.createOssDirectory(data.disk, currentFile).then((result) => {
                if (result === 'createErr') {
                    res.send({
                        result: {
                            'status': 'danger',
                            'message': "dirCreateFail"
                        }
                    });
                } else if (result === 'exist') {
                    res.send({
                        result: {
                            'status': 'danger',
                            'message': "dirExist"
                        }
                    });
                } else {
                    res.send({
                        result: {
                            'status': 'success',
                            'message': "dirCreated"
                        },
                        directory: result,
                        tree: [result]
                    })
                }
            });
        })
    });

    /**
     * 删除文件
     */
    router.post("/delete", (req, res) => {
        req.on("data", function (chunk) {
            let data = "";
            data += chunk;
            data = JSON.parse(data);
            api.deleteOssAllFile(data).then((isTrue) => {
                if (isTrue) {
                    res.status(200);
                    res.send({
                        result: {
                            'status': 'success',
                            'message': "deleted"
                        }
                    });
                } else {
                    res.status(200);
                    res.send({
                        result: {
                            'status': 'danger',
                            'message': "deleteFail"
                        }
                    });
                }
            })
        })
    });

    /**
     * 复制粘贴
     */
    router.post('/paste', (req, res) => {
        req.on("data", (chunk) => {
            let data = "";
            data += chunk;
            data = JSON.parse(data);
            const isCut = data.clipboard.type === "cut";
            const promiseArr = [];
            let toPath = data.path ? data.path + '/' : '';

            let fromOrign = "";
            let copyClient = null;
            if (data.disk == data.clipboard.disk) {
                fromOrign = "";
            } else {
                if (data.clipboard.disk == "public") {
                    fromOrign = `/${config.bucket[0]}/`;
                    copyClient = copyMap.get("internalClient");
                } else {
                    fromOrign = `/${config.bucket[1]}/`;
                    copyClient = copyMap.get("internalClientTwo");
                }
            }
            data.clipboard.directories.forEach(sourceDir => {
                let destDir = toPath + path.basename(sourceDir) + '/';
                (async () => {
                    try {
                        let message = await api.copyOssFolder(destDir, sourceDir + '/', fromOrign, copyClient);
                        message === 'err' ? promiseArr.push(Promise.resolve(false)) : promiseArr.push(Promise.resolve(true));
                    } catch (error) {
                        console.error(error);
                    }
                })();
            })
            data.clipboard.files.forEach(sourceDir => {
                let destDir = toPath + path.basename(sourceDir);
                promiseArr.push(internalClient.copy(destDir, fromOrign + sourceDir));
            })
            Promise.all(promiseArr).then((isTrue) => {
                if (isTrue) {
                    res.status(200);
                    res.send({
                        result: {
                            status: "success",
                            message: isCut ? "cuted" : "copied"
                        }
                    });
                    if (isCut) {
                        api.getAllFilePath(data.clipboard.directories, data.clipboard.files, copyClient).then((arr) => {
                            if (arr === 'NoSuchKey') {
                                console.error('NoSuchKey');
                                return;
                            }
                            copyInternalClient = copyClient ? copyClient : internalClient;
                            arr.forEach((item) => {
                                (async () => {
                                    try {
                                        await copyInternalClient.delete(item);
                                    } catch (error) {
                                        console.error(error);
                                    }
                                })();
                            });
                        });
                    }
                } else {
                    res.status(200);
                    res.send({
                        result: {
                            status: "danger",
                            message: isCut ? "cuteFail" : "copyFail"
                        }
                    })
                }
            }).catch(e => {
                res.status(200);
                res.send({
                    result: {
                        status: "danger",
                        message: isCut ? "cuteFail" : "copyFail"
                    }
                })
            })
        });
    });
    router.post("/rename", (req, res) => {
        req.on("data", (chunk) => {
            let data = "";
            data += chunk;
            data = JSON.parse(data);
            const fileName = path.basename(data.newName);
            const reg = new RegExp('[\\\\/:*?"<>|]');
            const isValiate = reg.test(fileName);
            if (!isValiate) {
                let isFile = path.basename(data.oldName).indexOf('.') !== -1;
                if (isFile && path.basename(fileName).indexOf(".") === -1) {
                    return res.send({
                        result: {
                            status: "danger",
                            message: "renameFailExt"
                        }
                    })
                }
                let Slash = isFile ? '' : '/';
                let newName = data.oldName.split('/');
                newName.pop();
                newName = newName.join('/') + '/' + fileName;
                if (isFile) {
                    (async () => {
                        try {
                            let info = await internalClient.copy(newName, data.oldName);
                            if (info.res.status === 200) {
                                let result = await internalClient.delete(data.oldName);
                                if (result.res.status === 200) {
                                    return res.send({
                                        result: {
                                            status: "success",
                                            message: "renamed"
                                        }
                                    })
                                }
                                return res.send({
                                    result: {
                                        status: "danger",
                                        mesage: "renameFail"
                                    }
                                })
                            }
                        } catch (error) {
                            return res.send({
                                result: {
                                    status: "danger",
                                    mesage: "renameFail"
                                }
                            })
                        }
                    })();
                } else {
                    try {
                        api.copyOssFolder(`${newName}${Slash}`, `${data.oldName}${Slash}`).then(message => {
                            if (message === 'err') {
                                return res.send({
                                    result: {
                                        status: "danger",
                                        mesage: "renameFail"
                                    }
                                })
                            }
                            api.getAllFilePath([`${data.oldName}${Slash}`], []).then((arr) => {
                                if (arr === 'NoSuchKey') {
                                    return res.send({
                                        result: {
                                            status: "danger",
                                            message: "deleteFail"
                                        }
                                    })
                                }
                                arr.forEach((item, index) => {
                                    (async () => {
                                        try {
                                            await internalClient.delete(item);
                                        } catch (error) {
                                            console.error(error);
                                        }
                                        if (arr.length - 1 == index) {
                                            res.send({
                                                result: {
                                                    status: "success",
                                                    message: "renamed"
                                                }
                                            })
                                        }
                                    })();
                                });
                            });
                        });
                    } catch (error) {
                        return res.send({
                            result: {
                                status: "danger",
                                mesage: "renameFail"
                            }
                        })
                    }
                }
            } else {
                return res.send({
                    result: {
                        status: "danger",
                        message: "IllegalCharacter"
                    }
                })
            }
        })
    });

    router.post("/upload", (req, res) => {
        let savePath = ""; //当前要存储文件的地址
        let overwrite = 0; //文件是否覆盖，0 为否,1 为覆盖
        const fromPath = []; //临时文件地址
        const fileName = []; //上传的文件名
        const form = new IncomingForm({
            multiples: true,
            encoding: 'utf-8',
            uploadDir: './tempfile',
            keepExtensions: true,
            maxFileSize: 1 * 1024 * 1024 * 1024, //512MB
            maxFields: 20, // default 1000,set 0 for unlimited
            maxFieldsSize: 20 * 1024 * 1024, //default
            hash: false, //default
        });
        form.on('error', (err) => {
            console.error(err);
            res.send({
                result: {
                    status: "danger",
                    message: "uploadError"
                }
            })
        });

        form.parse(req, (err, fields, files) => {
            let file = JSON.parse(JSON.stringify(files['files[]']));
            file = file instanceof Array ? file : [file];
            let ossFilePath = [];
            let renamePromiseArr = [];
            savePath = fields.path ? fields.path + '/' : '';
            overwrite = Number(fields.overwrite);
            for (let index in file) {
                fileName[index] = (file[index]).name;
                fromPath[index] = (file[index]).path;
            }
            if (err) {
                return;
            }
            if (overwrite) {
                try {
                    fileName.forEach((item, index) => {
                        renamePromiseArr.push(putStream(fromPath[index], `${savePath}${item}`, file[index].size));
                    })
                    Promise.all(renamePromiseArr).then(result => {
                        if (result) {
                            return res.send({
                                result: {
                                    status: "success",
                                    message: "upload"
                                }
                            })
                        }
                        return res.send({
                            result: {
                                status: "danger",
                                message: "uploadError"
                            }
                        })
                    }).catch(e => e)
                } catch (error) {
                    console.error(error);
                }
            }
            // 不覆盖源文件
            internalClient.list({
                prefix: savePath, //只列出符合特定前缀的文件
                delimiter: '/'
            }).then((filesList) => {
                if (filesList.objects[0].name === savePath) {
                    filesList.objects.shift();
                }

                //该目录下无文件
                if (!filesList.objects.length) {
                    try {
                        fileName.forEach((item, index) => {
                            renamePromiseArr.push(putStream(fromPath[index], `${savePath}${item}`, file[index].size));
                        })
                        Promise.all(renamePromiseArr).then(result => {
                            if (result) {
                                res.send({
                                    result: {
                                        status: "success",
                                        message: "upload"
                                    }
                                })
                            } else {
                                res.send({
                                    result: {
                                        status: "danger",
                                        message: "uploadError"
                                    }
                                })
                            }
                            deleteFiles(fromPath);
                        }).catch(e => e)
                    } catch (error) {
                        console.error(error);
                    }
                } else {
                    //该目录下有文件
                    try {
                        fileName.forEach((name, index) => {
                            let filePath = `${savePath}${name}`;
                            let suffixNum = 0,
                                flag = false;
                            ossFilePath.push(filePath);
                            (filesList.objects || []).forEach((item) => {
                                if (item.name.lastIndexOf('/') === item.name.length - 1) return;
                                let suffix = path.basename(item.name, path.extname(name));
                                //文件名和扩展名都相同
                                if (name.replace(/\.(?<=\.).*/g, "") === suffix.replace(/\(.*\)/, "") && path.extname(name) === path.extname(path.basename(item.name))) {
                                    if (!suffix.match(/\(.*\)/)) { //is null
                                        // suffixNum = 0;
                                        flag = true;
                                        return;
                                    }
                                    let numMatch = suffix.match(/\(.*\)/)[0].match(/\d+/);
                                    let num = suffix.match(/\(.*\)/) ? Number(numMatch ? numMatch[0] : 0) : 0;
                                    suffixNum = num > suffixNum ? num : suffixNum; //文件括号中的数值
                                    flag = true;
                                }
                            })
                            let suffixName = !flag ? name : name.replace(/(.*)(?=\.)/, `$1(${suffixNum+1})`);
                            renamePromiseArr.push(putStream(fromPath[index], `${savePath}${suffixName}`, file[index].size));
                        });
                    } catch (error) {
                        console.error(error);
                    }
                    Promise.all(renamePromiseArr).then(() => {
                        res.send({
                            result: {
                                status: "success",
                                message: "upload"
                            }
                        })
                        deleteFiles(fromPath);
                    }).catch(e => {
                        console.error("renameError:", e);
                        res.send({
                            result: {
                                status: "danger",
                                message: "uploadError"
                            }
                        });
                        deleteFiles(fromPath);
                    })
                }
            }).catch(e => {
                res.send({
                    result: {
                        status: "danger",
                        message: "uploadPathError"
                    }
                });
                deleteFiles(fromPath);
            });

            function deleteFiles(fileArr) {
                fileArr.forEach(filepath => {
                    fs.unlink(filepath, function (err) {
                        if (err) {
                            console.error(err);
                        }
                    })
                })
            }

            async function putStream(localfile, ossfile, size) {
                try {
                    let stream = fs.createReadStream(localfile);
                    let result = await internalClient.putStream(
                        ossfile, stream, {
                            contentLength: size
                        });
                    if (result.res.status === 200) {
                        return true;
                    }
                } catch (err) {
                    return false;
                }
            }
        });
    })

    return router;
};