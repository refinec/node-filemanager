# node-filemanager

## Introduction

这是基于Aliyun OSS对象存储的Node.js网盘管理服务器

前端使用Vue.js、ElementUI：https://github.com/refinec/vue-filemanager

## Installation

```
npm install node-filemanager --save
```

## Usage

使用Node.js的express框架

```javascript
const express = require("express");
const app = express();
const larfOss = require("./node-filemanager");

const ossOptions = {
    accesskey: '', //通过阿里云控制台创建的AccessKey
    accessSecret: '', //通过阿里云控制台创建的AccessSecret
    bucket: [], //通过控制台或PutBucket创建的bucket
    region: '', //bucket所在的区域， 如oss-cn-hangzhou。
    internal: false, //是否使用阿里云内网访问，默认false。比如通过ECS访问OSS，则设置为true，采用internal的endpoint可节约费用。
    cname: false, //是否支持上传自定义域名，默认false。如果cname为true，endpoint传入自定义域名时，自定义域名需要先同bucket进行绑定。
    secure: true, //(secure: true)则使用HTTPS，(secure: false)则使用HTTP
    endpoint: '', //OSS外网域名
    internalEndpoint: '' //OSS内网域名，可省略则默认为OSS外网域名
}

app.use('/', larfOss(ossOptions));
app.listen(process.env.PORT || 3000, () => {
    console.log("http://localhost:3000");
});
```

