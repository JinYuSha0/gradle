const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')()
const fs = require('fs')
const path = require('path')
const querystring = require('querystring')
const xlsx = require('node-xlsx')
const Pug = require('koa-pug')

const pug = new Pug({
    viewPath: path.resolve(__dirname, './views'),
    app: app // Binding `ctx.render()`, equals to pug.use(app)
})

const homeContent = fs.readFileSync(path.join(__dirname, './index.html'));
const errorContent = fs.readFileSync(path.join(__dirname, './error.html'));
const excelPath = fs.readFileSync(path.join(__dirname, './data.xlsx'));

const data = xlsx.parse(excelPath)[0].data;
const transData = new Map
const label = data[0]
data.forEach((item, index) => {
    if (index > 0) {
        const data = label.reduce(function (a, b, index) {
            a[b] = item[index]
            return a
        }, {})
        transData.set(`${item[0]}:${item[1]}`, data)
    }
})

function getFormData(ctx) {
    // 获取数据 异步
    return new Promise(function (resolve, reject) {
        try {
            let str = '';
            ctx.req.on('data', function (chunk) {
                str += chunk;
            })

            ctx.req.on('end', function (chunk) {
                resolve(str)
            })
        } catch (err) {
            reject(err);
        }
    })
}

router.post('/grade', async (ctx, next) => {
    try {
        const data = await getFormData(ctx)
        const { username, phone } = querystring.parse(data)
        const key = `${username}:${phone}`
        if (transData.has(key)) {
            await ctx.render('index', {
                label: Object.keys(transData.get(key)),
                value: Object.values(transData.get(key))
            }, true)
        } else {
            throw new Error()
        }
    } catch (err) {
        ctx.type = "html";
        ctx.body = errorContent
    }
})

router.get('/', async (ctx, next) => {
    ctx.type = "html";
    ctx.body = homeContent;
})

app.use(router.routes());

app.listen(3000, () => {
    console.log('listen on port 3000')
});