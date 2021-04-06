const {
    Client
} = require('./connectDB');

module.exports = {
    /**
     * 插入一条用户记录
     * @param {*} c 文档(数据表) 
     * @param {*} param1 
     * @returns 
     */
    insertUserInfo: async function ({
        nickname,
        username,
        pwd,
        disk
    } = {}) {
        try {
            const result = await Client.db("filemanager").collection("user").insertOne({
                nickname,
                username,
                pwd,
                disk
            })
            return result;
        } catch (error) {
            throw error;
        }
    },

    /**
     * 查找用户信息
     * @param {*} c 文档(数据表) 
     * @param {*} param1 
     * @param {Number} isOrNO 
     * @returns 
     */
    findUser: async function ({
        username
    }, isOrNO = 1) {
        try {
            const options = {
                projection: isOrNO ? { //投影
                    _id: 0,
                } : {
                    _id: 0,
                    username: 1,
                    nickname: 1
                }
            }
            const result = await Client.db("filemanager").collection("user").findOne({
                username
            }, options);
            return await result;
        } catch (error) {
            console.error(error);
        }
    }
}