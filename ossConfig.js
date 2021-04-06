const OSS = require('ali-oss');

module.exports = function ({
    accesskey = '',
    accessSecret = '',
    bucket = [],
    region = '',
    internal = false,
    cname = false,
    secure = false,
    endpoint = '',
    internalEndpoint = endpoint
}) {


    const client = OSS({
        accessKeyId: accesskey,
        accessKeySecret: accessSecret,
        bucket: bucket[0],
        endpoint,
        region,
        internal,
        cname,
        secure,
    });

    client.putBucketCORS(bucket[0], [{
        allowedOrigin: '*',
        allowedMethod: [
            'GET',
            'HEAD',
            'POST',
            'PUT',
            'DELETE'
        ],
        allowedHeader: '*'
    }]).then(() => {});

    const internalClient = OSS({
        accessKeyId: accesskey,
        accessKeySecret: accessSecret,
        bucket: bucket[0],
        endpoint: internalEndpoint,
        region,
        internal,
        cname,
        secure,
    });

    internalClient.putBucketCORS(bucket[0], [{
        allowedOrigin: '*',
        allowedMethod: [
            'GET',
            'HEAD',
            'POST',
            'PUT',
            'DELETE'
        ],
        allowedHeader: '*'
    }]).then(() => {});

    const ClientMap = new Map([
        ["client", client],
        ["internalClient", internalClient]
    ])
    if (bucket[1]) {
        const clientTwo = OSS({
            accessKeyId: accesskey,
            accessKeySecret: accessSecret,
            bucket: bucket[1],
            endpoint,
            region,
            internal,
            cname,
            secure,
        });

        clientTwo.putBucketCORS(bucket[1], [{
            allowedOrigin: '*',
            allowedMethod: [
                'GET',
                'HEAD',
                'POST',
                'PUT',
                'DELETE'
            ],
            allowedHeader: '*'
        }]).then(() => {});

        const internalClientTwo = OSS({
            accessKeyId: accesskey,
            accessKeySecret: accessSecret,
            bucket: bucket[1],
            endpoint: internalEndpoint,
            region,
            internal,
            cname,
            secure,
        });

        internalClientTwo.putBucketCORS(bucket[1], [{
            allowedOrigin: '*',
            allowedMethod: [
                'GET',
                'HEAD',
                'POST',
                'PUT',
                'DELETE'
            ],
            allowedHeader: '*'
        }]).then(() => {});

        ClientMap.set("clientTwo", clientTwo);
        ClientMap.set("internalClientTwo", internalClientTwo);
    }



    // 创建存储空间
    const option = {
        storageClass: 'Standard', // 存储空间的默认存储类型为标准存储，即Standard。如果需要设置存储空间的存储类型为归档存储，请替换为Archive。
        acl: 'private', // 存储空间的默认读写权限为私有，即private。如果需要设置存储空间的读写权限为公共读，请替换为public-read。
        dataRedundancyType: 'LRS' // 存储空间的默认数据容灾类型为本地冗余存储，即LRS。如果需要设置数据容灾类型为同城冗余存储，请替换为ZRS。
    }
    return {
        ClientMap,
        option
    }

}