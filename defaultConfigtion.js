const defaultConfigObj = {
    /**
     * 路由前缀
     */
    'routePrefix': '/',

    /**
     * 要使用的磁盘列表(从文件系统中选择)
     */
    'diskList': ["", ""],
    /**
     * 默认选择的磁盘。为 null则自动选择 diskList列表中的第一个
     *
     */
    'leftDisk': null,

    'rightDisk': null,

    /**
     * 磁盘的路径，为 null 则是根路径
     */
    'leftPath': null,

    'rightPath': null,

    /**
     * 图片缓存
     * 设置 null 或 0 则表示不需要缓存
     * 设置 number类型的值则为要缓存的分钟数
     */
    // 'cache': null,

    /**
     * 文件管理 要显示的窗口
     * 1 - 仅一个文件管理窗口
     * 2 - 一个文件管理窗口和目录树
     * 3 - 二个文件管理窗口
     */
    // 'windowsConfig' : 2,

    /**
     * 上传的文件大小限制，为 null 则不限制
     */
    // 'maxUploadFileSize': null,

    /**
     * 允许上传的文件类型，为 [] 则不限制
     */
    //'allowFileTypes': [],

    /**
     * 文件的显示/隐藏
     */
    // 'hiddenFiles' : true,

    /*
     * 中间件 ['web', 'auth', 'admin']
     * 限制非管理员用户的访问
     */
    //'middleware': ['web'],

    /*
     * ACL 访问控制
     */
    'acl': true,

    /**
     * 如果用户没有权限则隐藏文件
     * ACL access level = 0
     */
    //'aclHideFromFM': true,

    /**
     * ACL 策略
     *
     * blacklist - 黑名单 允许读 / 写
     *  
     * whitelist - 白名单 禁止读 / 写
     */
    //'aclStrategy': 'blacklist',

    /**
     * ACL 规则缓存
     *
     * null 或者 number类型值的缓存分钟数
     */
    //'aclRulesCache': null,

    /***************************************************************************
     * ACL rules list - used for default ACL repository (ConfigACLRepository)
     *
     * 1 it's user ID
     * null - for not authenticated user
     *
     * 'disk' : 'disk-name'
     *
     * 'path' : 'folder-name'
     * 'path' : 'folder1*' - select folder1, folder12, folder1/sub-folder, ...
     * 'path' : 'folder2/*' - select folder2/sub-folder,... but not select folder2 !!!
     * 'path' : 'folder-name/file-name.jpg'
     * 'path' : 'folder-name/*.jpg'
     *
     * * - wildcard通配符
     *
     * access: 0 - deny, 1 - read, 2 - read/write
     */
    'aclRules': [
        [
            //['disk' : 'public', 'path' : '/', 'access' : 2],
        ],
        [
            //['disk' : 'public', 'path' : 'images/arch*.jpg', 'access' : 2],
            //['disk' : 'public', 'path' : 'files/*', 'access' : 1],
        ],
    ],
}

const defaultConfig = new Map(Object.entries(defaultConfigObj));

module.exports = defaultConfig;