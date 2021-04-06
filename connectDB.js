const MongoClient = require('mongodb').MongoClient;
const urlOfDB = "mongodb://127.0.0.1:27017/filemanager";
const dbName = "filemanager";
const Client = new MongoClient(urlOfDB, {
    useUnifiedTopology: true
}); // 创建mongodb客户端

async function connect() {
    try {
        await Client.connect();
        // await Client.db(dbName);
        // const DB = await Client.db("filemanager");
        // return await DB;
    } catch (error) {
        await Client.close();
        console.error("数据库连接失败", error);
    }
}
const DB = connect();

/**
 * 连接数据库
 */
// Client.connect(error => {
//     if (error) {
//         throw error
//     }
//     console.log("连接成功");
// const DataBase = Client.db(dbName);
// Client.close();
// return DataBase;
/**
 * 在user表中查数据
 */
// const userCollection = DataBase.collection('user');
// userCollection.find({}).toArray((error, result) => {
//     if (error) {
//         console.error("查user表错误", error);
//     }
//     for (const r of result) {
//         console.log("查询结果：", r);
//     }
// })
// })

module.exports = {
    Client,
    DB
};