const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// トップページ（URL入力フォーム）
app.get('/', (req, res) => {
    res.render('index', { url: req.query.url || '', videoInfo: null, error: null });
});

// yt-dlpを実行して情報を取得
app.get('/info', (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.render('index', { url: '', videoInfo: null, error: '動画のURLを指定してください。' });
    }

    const options = [
        url,
        '--dump-json' // JSON形式でメタデータを出力
    ];

    // yt-dlpのパスを明示的に指定
    const ytdlp = spawn('/tmp/yt-dlp', options);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp exited with code ${code}`);
            return res.render('index', { url: url, videoInfo: null, error: `yt-dlpの実行に失敗しました。エラー: ${stderr}` });
        }

        try {
            const videoInfo = JSON.parse(stdout);
            res.render('index', { url: url, videoInfo: videoInfo, error: null });
        } catch (e) {
            console.error('JSONパースエラー:', e);
            res.render('index', { url: url, videoInfo: null, error: '動画情報の解析に失敗しました。' });
        }
    });

    ytdlp.on('error', (err) => {
        console.error('yt-dlp failed to start:', err);
        res.render('index', { url: url, videoInfo: null, error: 'yt-dlpの実行に失敗しました。' });
    });
});

app.listen(port, () => {
    console.log(`サーバーがポート ${port} で起動しました。`);
});
