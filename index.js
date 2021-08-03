const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')()
const fs = require('fs')
const path = require('path')
const querystring = require('querystring')
const xlsx = require('node-xlsx')
const Pug = require('koa-pug')
const mime = require('mime-types')
const KoaStatic = require('koa-static')
const koaBody = require('koa-body')({multipart: true, uploadDir: './uploads'})

const pug = new Pug({
    viewPath: path.resolve(__dirname, './views'),
    app: app // Binding `ctx.render()`, equals to pug.use(app)
})

const homeContent = fs.readFileSync(path.join(__dirname, './index.html'));
const errorContent = fs.readFileSync(path.join(__dirname, './error.html'));
const uploadCpntent = fs.readFileSync(path.join(__dirname, './upload.html'));
const excelPath = fs.readFileSync(path.join(__dirname, './uploads/data.xlsx'));

let transData = null

function parseExcel(excelPath) {
    try {
        const newTransData = new Map
        const data = xlsx.parse(excelPath)[0].data;
        const label = data[0]
        data.forEach((item, index) => {
            if (index > 0) {
                const data = label.reduce(function (a, b, index) {
                    a[b] = item[index]
                    return a
                }, {})
                newTransData.set(`${item[0]}:${item[1]}`, data)
            }
        })
        return newTransData
    } catch(err) {
        throw err
    }
}

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
        if (transData === null) transData = parseExcel(excelPath)
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

router.post('/uploadFile', koaBody, async (ctx, next) => {
    try {
        const { pwd } = ctx.request.body
        if (pwd === 'rHGtBJL6irdD') {
            const {path: _path, name, type} = ctx.request.files.excel
            const fileExtension = mime.extension(type)
            if (/xlsx/.test(fileExtension)) {
                const reader = fs.createReadStream(_path)
                let filePath = path.join(__dirname, './uploads') + `/${name.replace(fileExtension, `${+new Date()}.${fileExtension}`)}`;
                const upStream = fs.createWriteStream(filePath);
                reader.pipe(upStream).on('finish', () => {
                    transData = parseExcel(filePath)
                });
                await ctx.render('result', {
                    success: true
                }, true)
            } else {
                throw new Error('真的离谱，上传文件格式错误')
            }
        } else {
            throw new Error('你踏马密码错误')
        }
    } catch (err) {
        await ctx.render('result', {
            success: false,
            reason: err.message
        }, true)
    }
})

router.get('/', async (ctx, next) => {
    ctx.type = "html";
    ctx.body = homeContent;
})

router.get('/upload', async (ctx, next) => {
    ctx.type = "html";
    ctx.body = uploadCpntent;
})

app.use(KoaStatic(path.join(__dirname, './images')));

app.use(router.routes());

app.listen(3000, () => {
    console.log('listen on port 3000')
});